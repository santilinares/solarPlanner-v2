import { z } from 'zod';

/**
 * Cultivar validation schemas (Zod)
 */

export const CultivarCreateSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    category: z.enum(['cereal', 'vegetable', 'fruit', 'legume', 'other']),
    minPanelHeight: z.number().nonnegative(),
    maxPanelHeight: z.number().nonnegative(),
    lightRequirement: z.enum(['full-sun', 'partial-shade', 'shade-tolerant']),
    recommendedSpacing: z.number().positive(),
    optimalTiltReduction: z.number().min(0).max(45),
    notes: z.string().optional(),
  })
  .refine((d) => d.maxPanelHeight >= d.minPanelHeight, {
    message: 'maxPanelHeight must be >= minPanelHeight',
    path: ['maxPanelHeight'],
  });

export type CultivarCreateInput = z.infer<typeof CultivarCreateSchema>;

export const CultivarUpdateSchema = z
  .object({
    name: z.string().min(2).optional(),
    category: z.enum(['cereal', 'vegetable', 'fruit', 'legume', 'other']).optional(),
    minPanelHeight: z.number().nonnegative().optional(),
    maxPanelHeight: z.number().nonnegative().optional(),
    lightRequirement: z.enum(['full-sun', 'partial-shade', 'shade-tolerant']).optional(),
    recommendedSpacing: z.number().positive().optional(),
    optimalTiltReduction: z.number().min(0).max(45).optional(),
    notes: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.minPanelHeight !== undefined && d.maxPanelHeight !== undefined) {
        return d.maxPanelHeight >= d.minPanelHeight;
      }
      return true;
    },
    {
      message: 'maxPanelHeight must be >= minPanelHeight',
      path: ['maxPanelHeight'],
    }
  );

export type CultivarUpdateInput = z.infer<typeof CultivarUpdateSchema>;

export const CultivarQuerySchema = z.object({
  category: z.enum(['cereal', 'vegetable', 'fruit', 'legume', 'other']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CultivarQueryInput = z.infer<typeof CultivarQuerySchema>;
