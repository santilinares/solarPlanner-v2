import { UserModel, IUser } from '../models/user.model';
import { ProjectModel } from '../models/project.model';
import { PanelModel } from '../models/panel.model';
import { UserUpdateProfileInput, UserQueryInput } from '../schemas/user.schema';
import { UserResponse, UserListResponse } from '../types/user.types';
import { HydratedDocument } from 'mongoose';
type FilterQuery<_T> = Record<string, any>;
import { emailService } from './email.service';

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

    // Send password changed notification (fire-and-forget)
    const email = user.local?.email;
    if (email) {
      emailService.sendPasswordChangedEmail(email, user.fullName).catch((err: unknown) => {
        console.error('Failed to send password changed email:', err);
      });
    }
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

    const page: number = filters.page ?? 1;
    const limit: number = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    type UserWithCount = IUser & { _id: import('mongoose').Types.ObjectId; projectCount: number };
    type FacetResult = { data: UserWithCount[]; totalCount: { count: number }[] };

    const raw = await UserModel.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: 'owner',
          as: '_projects',
        },
      },
      { $addFields: { projectCount: { $size: '$_projects' } } },
      { $project: { _projects: 0 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const facet = raw[0] as FacetResult;
    const total = facet.totalCount[0]?.count ?? 0;

    return {
      users: facet.data.map((u) => ({
        _id: u._id.toString(),
        fullName: u.fullName,
        email: u.method === 'local' ? u.local?.email : u.google?.email,
        role: u.role,
        method: u.method,
        createdAt: u.createdAt.toISOString(),
        projectCount: u.projectCount,
      })),
      total,
      page,
      limit,
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

    await ProjectModel.deleteMany({ owner: userId });
    await PanelModel.deleteMany({ owner: userId, type: 'personal' });
    await UserModel.findByIdAndDelete(userId);
  }

  /**
   * Get current user profile
   * @param userId User ID from JWT
   * @returns User profile
   */
  async getCurrentUser(userId: string): Promise<UserResponse> {
    return this.getUserById(userId);
  }

  /**
   * Update user role (admin only)
   * @param userId User ID
   * @param role New role
   * @returns Updated user data
   */
  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<UserResponse> {
    const user = await UserModel.findByIdAndUpdate(userId, { role }, { new: true });

    if (!user) {
      throw new Error('User not found');
    }

    return this.transformUserToResponse(user);
  }
}

export const userService = new UserService();
