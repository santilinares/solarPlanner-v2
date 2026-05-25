import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success, created, forbidden, noContent } from '../utils/response';
import { authService } from '../services/auth.service';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, REFRESH_COOKIE_OPTIONS);
}
import { userService } from '../services/user.service';
import {
  UserCreateInput,
  UserLoginInput,
  UserUpdateProfileInput,
  UserChangePasswordInput,
  PasswordResetRequestInput,
  PasswordResetApplyInput,
  UserQuerySchema,
  UserUpdateRoleInput,
  GoogleAuthInput,
} from '../schemas/user.schema';

/**
 * User Controller
 * Handles user-related HTTP requests
 */

/**
 * @route   POST /users
 * @desc    Register a new user
 * @access  Public
 */
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body as UserCreateInput);
  setRefreshCookie(res, result.refreshToken);
  return created(res, { token: result.token, user: result.user }, 'User registered successfully');
});

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 */
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body as UserLoginInput);
  setRefreshCookie(res, result.refreshToken);
  return success(res, { token: result.token, user: result.user }, 'Login successful');
});

/**
 * @route   POST /auth/google
 * @desc    Login or register via Google OAuth
 * @access  Public
 */
export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginWithGoogle((req.body as GoogleAuthInput).idToken);
  setRefreshCookie(res, result.refreshToken);
  return success(res, { token: result.token, user: result.user }, 'Google login successful');
});

/**
 * @route   GET /users/me
 * @desc    Get current user profile
 * @access  Private
 */
export const getCurrentUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const user = await userService.getCurrentUser(userId);
  return success(res, user);
});

/**
 * @route   GET /users
 * @desc    List all users (admin only)
 * @access  Private (Admin)
 */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const filters = UserQuerySchema.parse(req.query);
  const users = await userService.listUsers(filters);
  return success(res, users);
});

/**
 * @route   GET /users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private (Admin)
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id);
  return success(res, user);
});

/**
 * @route   DELETE /users/:id
 * @desc    Delete user (admin only)
 * @access  Private (Admin)
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteUser(req.params.id);
  return success(res, null, 'User deleted successfully');
});

/**
 * @route   PATCH /users/:id/role
 * @desc    Update user role (admin only)
 * @access  Private (Admin)
 */
export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUserRole(req.params.id, (req.body as UserUpdateRoleInput).role);
  return success(res, user, 'User role updated successfully');
});

/**
 * @route   PATCH /users/:id/profile
 * @desc    Update user profile
 * @access  Private (Self or Admin)
 */
export const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
  if (req.userRole !== 'admin' && req.userId !== req.params.id) {
    return forbidden(res, 'Not authorized to update this profile');
  }
  const user = await userService.updateProfile(req.params.id, req.body as UserUpdateProfileInput);
  return success(res, user, 'Profile updated successfully');
});

/**
 * @route   PATCH /users/:id/password
 * @desc    Change user password
 * @access  Private (Self)
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (req.userId !== req.params.id) {
    return forbidden(res, 'Not authorized to change this password');
  }
  const { currentPassword, newPassword } = req.body as UserChangePasswordInput;
  await userService.changePassword(req.params.id, currentPassword, newPassword);
  return success(res, null, 'Password changed successfully');
});

/**
 * @route   POST /auth/password/reset-request
 * @desc    Request password reset (send email)
 * @access  Public
 */
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as PasswordResetRequestInput;
  await authService.requestPasswordReset(email);
  return success(res, null, 'Password reset email sent');
});

/**
 * @route   POST /auth/password/reset
 * @desc    Reset password using token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as PasswordResetApplyInput;
  await authService.resetPassword(token, newPassword);
  return success(res, null, 'Password reset successfully');
});

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies[REFRESH_COOKIE] as string | undefined;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'No refresh token' });
  }

  const result = await authService.refreshTokens(refreshToken);
  setRefreshCookie(res, result.refreshToken);
  return success(res, { token: result.token, user: result.user }, 'Token refreshed successfully');
});

export const logoutUser = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE, { ...REFRESH_COOKIE_OPTIONS, maxAge: undefined });
  return noContent(res);
});
