import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validateQuery } from '../../middleware/validation.middleware';

function makeResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

describe('validation middleware', () => {
  describe('validateQuery', () => {
    it('replaces an Express 5 accessor query with parsed values', () => {
      const req = {};
      Object.defineProperty(req, 'query', {
        get: () => ({ page: '2', limit: '15' }),
        configurable: true,
        enumerable: true,
      });
      const res = makeResponse();
      const next = vi.fn();
      const schema = z.object({
        page: z.coerce.number().int().positive(),
        limit: z.coerce.number().int().positive(),
      });

      validateQuery(schema)(req as never, res as never, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect((req as { query: unknown }).query).toEqual({ page: 2, limit: 15 });
    });

    it('returns validation details for invalid query values', () => {
      const req = { query: { page: '0' } };
      const res = makeResponse();
      const next = vi.fn();
      const schema = z.object({
        page: z.coerce.number().int().positive(),
      });

      validateQuery(schema)(req as never, res as never, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: [
            expect.objectContaining({
              field: 'page',
            }),
          ],
        })
      );
    });
  });
});
