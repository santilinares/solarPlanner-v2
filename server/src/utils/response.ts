import { Response } from 'express';

/**
 * Standard API response helpers
 * Ensures consistent response format across the application
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  timestamp?: string;
}

/**
 * Send success response
 * @param res Express response object
 * @param data Response data
 * @param message Optional success message
 * @param statusCode HTTP status code (default: 200)
 */
export function success<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send error response
 * @param res Express response object
 * @param message Error message
 * @param statusCode HTTP status code (default: 400)
 * @param errors Optional error details
 */
export function fail(
  res: Response,
  message: string,
  statusCode: number = 400,
  errors?: any[]
): Response {
  const response: ApiResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send created response (201)
 * @param res Express response object
 * @param data Created resource data
 * @param message Optional success message
 */
export function created<T>(res: Response, data: T, message?: string): Response {
  return success(res, data, message || 'Resource created successfully', 201);
}

/**
 * Send no content response (204)
 * @param res Express response object
 */
export function noContent(res: Response): void {
  res.status(204).end();
}

/**
 * Send unauthorized response (401)
 * @param res Express response object
 * @param message Optional error message
 */
export function unauthorized(res: Response, message?: string): Response {
  return fail(res, message || 'Unauthorized', 401);
}

/**
 * Send forbidden response (403)
 * @param res Express response object
 * @param message Optional error message
 */
export function forbidden(res: Response, message?: string): Response {
  return fail(res, message || 'Forbidden', 403);
}

/**
 * Send not found response (404)
 * @param res Express response object
 * @param message Optional error message
 */
export function notFound(res: Response, message?: string): Response {
  return fail(res, message || 'Resource not found', 404);
}

/**
 * Send internal server error response (500)
 * @param res Express response object
 * @param message Optional error message
 */
export function serverError(res: Response, message?: string): Response {
  return fail(res, message || 'Internal server error', 500);
}
