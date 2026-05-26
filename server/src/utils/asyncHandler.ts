import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper for Express route handlers.
 * Sync handlers are also accepted; Express already catches sync throws.
 *
 * @param fn Route handler function (sync or async)
 * @returns Express middleware function
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => unknown
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
