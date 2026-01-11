import jwt from 'jsonwebtoken';

/**
 * JWT configuration and helper functions
 */

export interface JwtPayload {
  _id: string;
  role: 'user' | 'admin';
}

/**
 * Generate JWT access token
 * @param payload Token payload containing user ID and role
 * @param secret JWT secret key
 * @param expiresIn Token expiration time
 * @returns Signed JWT token
 */
export function generateToken(
  payload: JwtPayload,
  secret: string,
  expiresIn: string
): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Verify and decode JWT token
 * @param token JWT token to verify
 * @param secret JWT secret key
 * @returns Decoded token payload
 */
export function verifyToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

/**
 * Generate password reset token
 * @param userId User ID
 * @param secret JWT secret key
 * @returns Password reset token (valid for 1 hour)
 */
export function generatePasswordResetToken(userId: string, secret: string): string {
  return jwt.sign({ _id: userId, type: 'password-reset' }, secret, { expiresIn: '1h' });
}

/**
 * Verify password reset token
 * @param token Password reset token
 * @param secret JWT secret key
 * @returns User ID from token
 */
export function verifyPasswordResetToken(token: string, secret: string): string {
  const decoded = jwt.verify(token, secret) as { _id: string; type: string };
  if (decoded.type !== 'password-reset') {
    throw new Error('Invalid token type');
  }
  return decoded._id;
}
