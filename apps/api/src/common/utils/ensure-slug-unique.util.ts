import { ConflictException } from '@nestjs/common';

/**
 * Checks a slug against its owning table before a create so the client sees
 * a clean 409 instead of a Prisma P2002 round-trip. The global exception
 * filter already maps P2002 → 409 as defense-in-depth, but preempting the
 * insert keeps logs quieter and makes the origin of the conflict explicit.
 *
 * Pass the slug plus a lookup that returns the existing row (or null) for
 * that slug; the helper throws `ConflictException` when a row is found.
 */
export async function ensureSlugUnique(
  slug: string,
  entity: string,
  lookup: (slug: string) => Promise<unknown | null | undefined>,
): Promise<void> {
  const existing = await lookup(slug);
  if (existing) {
    throw new ConflictException(`${entity} with slug "${slug}" already exists`);
  }
}
