import { OAuth2Client } from 'google-auth-library';
import { UserModel, IUser } from '../models/user.model';
import { UserCreateInput, UserLoginInput } from '../schemas/user.schema';
import { AuthResponse, UserResponse } from '../types/user.types';
import {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  verifyRefreshToken,
} from '../config/jwt.config';
import { emailService } from './email.service';
import { HydratedDocument } from 'mongoose';
import { AppError } from '../middleware/error.middleware';

/**
 * Authentication Service
 * Handles user registration, login, and password reset
 */

export class AuthService {
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
      language: user.language ?? 'en',
      method: user.method,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Register a new user (local method)
   * @param data User registration data
   * @returns Auth response with token and user
   */
  async register(data: UserCreateInput): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await UserModel.findOne({ 'local.email': data.email });
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = await UserModel.create({
      method: 'local',
      local: {
        email: data.email,
        password: data.password,
      },
      fullName: data.fullName,
      role: 'user',
    });

    // Send welcome email (fire-and-forget)
    emailService.sendWelcomeEmail(data.email, data.fullName).catch((err: unknown) => {
      console.error('Failed to send welcome email:', err);
    });

    // Generate JWT token
    const token = user.generateJwt();
    const refreshToken = user.generateRefreshToken();

    return {
      token,
      refreshToken,
      user: this.transformUserToResponse(user),
    };
  }

  /**
   * Login user with email and password
   * @param data User login credentials
   * @returns Auth response with token and user
   */
  async login(data: UserLoginInput): Promise<AuthResponse> {
    // Find user by email
    const user = await UserModel.findOne({ 'local.email': data.email });

    if (!user || user.method !== 'local') {
      throw new AppError(401, 'Invalid email or password');
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(data.password);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Generate JWT token
    const token = user.generateJwt();
    const refreshToken = user.generateRefreshToken();

    return {
      token,
      refreshToken,
      user: this.transformUserToResponse(user),
    };
  }

  /**
   * Request password reset (send email with token)
   * @param email User email
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Find user by email
    const user = await UserModel.findOne({ 'local.email': email });

    if (!user || user.method !== 'local') {
      // Don't reveal if email exists or not for security
      return;
    }

    // Generate password reset token (valid for 1 hour)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const resetToken = generatePasswordResetToken(user._id.toString(), secret);

    // Send password reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await emailService.sendPasswordResetEmail(email, resetUrl);
  }

  /**
   * Reset password using token
   * @param token Reset token
   * @param newPassword New password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Verify reset token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    let userId: string;
    try {
      userId = verifyPasswordResetToken(token, secret);
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }

    // Find user by ID
    const user = await UserModel.findById(userId);
    if (!user || user.method !== 'local') {
      throw new Error('User not found');
    }

    // Update password (pre-save hook will hash it)
    if (user.local) {
      user.local.password = newPassword;
    }
    await user.save();
  }

  /**
   * Verify JWT token and return user
   * @param userId User ID from token
   * @returns User document
   */
  async verifyUser(userId: string): Promise<HydratedDocument<IUser>> {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Login or register a user via Google OAuth
   * @param idToken Google ID token from frontend
   * @returns Auth response with token and user
   */
  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID not configured');
    }

    // Verify the Google ID token
    const client = new OAuth2Client(clientId);
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new AppError(401, 'Invalid Google token');
    }

    if (!payload?.sub || !payload?.email) {
      throw new AppError(401, 'Invalid Google token payload');
    }

    // Find existing Google user by stable googleId
    let user = await UserModel.findOne({ 'google.googleId': payload.sub });

    if (!user) {
      // Guard: block if email is already registered as a local account
      const localUser = await UserModel.findOne({ 'local.email': payload.email });
      if (localUser) {
        throw new AppError(
          409,
          'An account with this email already exists. Please sign in with email and password.'
        );
      }

      // Create new Google-authenticated user
      user = await UserModel.create({
        method: 'google',
        google: { googleId: payload.sub, email: payload.email },
        fullName: payload.name ?? payload.email,
        role: 'user',
      });
    }

    return {
      token: user.generateJwt(),
      refreshToken: user.generateRefreshToken(),
      user: this.transformUserToResponse(user),
    };
  }

  /**
   * Refresh access and refresh tokens
   * @param refreshToken Refresh token from client
   * @returns New tokens and user
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    if (!refreshSecret) {
      throw new Error('REFRESH_TOKEN_SECRET not configured');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken, refreshSecret);
    } catch (error) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Find user by ID
    const user = await UserModel.findById(decoded._id);
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    // Generate new tokens
    const newToken = user.generateJwt();
    const newRefreshToken = user.generateRefreshToken();

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      user: this.transformUserToResponse(user),
    };
  }
}

export const authService = new AuthService();
