import type { ZodIssue } from 'zod';

/**
 * Derive a stable machine code for a Zod validation issue, scoped to the
 * field's path. Stable codes survive Zod version upgrades and let clients
 * map them to translation keys (`Errors.validation.<code>`) instead of
 * string-matching the human message.
 *
 * Output examples:
 *   `validation.password.too_short`
 *   `validation.email.invalid_email`
 *   `validation.gdprConsent.required`
 *   `validation.amenities.too_few`
 *
 * Schemas that need a non-derivable code (cross-field validators, complex
 * `.refine()` blocks) attach `params: { code: 'validation.x.y' }` to the
 * issue at definition time:
 *
 *   z.string().refine((v) => v !== email, {
 *     message: 'Password must differ from email',
 *     params: { code: 'validation.password.matches_email' },
 *   })
 *
 * Tracks Zod v4's issue codes: `invalid_type`, `invalid_value`, `too_small`,
 * `too_big`, `invalid_format`, `not_multiple_of`, `invalid_union`,
 * `invalid_key`, `invalid_element`, `unrecognized_keys`, `custom`. The
 * switch reads `issue.code` as a wide `string` so adding a new Zod code
 * only requires extending the cases.
 */
export function deriveStableCode(issue: ZodIssue): string {
  // Explicit override wins — refinements stamp their own stable code.
  const params = (issue as { params?: Record<string, unknown> }).params;
  if (params && typeof params.code === 'string' && params.code.length > 0) {
    return params.code;
  }

  // Path tail is the field name; nested paths join with dots so distinct
  // fields named the same in different sub-objects don't collide. Numeric
  // array indices are dropped because translation keys shouldn't vary per
  // index (e.g. `features[2].name` and `features[5].name` resolve to the
  // same translation).
  const segments = issue.path
    .map((p) => (typeof p === 'number' ? null : p))
    .filter((p): p is string => p !== null);
  const fieldKey = segments.length > 0 ? segments.join('.') : 'value';

  // Wide-typed read so adding a new Zod code only requires extending the
  // switch — TS won't complain about cases that don't yet exist in the
  // installed Zod's literal union.
  const code = issue.code as string;

  switch (code) {
    case 'too_small': {
      const sized = issue as ZodIssue & { origin?: string; type?: string };
      const kind = sized.origin ?? sized.type;
      if (kind === 'string') return `validation.${fieldKey}.too_short`;
      if (kind === 'array') return `validation.${fieldKey}.too_few`;
      if (kind === 'number' || kind === 'bigint' || kind === 'date') {
        return `validation.${fieldKey}.too_small`;
      }
      return `validation.${fieldKey}.too_small`;
    }
    case 'too_big': {
      const sized = issue as ZodIssue & { origin?: string; type?: string };
      const kind = sized.origin ?? sized.type;
      if (kind === 'string') return `validation.${fieldKey}.too_long`;
      if (kind === 'array') return `validation.${fieldKey}.too_many`;
      if (kind === 'number' || kind === 'bigint' || kind === 'date') {
        return `validation.${fieldKey}.too_big`;
      }
      return `validation.${fieldKey}.too_big`;
    }
    case 'invalid_format': {
      // Zod v4 collapses email/url/uuid/regex string checks under a single
      // `invalid_format` code discriminated by `format`. Map each well-known
      // format to its specific translation key; fall through to the generic
      // for any future Zod-defined format we haven't translated yet.
      const fmt = issue as ZodIssue & { format?: string };
      if (fmt.format === 'email')
        return `validation.${fieldKey}.invalid_email`;
      if (fmt.format === 'url') return `validation.${fieldKey}.invalid_url`;
      if (fmt.format === 'uuid') return `validation.${fieldKey}.invalid_uuid`;
      if (fmt.format === 'regex')
        return `validation.${fieldKey}.invalid_format`;
      return `validation.${fieldKey}.invalid_format`;
    }
    case 'invalid_type': {
      const t = issue as ZodIssue & { received?: string };
      if (t.received === 'undefined' || t.received === 'null') {
        return `validation.${fieldKey}.required`;
      }
      return `validation.${fieldKey}.invalid_type`;
    }
    case 'invalid_value':
      // v4: literal mismatches + enum non-membership both surface as
      // `invalid_value`. The `Errors.validation.*.invalid_choice` key
      // covers both cases naturally.
      return `validation.${fieldKey}.invalid_choice`;
    case 'invalid_union':
      return `validation.${fieldKey}.invalid`;
    case 'invalid_key':
    case 'invalid_element':
      return `validation.${fieldKey}.invalid`;
    case 'not_multiple_of':
      return `validation.${fieldKey}.not_multiple_of`;
    case 'unrecognized_keys':
      return `validation.${fieldKey}.unrecognized_keys`;
    case 'custom':
    default:
      // `custom` without explicit `params.code` falls through here — give it
      // a recognizable generic key. Schemas should ideally attach their own.
      return `validation.${fieldKey}.${code}`;
  }
}
