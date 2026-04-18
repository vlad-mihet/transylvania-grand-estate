import { BadRequestException } from '@nestjs/common';

/**
 * Verifies that an optional foreign-key id resolves to an existing row before
 * handing the payload to Prisma. Surfaces a 400 with the offending field name
 * instead of letting a P2003 bubble up as a generic 500.
 *
 * Pass the FK value plus a lookup that returns non-null when the referenced
 * row exists. `undefined` / `null` FK values are treated as a no-op so the
 * helper is safe to call unconditionally from create/update paths.
 */
export async function ensureRef(
  id: string | null | undefined,
  field: string,
  lookup: (id: string) => Promise<unknown | null | undefined>,
): Promise<void> {
  if (id == null) return;
  const row = await lookup(id);
  if (!row) throw new BadRequestException(`${field} not found: ${id}`);
}
