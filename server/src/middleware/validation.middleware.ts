/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { fail } from '../utils/response';

/**
 * Validation middleware factory using Zod schemas
 */

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Create validation middleware for Zod schema
 * @param schema Zod schema to validate against
 * @param target Request property to validate (body, query, or params)
 * @returns Express middleware function
 */
export function zValidate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate the target property
      const validated = schema.parse(req[target]);
      
      // Replace original data with validated/transformed data
      req[target] = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        fail(res, 'Validation failed', 400, errors);
      } else {
        fail(res, 'Validation error', 400);
      }
    }
  };
}

/**
 * Validate request body
 * @param schema Zod schema
 */
export const validateBody = (schema: ZodSchema) => zValidate(schema, 'body');

/**
 * Validate request query parameters
 * @param schema Zod schema
 */
export const validateQuery = (schema: ZodSchema) => zValidate(schema, 'query');

/**
 * Validate request path parameters
 * @param schema Zod schema
 */
export const validateParams = (schema: ZodSchema) => zValidate(schema, 'params');
