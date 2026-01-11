import { Router } from 'express';
import {
  getCurrentUserProfile,
  listUsers,
  getUserById,
  deleteUser,
  updateUserProfile,
  changePassword,
} from '../controllers/user.controller';
import {
  verifyUserJwtToken,
  verifyAdminJwtToken,
} from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  UserUpdateProfileSchema,
  UserChangePasswordSchema,
  UserQuerySchema,
} from '../schemas/user.schema';

const router = Router();

/**
 * User profile routes (mounted at /api/users)
 */

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', verifyUserJwtToken, getCurrentUserProfile);

/**
 * @route   PATCH /api/users/:id/profile
 * @desc    Update user profile
 * @access  Private (Self or Admin)
 */
router.patch(
  '/:id/profile',
  verifyUserJwtToken,
  validateBody(UserUpdateProfileSchema),
  updateUserProfile
);

/**
 * @route   PATCH /api/users/:id/password
 * @desc    Change user password
 * @access  Private (Self)
 */
router.patch(
  '/:id/password',
  verifyUserJwtToken,
  validateBody(UserChangePasswordSchema),
  changePassword
);

/**
 * Admin user management routes (mounted at /api/users)
 */

/**
 * @route   GET /api/users
 * @desc    List all users (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/',
  verifyAdminJwtToken,
  validateQuery(UserQuerySchema),
  listUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private (Admin)
 */
router.get('/:id', verifyAdminJwtToken, getUserById);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', verifyAdminJwtToken, deleteUser);

export default router;
