import {
  ApiError,
  ApiResponse,
  PaginationMeta,
} from './shared-types';

/**
 * Build a standard success response.
 */
export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

/**
 * Build a standard error response (used when throwing HttpExceptions
 * is not appropriate — e.g. inside the global exception filter).
 */
export function fail(
  message: string,
  errors?: ApiError[],
): ApiResponse<never> {
  return { success: false, message, errors };
}

/**
 * Build pagination metadata from a Prisma query result.
 */
export function paginate(
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
