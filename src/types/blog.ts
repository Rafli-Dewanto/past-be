import {
  SortOption,
  FilterOption,
  AdvancedPaginationQuery,
} from "../types/pagination";
import { GenericQueryParams } from "../utils/generic-query-builder";

export interface BlogFilters {
  title?: string;
  content?: string;
  thumbnail?: string;
  isPublished?: boolean;
  userId?: number;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  updatedAt?: {
    gte?: Date;
    lte?: Date;
  };
  deletedAt?: {
    gte?: Date;
    lte?: Date;
  } | null;
}

export interface BlogSortOptions {
  field:
    | "id"
    | "uuid"
    | "title"
    | "content"
    | "thumbnail"
    | "isPublished"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
    | "userId";
  direction: "asc" | "desc";
}

export interface BlogQuery extends AdvancedPaginationQuery {
  filters?: FilterOption[];
  sort?: BlogSortOptions[];
  search?: string;
  searchFields?: ("title" | "content")[];
}

// Query builder for URL parameters
export interface BlogQueryParams extends GenericQueryParams {
  // Filter parameters
  title?: string;
  content?: string;
  thumbnail?: string;
  "is-published"?: string;
  userId?: string;
  "start-date"?: string; // ISO date string
  "end-date"?: string; // ISO date string
  "date-field"?: string; // "created-at", "updated-at", "deleted-at" (defaults to "created-at")
  deletedAt_null?: string; // true/false for is null check
}

// Re-export for convenience
export type { FilterOption, SortOption };
