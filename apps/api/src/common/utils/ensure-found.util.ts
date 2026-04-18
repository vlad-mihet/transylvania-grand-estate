import { NotFoundException } from '@nestjs/common';

/**
 * Awaits a Prisma lookup (or any promise) and throws `NotFoundException`
 * when the result is `null` / `undefined`. Keeps per-service `ensureExists`
 * methods to a single line.
 */
export async function ensureFound<T>(
  lookup: Promise<T | null | undefined>,
  entity: string,
): Promise<T> {
  const result = await lookup;
  if (!result) throw new NotFoundException(`${entity} not found`);
  return result;
}
