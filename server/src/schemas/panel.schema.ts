import { z } from 'zod';

/**
 * Solar panel validation schemas
 */

// Panel technology types
export const PanelTechnologyEnum = z.enum([
  'Monocrystalline',
  'Polycrystalline',
  'Thin film',
]);

// Panel type (global vs personal)
export const PanelTypeEnum = z.enum(['global', 'personal']);

// Create panel
export const PanelCreateSchema = z.object({
  name: z.string().min(2, 'Panel name must be at least 2 characters'),
  capacity: z.number().positive('Capacity must be positive (in Watts)'),
  height: z.number().positive('Height must be positive (in meters)'),
  width: z.number().positive('Width must be positive (in meters)'),
  technology: PanelTechnologyEnum,
  type: PanelTypeEnum,
});

export type PanelCreateInput = z.infer<typeof PanelCreateSchema>;

// Update panel (all fields optional)
export const PanelUpdateSchema = PanelCreateSchema.partial();

export type PanelUpdateInput = z.infer<typeof PanelUpdateSchema>;

// Panel query filters
export const PanelQuerySchema = z.object({
  id: z.string().optional(), // Single panel ID shortcut
  type: PanelTypeEnum.optional(),
  owner: z.string().optional(), // User ID
  technology: PanelTechnologyEnum.optional(),
  search: z.string().optional(), // Search by name
});

export type PanelQueryInput = z.infer<typeof PanelQuerySchema>;
