import { PaginationMeta } from "../types/pagination";

/**
 * Creates comprehensive pagination metadata
 *
 * @param page - Current page number (1-based)
 * @param limit - Number of items per page
 * @param total - Total number of items
 * @returns PaginationMeta object with all pagination information
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const from = total > 0 ? offset + 1 : 0;
  const to = Math.min(offset + limit, total);

  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_next_page: page < totalPages,
    has_prev_page: page > 1,
    offset,
    from,
    to,
  };
}

/**
 * Creates basic pagination metadata (for simpler use cases)
 *
 * @param page - Current page number (1-based)
 * @param limit - Number of items per page
 * @param total - Total number of items
 * @returns Basic pagination object with essential fields
 */
export function createBasicPagination(
  page: number,
  limit: number,
  total: number
) {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    total_pages: totalPages,
  };
}
