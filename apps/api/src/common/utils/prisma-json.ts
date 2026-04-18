import type { Prisma } from '@prisma/client';

/**
 * Funnels the `as unknown as Prisma.InputJsonValue` double-cast through one
 * typed helper. Prisma's Json column accepts any serializable value, but its
 * input type doesn't line up with our DTOs (LocalizedString, feature arrays,
 * etc.) without a cast. Use `toJson(value)` instead of re-rolling the cast
 * at each call site.
 */
export function toJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}
