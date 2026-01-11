/**
 * User-related TypeScript type definitions
 */

export interface UserResponse {
  _id: string;
  fullName: string;
  email?: string;
  role: 'user' | 'admin';
  method: 'local' | 'google';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface UserListResponse {
  users: UserResponse[];
  total: number;
  page?: number;
  limit?: number;
}
