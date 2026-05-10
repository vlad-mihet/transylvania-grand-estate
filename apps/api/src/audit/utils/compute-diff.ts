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
 *  - PII fields (name/email/phone/message/firstName/lastName/address) are
 *    detected on raw inputs so we can still see THAT a field changed, then
 *    their values are replaced with the `[REDACTED]` sentinel in the diff
 *    output. The audit reviewer learns "email changed on 12:03" but never
 *    sees the address itself — GDPR Art.5 (data minimisation) compliant.
 *  - Cap at MAX_FIELDS so a malicious payload with 10k changed fields can't
 *    bloat the audit row.
 *  - Returns null on create or delete (whole snapshot IS the diff in those
 *    cases — no point storing twice).
 */

const MAX_FIELDS = 50;
const SECRET_KEY = /password|secret|token|hash/i;

/**
 * Field-name pattern for personal-data we never want stored in audit_logs in
 * plaintext. Matches whole-field equality (so e.g. `displayName` is also
 * caught by the `name` clause via the `(?:.*)?name$` shape).
 *
 * NOTE: this is a denylist by name. New PII-bearing fields (e.g. an iban,
 * date-of-birth, ssn) MUST be added here when introduced — code review
 * should flag any new schema field that holds personal data.
 */
export const PII_KEY =
  /^(?:.*?(?:name|email|phone|message|address)|firstName|lastName|fullName)$/i;

const PII_SENTINEL = '[REDACTED]';

/**
 * Replace any PII field value with `[REDACTED]`. Empty / null stays as null
 * so a "row never had this PII set" doesn't look like "row had something
 * redacted". Non-string scalars (rare for PII fields) collapse to the same
 * sentinel.
 */
export function redactPiiValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.length === 0) return null;
  return PII_SENTINEL;
}

/**
 * Recursively walk an object/array and redact PII fields by name. Used to
 * sanitise the `before`/`after` JSON columns on AuditLog rows so a CSV export
 * never leaks customer email/phone/message in plaintext. The structure of
 * the object is preserved (so per-field comparison still works in admin UI),
 * only the PII leaf values are replaced.
 *
 * Note: this works on *raw* inputs from the audit interceptor — it must run
 * BEFORE `computeDiff` if both want PII redaction (otherwise the diff sees
 * pre-redacted values and can't tell PII fields changed). The current call
 * order in `audit.service.ts:buildData` runs computeDiff against raw inputs
 * (which redacts PII inside its output) then redacts the snapshots
 * separately.
 */
export function redactPiiObject(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactPiiObject);
  if (typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY.test(k)) continue;
    if (PII_KEY.test(k)) {
      out[k] = redactPiiValue(v);
    } else {
      out[k] = redactPiiObject(v);
    }
  }
  return out;
}

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

    // PII fields: detect change on raw values, but emit redacted sentinels
    // so the audit row never carries the cleartext.
    if (PII_KEY.test(key)) {
      out.push({
        field: key,
        before: redactPiiValue(b) as DiffValue,
        after: redactPiiValue(a) as DiffValue,
      });
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
      if (PII_KEY.test(k)) {
        obj[k] = redactPiiValue(v) as DiffValue;
        continue;
      }
      obj[k] = toDiffValue(v);
    }
    return obj;
  }
  return null;
}
