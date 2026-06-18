// User domain model
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  language: SupportedLanguage;
  isActive: boolean;
  createdAt: Date;
}

export type SupportedLanguage = 'en' | 'es';

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
  language: SupportedLanguage;
  method: 'local' | 'google';
  createdAt: string;
  projectCount?: number;
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
  user: User;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
}
