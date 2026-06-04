import { z } from 'zod';
import { ProductionPointSchema } from './production.schema';

/**
 * Solar project validation schemas
 */

// Geographic coordinate point
export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export type GeoPointInput = z.infer<typeof GeoPointSchema>;

// Create project
export const ProjectCreateSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  area: z
    .array(GeoPointSchema)
    .min(3, 'Area polygon requires at least 3 points')
    .max(1000, 'Area polygon cannot exceed 1000 points'),
  tilt: z.number().min(0).max(90, 'Tilt must be between 0 and 90 degrees'),
  direction: z.string().min(1, 'Direction is required (e.g., "south")'),
  azimuth: z.number().min(0).max(360).optional(),
  rawSpacing: z.number().positive().optional(),
  panelNumber: z.number().int().positive('Panel number must be a positive integer'),
  panelId: z.string().optional(), // Reference to Panel document
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  price: z.number().nonnegative().optional(),
});

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

// Update project (partial fields)
export const ProjectUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  area: z.array(GeoPointSchema).min(3).optional(),
  tilt: z.number().min(0).max(90).optional(),
  direction: z.string().min(1).optional(),
  azimuth: z.number().min(0).max(360).optional(),
  rawSpacing: z.number().positive().optional(),
  panelNumber: z.number().int().positive().optional(),
  panelId: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  price: z.number().nonnegative().optional(),
});

export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;

// Project query filters
export const ProjectQuerySchema = z.object({
  id: z.string().optional(), // Single project ID shortcut
  owner: z.string().optional(), // User ID
  country: z.string().optional(),
  from: z.coerce.date().optional(), // Filter by install date range
  to: z.coerce.date().optional(),
  search: z.string().optional(), // Search by name
});

export type ProjectQueryInput = z.infer<typeof ProjectQuerySchema>;

// Optimal configuration calculation
export const OptimalConfigSchema = z.object({
  surfaceArea: z.number().positive(),
  panelWidth: z.number().positive(),
  panelHeight: z.number().positive(),
  tilt: z.number().min(0).max(90),
  latitude: z.number().min(-90).max(90),
});

export type OptimalConfigInput = z.infer<typeof OptimalConfigSchema>;

// Update production data
export const UpdateProductionSchema = z.object({
  prodToday: z.array(ProductionPointSchema).optional(),
  nextProd: z.array(ProductionPointSchema).optional(),
  previousProd: z.array(ProductionPointSchema).optional(),
});

export type UpdateProductionInput = z.infer<typeof UpdateProductionSchema>;
