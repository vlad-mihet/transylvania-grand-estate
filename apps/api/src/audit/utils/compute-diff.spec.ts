import {
  computeDiff,
  redactPiiObject,
  redactPiiValue,
  PII_KEY,
} from './compute-diff';

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
      { id: '1', title: 'Old', price: 100, status: 'draft' },
      { id: '1', title: 'New', price: 100, status: 'draft' },
    );
    expect(diff).toEqual([
      { field: 'title', before: 'Old', after: 'New' },
    ]);
  });

  it('strips secret-looking keys (password, secret, token, hash)', () => {
    // `title` chosen instead of `name` so this test exercises secret-key
    // stripping in isolation — `name` would now also trigger PII redaction
    // (covered by the dedicated "PII redaction" describe block below).
    const diff = computeDiff(
      { passwordHash: 'aaa', tokenHash: 'b', secret: 'c', title: 'old' },
      { passwordHash: 'bbb', tokenHash: 'd', secret: 'e', title: 'new' },
    );
    expect(diff).toEqual([
      { field: 'title', before: 'old', after: 'new' },
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
    // `name` is PII; even when added/removed/changed, the diff hides values.
    expect(diff).toEqual([
      { field: 'newField', before: null, after: 'value' },
    ]);
  });
});

/**
 * GDPR-grade PII redaction — both on the diff output (so admin UI can render
 * "email changed" without leaking the address) and on the snapshot pass
 * (so the AuditLog.before/after JSON columns never carry plaintext PII).
 * Pinned because a regression here turns the audit log into an Art.5
 * exfiltration vector.
 */
describe('PII redaction', () => {
  const PROBE = 'probe@example.com';
  const PHONE = '+40 712 345 678';
  const MESSAGE = 'I would like to schedule a viewing this weekend.';

  it('matches PII_KEY against known PII field names but not generic fields', () => {
    expect(PII_KEY.test('name')).toBe(true);
    expect(PII_KEY.test('email')).toBe(true);
    expect(PII_KEY.test('phone')).toBe(true);
    expect(PII_KEY.test('message')).toBe(true);
    expect(PII_KEY.test('firstName')).toBe(true);
    expect(PII_KEY.test('lastName')).toBe(true);
    expect(PII_KEY.test('fullName')).toBe(true);
    expect(PII_KEY.test('displayName')).toBe(true);
    expect(PII_KEY.test('emailAddress')).toBe(true);
    expect(PII_KEY.test('streetAddress')).toBe(true);
    // Generic / non-PII identifiers must not match
    expect(PII_KEY.test('id')).toBe(false);
    expect(PII_KEY.test('status')).toBe(false);
    expect(PII_KEY.test('createdAt')).toBe(false);
    expect(PII_KEY.test('source')).toBe(false);
    expect(PII_KEY.test('sourceUrl')).toBe(false);
  });

  it('redactPiiValue maps non-empty strings to the [REDACTED] sentinel', () => {
    expect(redactPiiValue(PROBE)).toBe('[REDACTED]');
    expect(redactPiiValue(PHONE)).toBe('[REDACTED]');
    expect(redactPiiValue('')).toBe(null);
    expect(redactPiiValue(null)).toBe(null);
    expect(redactPiiValue(undefined)).toBe(null);
  });

  it('redactPiiObject walks the row and replaces PII leaves only', () => {
    const row = {
      id: 'inq-1',
      status: 'new',
      name: 'Probe Tester',
      email: PROBE,
      phone: PHONE,
      message: MESSAGE,
      source: 'revery-contact',
      createdAt: '2026-05-10T10:00:00Z',
    };
    const redacted = redactPiiObject(row) as Record<string, unknown>;
    expect(redacted.id).toBe('inq-1');
    expect(redacted.status).toBe('new');
    expect(redacted.source).toBe('revery-contact');
    expect(redacted.createdAt).toBe('2026-05-10T10:00:00Z');
    expect(redacted.name).toBe('[REDACTED]');
    expect(redacted.email).toBe('[REDACTED]');
    expect(redacted.phone).toBe('[REDACTED]');
    expect(redacted.message).toBe('[REDACTED]');
    // Sanity: original PII strings never appear anywhere in the output.
    const blob = JSON.stringify(redacted);
    expect(blob).not.toContain(PROBE);
    expect(blob).not.toContain(PHONE);
    expect(blob).not.toContain(MESSAGE);
    expect(blob).not.toContain('Probe Tester');
  });

  it('redactPiiObject preserves arrays + recurses into nested objects', () => {
    const input = {
      contacts: [
        { id: 1, email: PROBE, role: 'primary' },
        { id: 2, email: 'second@example.com', role: 'secondary' },
      ],
    };
    const out = redactPiiObject(input) as { contacts: Array<{ id: number; email: string; role: string }> };
    expect(out.contacts).toHaveLength(2);
    expect(out.contacts[0]?.id).toBe(1);
    expect(out.contacts[0]?.role).toBe('primary');
    expect(out.contacts[0]?.email).toBe('[REDACTED]');
    expect(out.contacts[1]?.email).toBe('[REDACTED]');
    expect(JSON.stringify(out)).not.toContain(PROBE);
    expect(JSON.stringify(out)).not.toContain('second@example.com');
  });

  it('computeDiff redacts PII values on a changed inquiry but still records the change', () => {
    const before = {
      id: 'inq-1',
      status: 'new',
      name: 'Old Name',
      email: PROBE,
      phone: PHONE,
      message: MESSAGE,
    };
    const after = {
      id: 'inq-1',
      status: 'read', // non-PII change
      name: 'New Name',
      email: 'new@example.com',
      phone: '+40 700 000 000',
      message: 'Updated message body for the inquiry probe.',
    };
    const diff = computeDiff(before, after);
    expect(diff).not.toBeNull();
    const blob = JSON.stringify(diff);
    // Admin UI can still see that name/email/phone/message all changed:
    const fields = (diff as Array<{ field: string }>).map((d) => d.field);
    expect(fields).toContain('status');
    expect(fields).toContain('name');
    expect(fields).toContain('email');
    expect(fields).toContain('phone');
    expect(fields).toContain('message');
    // The non-PII status change retains real values:
    const statusChange = (diff as Array<{ field: string; before: unknown; after: unknown }>).find(
      (d) => d.field === 'status',
    );
    expect(statusChange?.before).toBe('new');
    expect(statusChange?.after).toBe('read');
    // PII changes show [REDACTED] for both sides — the FACT changed leaks,
    // not the values:
    const emailChange = (diff as Array<{ field: string; before: unknown; after: unknown }>).find(
      (d) => d.field === 'email',
    );
    expect(emailChange?.before).toBe('[REDACTED]');
    expect(emailChange?.after).toBe('[REDACTED]');
    // No raw PII string appears anywhere in the diff JSON:
    expect(blob).not.toContain(PROBE);
    expect(blob).not.toContain(PHONE);
    expect(blob).not.toContain(MESSAGE);
    expect(blob).not.toContain('Old Name');
    expect(blob).not.toContain('New Name');
    expect(blob).not.toContain('new@example.com');
  });

  it('computeDiff still detects "PII added or removed" without leaking the value', () => {
    const before = { id: 'inq-1', email: undefined };
    const after = { id: 'inq-1', email: PROBE };
    const diff = computeDiff(before, after);
    expect(diff).not.toBeNull();
    const emailChange = (diff as Array<{ field: string; before: unknown; after: unknown }>).find(
      (d) => d.field === 'email',
    );
    expect(emailChange).toBeDefined();
    expect(emailChange?.before).toBe(null);
    expect(emailChange?.after).toBe('[REDACTED]');
    expect(JSON.stringify(diff)).not.toContain(PROBE);
  });
});
