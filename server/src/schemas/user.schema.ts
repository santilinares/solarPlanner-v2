import { z } from 'zod';

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/, 'Password must contain at least one special character');

// Enums
/**
 * User role enumeration
 * @enum {string}
 * @property user - Regular user role
 * @property admin - Administrator role with elevated permissions
 */
export const UserRoleEnum = z.enum(['user', 'admin']);

/**
 * Authentication method enumeration
 * @enum {string}
 * @property local - Email/password authentication
 * @property google - Google OAuth authentication
 */
export const AuthMethodEnum = z.enum(['local', 'google']);

/**
 * User registration schema for local authentication
 * 
 * Validates user registration data:
 * - fullName: 2-120 characters
 * - email: Valid email format (case-insensitive)
 * - password: Minimum 8 characters
 * 
 * @example
 * ```json
 * {
 *   "fullName": "John Doe",
 *   "email": "john@example.com",
 *   "password": "SecurePass123!"
 * }
 * ```
 */
export const UserCreateSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.string().email('Valid email is required').toLowerCase(),
  password: strongPassword,
});

/** Type inferred from UserCreateSchema - used for user registration */
export type UserCreateInput = z.infer<typeof UserCreateSchema>;

/**
 * User login schema
 * 
 * Validates user login credentials:
 * - email: Valid email format (case-insensitive)
 * - password: Minimum 8 characters
 * 
 * @example
 * ```json
 * {
 *   "email": "john@example.com",
 *   "password": "SecurePass123!"
 * }
 * ```
 */
export const UserLoginSchema = z.object({
  email: z.string().email('Valid email is required').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/** Type inferred from UserLoginSchema - used for user login */
export type UserLoginInput = z.infer<typeof UserLoginSchema>;

/**
 * User profile update schema
 * 
 * Validates profile update data:
 * - fullName: 2-120 characters
 */
export const UserUpdateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
});

/** Type inferred from UserUpdateProfileSchema - used for updating user profile */
export type UserUpdateProfileInput = z.infer<typeof UserUpdateProfileSchema>;

/**
 * Password change schema
 * 
 * Validates password change request:
 * - currentPassword: Minimum 8 characters
 * - newPassword: Minimum 8 characters
 */
export const UserChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPassword,
});

/** Type inferred from UserChangePasswordSchema - used for changing password */
export type UserChangePasswordInput = z.infer<typeof UserChangePasswordSchema>;

/**
 * Password reset request schema
 * 
 * Validates password reset request (sends reset email):
 * - email: Valid email format (case-insensitive)
 */
export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Valid email is required').toLowerCase(),
});

/** Type inferred from PasswordResetRequestSchema - used for requesting password reset */
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>;

/**
 * Password reset apply schema
 * 
 * Validates password reset with token:
 * - token: Reset token from email
 * - newPassword: Minimum 8 characters
 */
export const PasswordResetApplySchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: strongPassword,
});

/** Type inferred from PasswordResetApplySchema - used for applying password reset */
export type PasswordResetApplyInput = z.infer<typeof PasswordResetApplySchema>;

/**
 * User query filters schema (admin only)
 * 
 * Optional filters for listing users:
 * - role: Filter by user role (user/admin)
 * - email: Filter by exact email
 * - search: Search across user fields
 */
export const UserQuerySchema = z.object({
  role: UserRoleEnum.optional(),
  email: z.string().email().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/** Type inferred from UserQuerySchema - used for querying/filtering users */
export type UserQueryInput = z.infer<typeof UserQuerySchema>;

/**
 * User role update schema (admin only)
 */
export const UserUpdateRoleSchema = z.object({
  role: UserRoleEnum,
});

/** Type inferred from UserUpdateRoleSchema */
export type UserUpdateRoleInput = z.infer<typeof UserUpdateRoleSchema>;

/**
 * Google OAuth token schema
 */
export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

/** Type inferred from GoogleAuthSchema */
export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;

/**
 * MongoDB ObjectId validation schema
 * 
 * Validates 24-character hexadecimal MongoDB ObjectId format
 */
export const ObjectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format');
