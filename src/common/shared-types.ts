/**
 * Local replacement for the missing `@via/shared-types` monorepo package.
 * The original package lived at `packages/shared-types` in the monorepo and
 * was never copied into this standalone repo, which broke `nest build`.
 */

/**
 * The codebase uses PascalCase values (Prisma schema / auth.service) as well
 * as lowercase snake_case values (@Roles decorators), so both are allowed.
 */
export type UserRole =
  | 'HotelOwner'
  | 'BundleCreator'
  | 'Traveler'
  | 'Admin'
  | 'hotel_owner'
  | 'bundle_creator'
  | 'traveler'
  | 'admin';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'hotel_owner' | 'bundle_creator' | 'traveler' | 'admin';
}

export interface ApiError {
  field?: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
  meta?: PaginationMeta;
}

export interface AuthResponse {
  token: string;
  user: any;
}
