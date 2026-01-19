import { Router } from 'express';
import {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  refreshAccessToken,
} from '../controllers/user.controller';
import { validateBody } from '../middleware/validation.middleware';
import {
  UserCreateSchema,
  UserLoginSchema,
  PasswordResetRequestSchema,
  PasswordResetApplySchema,
} from '../schemas/user.schema';
import {
  authLimiter,
  authSpeedLimiter,
  passwordResetLimiter,
} from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * Authentication routes (mounted at /api/auth)
 */

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
router.post('/password/reset', validateBody(PasswordResetApplySchema), resetPassword);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshAccessToken);

export default router;
