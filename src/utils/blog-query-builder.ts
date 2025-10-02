import { blogQueryBuilder, GenericQueryParams } from "./generic-query-builder";

/**
 * Parses blog query parameters using the generic query builder
 * This is the recommended function for new code
 */
export function parseBlogQueryParamsV2(
  query: GenericQueryParams,
  additionalFilters: any[] = []
) {
  return blogQueryBuilder.parseQueryParams(query, additionalFilters);
}
