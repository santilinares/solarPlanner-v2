/**
 * Express Request type augmentation
 * Extends the Express Request interface to include custom properties
 */

declare global {
  namespace Express {
    interface Request {
      userId?: string; // Authenticated user ID from JWT
      userRole?: 'user' | 'admin'; // User role from JWT
    }
  }
}

export {};
