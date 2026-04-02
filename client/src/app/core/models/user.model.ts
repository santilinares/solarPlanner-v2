// User domain model
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/** Matches the server UserResponse shape exactly */
export interface UserResponse {
  _id: string;
  fullName: string;
  email?: string;
  role: 'user' | 'admin';
  method: 'local' | 'google';
  createdAt: string;
}

export interface UserListResponse {
  users: UserResponse[];
  total: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
}
