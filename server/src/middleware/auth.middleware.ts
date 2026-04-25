import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt.config';
import { unauthorized, forbidden } from '../utils/response';

/**
 * Authentication middleware
 * Verifies JWT tokens and attaches user information to request
 */

/**
 * Extract JWT token from Authorization header
 * @param req Express request
 * @returns JWT token or null
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Basic JWT verification middleware
 * Verifies token and attaches userId and userRole to request
 */
export function verifyJwtToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  
  if (!token) {
    unauthorized(res, 'No token provided');
    return;
  }
  
  try {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    const decoded = verifyToken(token, secret);
    
    // Attach user info to request
    req.userId = decoded._id;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      unauthorized(res, 'Token expired');
    } else if (error instanceof Error && error.name === 'JsonWebTokenError') {
      unauthorized(res, 'Invalid token');
    } else {
      forbidden(res, 'Authentication failed');
    }
  }
}

/**
 * Verify JWT token and ensure user has 'user' role
 */
export function verifyUserJwtToken(req: Request, res: Response, next: NextFunction): void {
  verifyJwtToken(req, res, () => {
    if (req.userRole === 'user' || req.userRole === 'admin') {
      next();
    } else {
      forbidden(res, 'User access required');
    }
  });
}

/**
 * Verify JWT token and ensure user has 'admin' role
 */
export function verifyAdminJwtToken(req: Request, res: Response, next: NextFunction): void {
  verifyJwtToken(req, res, () => {
    if (req.userRole === 'admin') {
      next();
    } else {
      forbidden(res, 'Admin access required');
    }
  });
}

/**
 * Verify password reset token
 * Used for password reset endpoints
 */
export function verifyPasswordResetJwtToken(req: Request, res: Response, next: NextFunction): void {
  // TODO - [SEVERIDAD MEDIA] Este middleware no verifica el JWT en ningún momento.
  // El try/catch no contiene código que pueda lanzar, por lo que siempre llama a next().
  // Solo comprueba que el campo token existe en el body, dando una falsa sensación de seguridad.
  // La verificación real ocurre en el servicio, pero debería hacerse aquí para rechazar tokens
  // inválidos antes de llegar al handler. Usar verifyPasswordResetToken() de jwt.config.ts.
  const { token } = req.body;

  if (!token) {
    unauthorized(res, 'Reset token required');
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Token verification happens in service layer for password reset
    // This middleware just ensures token is present
    next();
  } catch (error) {
    unauthorized(res, 'Invalid reset token');
  }
}
