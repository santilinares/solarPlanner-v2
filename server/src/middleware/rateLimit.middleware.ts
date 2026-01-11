import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/**
 * Rate limiting and slow down middleware
 * Protects against brute-force attacks
 */

/**
 * General API rate limiter
 * Limits to 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits to 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Speed limiter for authentication endpoints
 * Slows down repeated requests before blocking them
 */
export const authSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Start slowing down after 2 requests
  delayMs: () => 500, // Add 500ms delay per request
  maxDelayMs: 5000, // Max delay of 5 seconds
});

/**
 * Password reset rate limiter
 * Limits to 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 requests per hour
  message: 'Too many password reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
