import { Response } from "express";

/**
 * Standard success response interface
 */
export interface SuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
    [key: string]: any;
  };
}

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  success: false;
  message: string;
  errorId?: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
  details?: any;
}

/**
 * Send a standardized success response
 *
 * @param res - Express response object
 * @param data - Response data
 * @param message - Success message (optional)
 * @param statusCode - HTTP status code (default: 200)
 * @param meta - Additional metadata like pagination (optional)
 *
 * @example
 * responseSuccess(res, user, 'User created successfully', 201);
 * responseSuccess(res, blogs, 'Blogs retrieved', 200, { page: 1, total: 100 });
 */
export const responseSuccess = <T = any>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  meta?: SuccessResponse["meta"]
): Response<SuccessResponse<T>> => {
  const response: SuccessResponse<T> = {
    success: true,
  };

  if (message) {
    response.message = message;
  }

  if (data !== undefined) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a standardized error response
 *
 * @param res - Express response object
 * @param message - Error message
 * @param statusCode - HTTP status code (default: 500)
 * @param errorId - Unique error ID for tracking (optional)
 * @param errors - Array of validation errors (optional)
 * @param details - Additional error details (only in development)
 *
 * @example
 * responseError(res, 'User not found', 404);
 * responseError(res, 'Validation failed', 400, undefined, [
 *   { field: 'email', message: 'Invalid email format' }
 * ]);
 */
export const responseError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errorId?: string,
  errors?: ErrorResponse["errors"],
  details?: any
): Response<ErrorResponse> => {
  const response: ErrorResponse = {
    success: false,
    message,
  };

  if (errorId) {
    response.errorId = errorId;
  }

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  // Only include detailed error information in development
  if (details && process.env.NODE_ENV === "development") {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a validation error response
 *
 * @param res - Express response object
 * @param errors - Array of validation errors
 * @param message - Main error message (optional)
 *
 * @example
 * responseValidationError(res, [
 *   { field: 'email', message: 'Email is required' },
 *   { field: 'password', message: 'Password must be at least 8 characters' }
 * ]);
 */
export const responseValidationError = (
  res: Response,
  errors: Array<{ field?: string; message: string }>,
  message: string = "Validation failed"
): Response<ErrorResponse> => {
  return responseError(res, message, 400, undefined, errors);
};

/**
 * Send a not found error response
 *
 * @param res - Express response object
 * @param resource - Name of the resource that was not found
 *
 * @example
 * responseNotFound(res, 'Blog');
 * responseNotFound(res, 'User');
 */
export const responseNotFound = (
  res: Response,
  resource: string = "Resource"
): Response<ErrorResponse> => {
  return responseError(res, `${resource} not found`, 404);
};

/**
 * Send an unauthorized error response
 *
 * @param res - Express response object
 * @param message - Error message (optional)
 *
 * @example
 * responseUnauthorized(res);
 * responseUnauthorized(res, 'Invalid token');
 */
export const responseUnauthorized = (
  res: Response,
  message: string = "Unauthorized"
): Response<ErrorResponse> => {
  return responseError(res, message, 401);
};

/**
 * Send a forbidden error response
 *
 * @param res - Express response object
 * @param message - Error message (optional)
 *
 * @example
 * responseForbidden(res);
 * responseForbidden(res, 'Admin access required');
 */
export const responseForbidden = (
  res: Response,
  message: string = "Forbidden"
): Response<ErrorResponse> => {
  return responseError(res, message, 403);
};

/**
 * Send a bad request error response
 *
 * @param res - Express response object
 * @param message - Error message
 *
 * @example
 * responseBadRequest(res, 'Invalid input');
 */
export const responseBadRequest = (
  res: Response,
  message: string = "Bad request"
): Response<ErrorResponse> => {
  return responseError(res, message, 400);
};

/**
 * Send a paginated success response
 *
 * @param res - Express response object
 * @param data - Array of items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @param message - Success message (optional)
 *
 * @example
 * responsePaginated(res, blogs, 1, 10, 100, 'Blogs retrieved successfully');
 */
export const responsePaginated = <T = any>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): Response<SuccessResponse<T[]>> => {
  const totalPages = Math.ceil(total / limit);

  return responseSuccess(res, data, message, 200, {
    page,
    limit,
    total,
    total_pages: totalPages,
  });
};

/**
 * Send a created success response
 *
 * @param res - Express response object
 * @param data - Created resource data
 * @param message - Success message (optional)
 *
 * @example
 * responseCreated(res, blog, 'Blog created successfully');
 */
export const responseCreated = <T = any>(
  res: Response,
  data: T,
  message: string = "Resource created successfully"
): Response<SuccessResponse<T>> => {
  return responseSuccess(res, data, message, 201);
};

/**
 * Send a no content success response
 *
 * @param res - Express response object
 *
 * @example
 * responseNoContent(res); // For DELETE operations
 */
export const responseNoContent = (res: Response): Response => {
  return res.status(204).send();
};

export default {
  responseSuccess,
  responseError,
  responseValidationError,
  responseNotFound,
  responseUnauthorized,
  responseForbidden,
  responseBadRequest,
  responsePaginated,
  responseCreated,
  responseNoContent,
};
