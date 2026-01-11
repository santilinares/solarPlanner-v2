import { UserModel, IUser } from '../models/user.model';
import { UserUpdateProfileInput, UserQueryInput } from '../schemas/user.schema';
import { UserResponse, UserListResponse } from '../types/user.types';
import { FilterQuery, HydratedDocument } from 'mongoose';

/**
 * User Service
 * Handles user profile management and admin operations
 */

export class UserService {
  /**
   * Transform user document to response format
   * @param user User document
   * @returns User response
   */
  private transformUserToResponse(user: HydratedDocument<IUser>): UserResponse {
    const email = user.method === 'local' ? user.local?.email : user.google?.email;
    
    return {
      _id: user._id.toString(),
      fullName: user.fullName,
      email,
      role: user.role,
      method: user.method,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Get user profile by ID
   * @param userId User ID
   * @returns User data
   */
  async getUserById(userId: string): Promise<UserResponse> {
    const user = await UserModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return this.transformUserToResponse(user);
  }

  /**
   * Update user profile
   * @param userId User ID
   * @param data Profile update data
   * @returns Updated user data
   */
  async updateProfile(userId: string, data: UserUpdateProfileInput): Promise<UserResponse> {
    const user = await UserModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    user.fullName = data.fullName;
    await user.save();

    return this.transformUserToResponse(user);
  }

  /**
   * Change user password
   * @param userId User ID
   * @param currentPassword Current password
   * @param newPassword New password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await UserModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.method !== 'local') {
      throw new Error('Password change not available for this authentication method');
    }

    // Verify current password
    const isValidPassword = await user.verifyPassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Update password (pre-save hook will hash it)
    if (user.local) {
      user.local.password = newPassword;
    }
    await user.save();
  }

  /**
   * List all users (admin only)
   * @param filters Query filters
   * @returns List of users
   */
  async listUsers(filters: UserQueryInput): Promise<UserListResponse> {
    const query: FilterQuery<IUser> = {};

    // Filter by role
    if (filters.role) {
      query.role = filters.role;
    }

    // Filter by email
    if (filters.email) {
      query.$or = [
        { 'local.email': filters.email },
        { 'google.email': filters.email },
      ];
    }

    // Search by name or email
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { fullName: searchRegex },
        { 'local.email': searchRegex },
        { 'google.email': searchRegex },
      ];
    }

    const users = await UserModel.find(query).sort({ createdAt: -1 });
    const total = await UserModel.countDocuments(query);

    return {
      users: users.map((user) => this.transformUserToResponse(user)),
      total,
    };
  }

  /**
   * Delete user (admin only)
   * @param userId User ID to delete
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await UserModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    await UserModel.findByIdAndDelete(userId);
    // TODO: Consider cascading delete for associated projects and panels
  }

  /**
   * Get current user profile
   * @param userId User ID from JWT
   * @returns User profile
   */
  async getCurrentUser(userId: string): Promise<UserResponse> {
    return this.getUserById(userId);
  }
}

export const userService = new UserService();
