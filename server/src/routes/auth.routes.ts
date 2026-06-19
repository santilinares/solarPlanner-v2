import { Router } from 'express';
import {
  registerUser,
  loginUser,
  googleAuth,
  requestPasswordReset,
  resetPassword,
  refreshAccessToken,
  logoutUser,
} from '../controllers/user.controller';
import { validateBody } from '../middleware/validation.middleware';
import {
  UserCreateSchema,
  UserLoginSchema,
  GoogleAuthSchema,
  PasswordResetRequestSchema,
  PasswordResetApplySchema,
} from '../schemas/user.schema';
import {
  authLimiter,
  authSpeedLimiter,
  passwordResetLimiter,
} from '../middleware/rateLimit.middleware';
import { verifyPasswordResetJwtToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * Authentication routes (mounted at /api/auth)
 */

/**
 * @route   POST /api/auth/google
 * @desc    Login or register via Google OAuth
 * @access  Public
 */
router.post('/google', authLimiter, validateBody(GoogleAuthSchema), googleAuth);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  authSpeedLimiter,
  validateBody(UserCreateSchema),
  registerUser
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, authSpeedLimiter, validateBody(UserLoginSchema), loginUser);

/**
 * @route   POST /api/auth/password/reset-request
 * @desc    Request password reset (send email)
 * @access  Public
 */
router.post(
  '/password/reset-request',
  passwordResetLimiter,
  validateBody(PasswordResetRequestSchema),
  requestPasswordReset
);

/**
 * @route   POST /api/auth/password/reset
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/password/reset', verifyPasswordResetJwtToken, validateBody(PasswordResetApplySchema), resetPassword);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token (reads refreshToken from HttpOnly cookie)
 * @access  Public
 */
router.post('/refresh', refreshAccessToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout — clears the refreshToken HttpOnly cookie
 * @access  Public
 */
router.post('/logout', logoutUser);

export default router;
