import { computeDiff } from './compute-diff';

/**
 * Pure-function tests for the field-level audit diff. No DB; runs under
 * `pnpm test:unit`. Covers each rule documented in compute-diff.ts so a
 * regression in any of the headline behaviours (secret stripping, array
 * matching, the 50-field cap, null short-circuit) shows up by name.
 */
describe('computeDiff', () => {
  it('returns null when before is null (treated as create)', () => {
    expect(computeDiff(null, { id: '1', name: 'a' })).toBeNull();
  });

  it('returns null when after is null (treated as delete)', () => {
    expect(computeDiff({ id: '1', name: 'a' }, null)).toBeNull();
  });

  it('returns null for non-object inputs', () => {
    expect(computeDiff('a', 'b')).toBeNull();
    expect(computeDiff(1, 2)).toBeNull();
  });

  it('reports only fields that actually changed', () => {
    const diff = computeDiff(
      { id: '1', name: 'Old', price: 100, status: 'draft' },
      { id: '1', name: 'New', price: 100, status: 'draft' },
    );
    expect(diff).toEqual([
      { field: 'name', before: 'Old', after: 'New' },
    ]);
  });

  it('strips secret-looking keys (password, secret, token, hash)', () => {
    const diff = computeDiff(
      { passwordHash: 'aaa', tokenHash: 'b', secret: 'c', name: 'old' },
      { passwordHash: 'bbb', tokenHash: 'd', secret: 'e', name: 'new' },
    );
    expect(diff).toEqual([
      { field: 'name', before: 'old', after: 'new' },
    ]);
  });

  it('caps changed fields at 50 to bound row size', () => {
    const before: Record<string, number> = {};
    const after: Record<string, number> = {};
    for (let i = 0; i < 100; i++) {
      before[`f${i}`] = i;
      after[`f${i}`] = i + 1;
    }
    const diff = computeDiff(before, after);
    expect(diff).not.toBeNull();
    expect(diff!.length).toBe(50);
  });

  it('arrays of scalars: reports added and removed sets', () => {
    const diff = computeDiff(
      { tags: ['a', 'b', 'c'] },
      { tags: ['a', 'c', 'd'] },
    );
    expect(diff).toEqual([
      { field: 'tags', added: ['d'], removed: ['b'] },
    ]);
  });

  it('arrays of objects with id: matched by id, not deep-compared', () => {
    const diff = computeDiff(
      {
        items: [
          { id: 1, value: 'a' },
          { id: 2, value: 'b' },
        ],
      },
      {
        items: [
          { id: 1, value: 'a' }, // unchanged by id
          { id: 3, value: 'c' }, // new id
        ],
      },
    );
    // {id:2,value:'b'} removed; {id:3,value:'c'} added; {id:1} considered
    // unchanged because id matches even if downstream fields would differ.
    expect(diff).toHaveLength(1);
    const change = diff![0] as { field: string; added: unknown[]; removed: unknown[] };
    expect(change.field).toBe('items');
    expect(change.added).toEqual([{ id: 3, value: 'c' }]);
    expect(change.removed).toEqual([{ id: 2, value: 'b' }]);
  });

  it('arrays that became empty are still reported', () => {
    const diff = computeDiff({ tags: ['a'] }, { tags: [] });
    expect(diff).toEqual([
      { field: 'tags', added: [], removed: ['a'] },
    ]);
  });

  it('skips an array whose contents are equivalent (set equality)', () => {
    const diff = computeDiff({ tags: ['a', 'b'] }, { tags: ['b', 'a'] });
    // JSON-stringify in arrayDiff treats reorderings as no-op when each
    // element is present in both — guards against a noisy "reordered"
    // entry that reviewers can't act on.
    expect(diff).toEqual([]);
  });

  it('strips secret keys inside nested object values', () => {
    // toDiffValue walks one level into objects to strip secret keys; deep
    // nested secrets don't reach the audit row even if the parent field
    // changed for a different reason.
    const diff = computeDiff(
      { config: { passwordHash: 'old', other: 1 } },
      { config: { passwordHash: 'new', other: 2 } },
    );
    expect(diff).toHaveLength(1);
    const change = diff![0] as {
      field: string;
      before: { other: number };
      after: { other: number };
    };
    expect(change.field).toBe('config');
    expect(change.before).toEqual({ other: 1 });
    expect(change.after).toEqual({ other: 2 });
  });

  it('treats added and removed scalar fields as scalar changes', () => {
    const diff = computeDiff(
      { id: '1', name: 'a' },
      { id: '1', name: 'a', newField: 'value' },
    );
    expect(diff).toEqual([
      { field: 'newField', before: null, after: 'value' },
    ]);
  });
});
