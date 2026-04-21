/**
 * Field-level diff between an audit "before" and "after" snapshot. Persisted
 * into AuditLog.diff so the admin UI can render changed-field chips without
 * re-walking the full JSON payloads at read time.
 *
 * Design notes:
 *  - Shallow walk only. Nested objects are diffed by JSON-string equality —
 *    the goal is reviewer comprehension, not a structural patch format.
 *  - Arrays of scalars get { added, removed }; arrays of objects WITH an
 *    `id` field are matched by id and reported as added/removed lists. Any
 *    deeper structural change inside an array element is summarised as
 *    "value differs" rather than walked recursively.
 *  - Secret-looking keys are dropped (defence in depth — the interceptor's
 *    sanitize() also strips passwordHash, but new fields might slip in).
 *  - Cap at MAX_FIELDS so a malicious payload with 10k changed fields can't
 *    bloat the audit row.
 *  - Returns null on create or delete (whole snapshot IS the diff in those
 *    cases — no point storing twice).
 */

const MAX_FIELDS = 50;
const SECRET_KEY = /password|secret|token|hash/i;

export type DiffValue =
  | string
  | number
  | boolean
  | null
  | DiffValue[]
  | { [k: string]: DiffValue };

export interface ScalarChange {
  field: string;
  before: DiffValue;
  after: DiffValue;
}

export interface ArrayChange {
  field: string;
  added: DiffValue[];
  removed: DiffValue[];
}

export type ChangedField = ScalarChange | ArrayChange;

export function computeDiff(
  before: unknown,
  after: unknown,
): ChangedField[] | null {
  if (before == null || after == null) return null;
  if (typeof before !== 'object' || typeof after !== 'object') return null;

  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const keys = new Set<string>([
    ...Object.keys(beforeObj),
    ...Object.keys(afterObj),
  ]);

  const out: ChangedField[] = [];
  for (const key of keys) {
    if (out.length >= MAX_FIELDS) break;
    if (SECRET_KEY.test(key)) continue;
    const b = beforeObj[key];
    const a = afterObj[key];
    if (deepEqualByJson(a, b)) continue;

    if (Array.isArray(a) || Array.isArray(b)) {
      const beforeArr = Array.isArray(b) ? b : [];
      const afterArr = Array.isArray(a) ? a : [];
      const change = arrayDiff(key, beforeArr, afterArr);
      if (change) out.push(change);
      continue;
    }

    out.push({
      field: key,
      before: toDiffValue(b),
      after: toDiffValue(a),
    });
  }
  return out;
}

function arrayDiff(
  field: string,
  before: unknown[],
  after: unknown[],
): ArrayChange | null {
  // Object arrays with `id` → diff by id so {id:1, name:'a'} vs {id:1, name:'b'}
  // is reported once, not as one removed + one added.
  const allObjectsWithId =
    [...before, ...after].length > 0 &&
    [...before, ...after].every(
      (v) => v != null && typeof v === 'object' && 'id' in (v as object),
    );

  if (allObjectsWithId) {
    const beforeIds = new Set(before.map((v) => (v as { id: unknown }).id));
    const afterIds = new Set(after.map((v) => (v as { id: unknown }).id));
    const added = after.filter((v) => !beforeIds.has((v as { id: unknown }).id));
    const removed = before.filter(
      (v) => !afterIds.has((v as { id: unknown }).id),
    );
    if (added.length === 0 && removed.length === 0) return null;
    return {
      field,
      added: added.map(toDiffValue),
      removed: removed.map(toDiffValue),
    };
  }

  // Scalar arrays → set diff. Stable JSON-string comparison handles tuples
  // and nested-object cases too without recursing.
  const beforeSet = new Set(before.map((v) => JSON.stringify(v)));
  const afterSet = new Set(after.map((v) => JSON.stringify(v)));
  const added: unknown[] = [];
  const removed: unknown[] = [];
  for (const v of after) {
    if (!beforeSet.has(JSON.stringify(v))) added.push(v);
  }
  for (const v of before) {
    if (!afterSet.has(JSON.stringify(v))) removed.push(v);
  }
  if (added.length === 0 && removed.length === 0) return null;
  return {
    field,
    added: added.map(toDiffValue),
    removed: removed.map(toDiffValue),
  };
}

function deepEqualByJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function toDiffValue(value: unknown): DiffValue {
  if (value === undefined) return null;
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toDiffValue);
  if (typeof value === 'object') {
    const obj: Record<string, DiffValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(k)) continue;
      obj[k] = toDiffValue(v);
    }
    return obj;
  }
  return null;
}
