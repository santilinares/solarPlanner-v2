import { z } from 'zod';

/**
 * User authentication and profile validation schemas
 */

// Enums
export const UserRoleEnum = z.enum(['user', 'admin']);
export const AuthMethodEnum = z.enum(['local', 'google']);

// User registration (local method)
export const UserCreateSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.string().email('Valid email is required').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;

// User login
export const UserLoginSchema = z.object({
  email: z.string().email('Valid email is required').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type UserLoginInput = z.infer<typeof UserLoginSchema>;

// Update user profile
export const UserUpdateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
});

export type UserUpdateProfileInput = z.infer<typeof UserUpdateProfileSchema>;

// Change password
export const UserChangePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type UserChangePasswordInput = z.infer<typeof UserChangePasswordSchema>;

// Password reset request
export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Valid email is required').toLowerCase(),
});

export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>;

// Password reset apply
export const PasswordResetApplySchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type PasswordResetApplyInput = z.infer<typeof PasswordResetApplySchema>;

// User query filters (for admin list)
export const UserQuerySchema = z.object({
  role: UserRoleEnum.optional(),
  email: z.string().email().optional(),
  search: z.string().optional(),
});

export type UserQueryInput = z.infer<typeof UserQuerySchema>;

// MongoDB ObjectId validation
export const ObjectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format');
