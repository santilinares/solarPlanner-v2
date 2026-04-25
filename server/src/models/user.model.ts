import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateToken, generateRefreshToken } from '../config/jwt.config';

/**
 * User model with authentication methods
 */

// User data interface
export interface IUser {
  method: 'local' | 'google';
  local?: {
    email?: string;
    password?: string;
  };
  google?: {
    googleId?: string;
    email?: string;
  };
  fullName: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// User instance methods interface
export interface IUserMethods {
  verifyPassword(password: string): Promise<boolean>;
  generateJwt(): string;
  generateRefreshToken(): string;
}

// User model type (combines data and methods).
// Record<string, never> is used to indicate no query helpers are defined.
export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

const UserSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    method: {
      type: String,
      enum: ['local', 'google'],
      required: true,
    },
    local: {
      email: {
        type: String,
        lowercase: true,
        sparse: true,
        unique: true,
      },
      password: String,
    },
    google: {
      googleId: {
        type: String,
        sparse: true,
      },
      email: {
        type: String,
        lowercase: true,
        sparse: true,
      },
    },
    fullName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
UserSchema.index({ role: 1 });

/**
 * Hash password before saving
 */
UserSchema.pre('save', async function (next) {
  if (!this.isModified('local.password') || !this.local?.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.local.password = await bcrypt.hash(this.local.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Verify password for local authentication
 */
UserSchema.method('verifyPassword', async function (password: string): Promise<boolean> {
  if (this.method !== 'local' || !this.local?.password) {
    throw new Error('Password verification not available for this auth method');
  }
  return bcrypt.compare(password, this.local.password);
});

/**
 * Generate JWT token for user
 */
UserSchema.method('generateJwt', function (): string {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXP || '24h';

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return generateToken(
    {
      _id: this._id.toString(),
      role: this.role,
    },
    secret,
    expiresIn
  );
});

/**
 * Generate refresh token for user
 */
UserSchema.method('generateRefreshToken', function (): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  const expiresIn = process.env.REFRESH_TOKEN_EXP || '7d';

  if (!secret) {
    throw new Error('REFRESH_TOKEN_SECRET not configured');
  }

  return generateRefreshToken(
    {
      _id: this._id.toString(),
      role: this.role,
    },
    secret,
    expiresIn
  );
});

export const UserModel = mongoose.model<IUser, UserModel>('Users', UserSchema);
