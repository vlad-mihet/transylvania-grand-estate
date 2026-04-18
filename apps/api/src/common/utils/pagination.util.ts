export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Run a `findMany + count` pair in parallel and return `{ data, meta }` in
 * the shape our controllers / transform interceptor expect.
 *
 * Pass pre-bound callbacks that the helper invokes with the correct `skip` /
 * `take` — this keeps the helper model-agnostic and lets each service still
 * control its own `where`, `include`, `orderBy`, and `select`.
 */
export async function paginate<T>(
  findMany: (skip: number, take: number) => Promise<T[]>,
  count: () => Promise<number>,
  page: number,
  limit: number,
): Promise<Paginated<T>> {
  const [data, total] = await Promise.all([
    findMany((page - 1) * limit, limit),
    count(),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
