import { Prisma } from "@prisma/client";
import { SortOption, FilterOption } from "../types/pagination";

/**
 * Configuration for a queryable entity
 */
export interface QueryableEntityConfig<T extends Record<string, any> = any> {
  /** Fields that can be sorted */
  sortableFields: (keyof T)[];
  /** Fields that can be searched */
  searchableFields: string[];
  /** Fields that are boolean type */
  booleanFields?: (keyof T)[];
  /** Field mappings from kebab-case query params to database field names */
  fieldMappings: Record<string, keyof T>;
  /** Default sort field and direction */
  defaultSort: {
    field: keyof T;
    direction: "asc" | "desc";
  };
}

/**
 * Generic query parameters interface for kebab-case parameters
 */
export interface GenericQueryParams {
  page?: string;
  limit?: string;
  sort?: string;
  search?: string;
  "search-fields"?: string;
  "start-date"?: string;
  "end-date"?: string;
  "date-field"?: string;
  [key: string]: string | undefined;
}

/**
 * Parsed query result
 */
export interface ParsedQuery<T = any> {
  page: number;
  limit: number;
  sort: Array<{ field: keyof T; direction: "asc" | "desc" }>;
  filters: FilterOption[];
  search?: string;
  searchFields: string[];
}

/**
 * Generic query builder for handling common query patterns
 */
export class GenericQueryBuilder<T extends Record<string, any> = any> {
  private config: QueryableEntityConfig<T>;

  constructor(config: QueryableEntityConfig<T>) {
    this.config = config;
  }

  /**
   * Parses sort parameter from query string
   * Format: "field1:direction1,field2:direction2"
   */
  parseSortParam(
    sortParam: string
  ): Array<{ field: keyof T; direction: "asc" | "desc" }> {
    if (!sortParam) {
      return [this.config.defaultSort];
    }

    return sortParam
      .split(",")
      .map((sort) => {
        const [field, direction = "asc"] = sort.split(":");
        const mappedField =
          this.config.fieldMappings[field] || (field as keyof T);
        return {
          field: mappedField,
          direction: (direction as "asc" | "desc") || "asc",
        };
      })
      .filter((sort) => this.config.sortableFields.includes(sort.field));
  }

  /**
   * Parses search fields parameter
   */
  parseSearchFieldsParam(searchFieldsParam: string): string[] {
    if (!searchFieldsParam) {
      return this.config.searchableFields;
    }

    const fields = searchFieldsParam
      .split(",")
      .filter((field) => this.config.searchableFields.includes(field));

    return fields.length > 0 ? fields : this.config.searchableFields;
  }

  /**
   * Builds Prisma where clause from filters
   */
  buildWhereClause(filters: FilterOption[] = []): Record<string, any> {
    const where: Record<string, any> = {};

    for (const filter of filters) {
      const { field, operator, value } = filter;
      const mappedField = this.config.fieldMappings[field as string] || field;

      where[mappedField as string] = applyOperator(
        where[mappedField as string] || {},
        operator,
        value
      );
    }

    return where;
  }

  /**
   * Builds Prisma orderBy clause from sort options
   */
  buildOrderByClause(
    sort: Array<{ field: keyof T; direction: "asc" | "desc" }> = []
  ): Record<string, any>[] {
    if (sort.length === 0) {
      return [
        { [this.config.defaultSort.field]: this.config.defaultSort.direction },
      ];
    }

    return sort.map((sortOption) => ({
      [sortOption.field]: sortOption.direction,
    }));
  }

  /**
   * Builds search where clause for full-text search
   */
  buildSearchClause(
    search?: string,
    searchFields: string[] = []
  ): Record<string, any> {
    if (!search) return {};

    const searchConditions: Record<string, any>[] = [];

    for (const field of searchFields) {
      searchConditions.push({
        [field]: {
          contains: search,
          mode: "insensitive" as const,
        },
      });
    }

    return searchConditions.length > 0 ? { OR: searchConditions } : {};
  }

  /**
   * Parses generic query parameters into structured query
   */
  parseQueryParams(
    query: GenericQueryParams,
    additionalFilters: FilterOption[] = []
  ): ParsedQuery<T> {
    const {
      page,
      limit,
      sort,
      search,
      "search-fields": searchFields,
      "start-date": startDate,
      "end-date": endDate,
      "date-field": dateField,
      ...otherParams
    } = query;

    const filters: FilterOption[] = [...additionalFilters];

    // Add filters from other query parameters
    for (const [key, value] of Object.entries(otherParams)) {
      if (value !== undefined && this.config.fieldMappings[key]) {
        const field = this.config.fieldMappings[key];
        const isBooleanField = this.config.booleanFields?.includes(
          field as keyof T
        );

        if (isBooleanField && typeof value === "string") {
          // Convert string boolean values to actual booleans
          const booleanValue = value.toLowerCase() === "true";
          filters.push({
            field: field as string,
            operator: "eq",
            value: booleanValue,
          });
        } else if (typeof value === "string") {
          filters.push({
            field: field as string,
            operator: "icontains",
            value,
          });
        } else {
          filters.push({ field: field as string, operator: "eq", value });
        }
      }
    }

    // Handle date range filtering
    if (startDate || endDate) {
      const targetField = this.mapDateField(dateField || "created-at");
      if (startDate)
        filters.push({ field: targetField, operator: "gte", value: startDate });
      if (endDate)
        filters.push({ field: targetField, operator: "lte", value: endDate });
    }

    return {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      sort: sort ? this.parseSortParam(sort) : [this.config.defaultSort],
      filters,
      search,
      searchFields: searchFields
        ? this.parseSearchFieldsParam(searchFields)
        : this.config.searchableFields,
    };
  }

  /**
   * Maps kebab-case date field to database field name
   */
  private mapDateField(dateField: string): string {
    const dateFieldMappings: Record<string, string> = {
      "created-at": "createdAt",
      "updated-at": "updatedAt",
      "deleted-at": "deletedAt",
    };
    return dateFieldMappings[dateField] || "createdAt";
  }
}

/**
 * Applies operator to a field value
 */
function applyOperator(currentValue: any, operator: string, value: any): any {
  switch (operator) {
    case "eq":
      return value;
    case "ne":
      return { not: value };
    case "gt":
      return { gt: value };
    case "gte":
      return { gte: value };
    case "lt":
      return { lt: value };
    case "lte":
      return { lte: value };
    case "in":
      return { in: Array.isArray(value) ? value : [value] };
    case "nin":
      return { notIn: Array.isArray(value) ? value : [value] };
    case "contains":
      return { contains: value };
    case "icontains":
      return { contains: value, mode: "insensitive" };
    case "startswith":
      return { startsWith: value };
    case "endswith":
      return { endsWith: value };
    case "isnull":
      return null;
    case "isnotnull":
      return { not: null };
    default:
      return value;
  }
}

/**
 * Pre-configured query builders for common entities
 */

// Blog entity configuration
export const blogQueryBuilder = new GenericQueryBuilder({
  sortableFields: [
    "id",
    "uuid",
    "title",
    "content",
    "thumbnail",
    "isPublished",
    "createdAt",
    "updatedAt",
    "deletedAt",
    "userId",
  ],
  searchableFields: ["title", "content"],
  booleanFields: ["isPublished"],
  fieldMappings: {
    title: "title",
    content: "content",
    thumbnail: "thumbnail",
    "is-published": "isPublished",
    "user-id": "userId",
    "deleted-at_null": "deletedAt",
  },
  defaultSort: {
    field: "createdAt",
    direction: "desc",
  },
});

// User entity configuration (for future use)
export const userQueryBuilder = new GenericQueryBuilder({
  sortableFields: [
    "id",
    "uuid",
    "name",
    "email",
    "role",
    "createdAt",
    "updatedAt",
  ],
  searchableFields: ["name", "email"],
  fieldMappings: {
    name: "name",
    email: "email",
    role: "role",
  },
  defaultSort: {
    field: "createdAt",
    direction: "desc",
  },
});

// Log entity configuration (for future use)
export const logQueryBuilder = new GenericQueryBuilder({
  sortableFields: [
    "id",
    "level",
    "method",
    "statusCode",
    "userId",
    "createdAt",
  ],
  searchableFields: ["message", "method", "url"],
  fieldMappings: {
    level: "level",
    method: "method",
    "status-code": "statusCode",
    "user-id": "userId",
    "start-date": "createdAt",
    "end-date": "createdAt",
  },
  defaultSort: {
    field: "createdAt",
    direction: "desc",
  },
});
