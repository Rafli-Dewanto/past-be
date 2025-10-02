export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
  offset?: number;
  from?: number;
  to?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface SortOption {
  field: string;
  direction: "asc" | "desc";
}

export interface FilterOption {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "nin"
    | "contains"
    | "icontains"
    | "startswith"
    | "endswith"
    | "isnull"
    | "isnotnull";
  value: any;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  filters?: Record<string, any>;
}

export interface AdvancedPaginationQuery {
  page?: number;
  limit?: number;
  sort?: SortOption[];
  filters?: FilterOption[];
  search?: string;
  searchFields?: string[];
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
    offset?: number;
    from?: number;
    to?: number;
  };
}
