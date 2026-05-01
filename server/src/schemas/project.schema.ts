import { z } from 'zod';
import { ProductionPointSchema } from './production.schema';

/**
 * Solar project validation schemas
 */

/**
 * Geographic coordinate point schema
 *
 * Represents a latitude/longitude coordinate:
 * - lat: Latitude (-90 to 90)
 * - lon: Longitude (-180 to 180)
 *
 * @example
 * ```json
 * { "lat": 40.7128, "lon": -74.0060 }
 * ```
 */
export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

/** Type inferred from GeoPointSchema - geographic coordinate point */
export type GeoPointInput = z.infer<typeof GeoPointSchema>;

const SystemLossesZodSchema = z.object({
  inverterEfficiency: z.number().min(0).max(1).optional(),
  dcWiring:           z.number().min(0).max(100).optional(),
  acWiring:           z.number().min(0).max(100).optional(),
  mismatch:           z.number().min(0).max(100).optional(),
  soiling:            z.number().min(0).max(100).optional(),
  degradationExtra:   z.number().min(0).max(100).optional(),
  shadingStatic:      z.number().min(0).max(100).optional(),
}).optional();

/**
 * Project creation schema
 *
 * Validates solar project data:
 * - name: Minimum 2 characters
 * - area: Polygon with 3-1000 coordinate points
 * - tilt: Panel angle 0-90 degrees
 * - direction: Cardinal direction (e.g., "south")
 * - rawSpacing: Optional spacing between panels (positive number)
 * - panelNumber: Number of panels (positive integer)
 * - panelId: Optional reference to Panel document
 *
 * @example
 * ```json
 * {
 *   "name": "Rooftop Solar Array",
 *   "area": [
 *     {"lat": 40.7128, "lon": -74.0060},
 *     {"lat": 40.7129, "lon": -74.0061},
 *     {"lat": 40.7130, "lon": -74.0059}
 *   ],
 *   "tilt": 30,
 *   "direction": "south",
 *   "panelNumber": 20
 * }
 * ```
 */
export const ProjectCreateSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().max(500).optional(),
  projectType: z.enum(['roof', 'agrivoltaic']),
  area: z
    .array(GeoPointSchema)
    .min(3, 'Area polygon requires at least 3 points')
    .max(1000, 'Area polygon cannot exceed 1000 points'),
  tilt: z.number().min(0).max(90, 'Tilt must be between 0 and 90 degrees'),
  // TODO - [SEVERIDAD BAJA] direction acepta cualquier string sin validar que sea una dirección cardinal válida.
  // Considerar usar z.enum(['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'])
  direction: z.string().min(1, 'Direction is required (e.g., "south")'),
  rawSpacing: z.number().positive().optional(),
  panelNumber: z.number().int().positive('Panel number must be a positive integer'),
  // TODO - [SEVERIDAD BAJA] panelId y cultivarId aceptan cualquier string sin validar formato ObjectId.
  // Si se envía un valor inválido, Mongoose lanza un CastError. Hay un ObjectIdSchema definido en user.schema.ts
  // que podría reutilizarse aquí: panelId: ObjectIdSchema.optional()
  panelId: z.string().optional(), // Reference to Panel document
  cultivarId: z.string().optional(), // Reference to Cultivar document (agrivoltaic only)
  systemLosses: SystemLossesZodSchema,
});

/** Type inferred from ProjectCreateSchema - used for creating solar projects */
export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

/**
 * Project update schema
 *
 * Allows partial updates to project data (all fields optional):
 * - name, area, tilt, direction, azimuth
 * - rawSpacing, panelNumber, panelId
 * - country, timezone, currency, price
 */
export const ProjectUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().max(500).optional(),
  projectType: z.enum(['roof', 'agrivoltaic']).optional(),
  area: z.array(GeoPointSchema).min(3).optional(),
  tilt: z.number().min(0).max(90).optional(),
  direction: z.string().min(1).optional(),
  azimuth: z.number().min(0).max(360).optional(),
  rawSpacing: z.number().positive().optional(),
  panelNumber: z.number().int().positive().optional(),
  panelId: z.string().optional(),
  cultivarId: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  price: z.number().nonnegative().optional(),
  systemLosses: SystemLossesZodSchema,
});

/** Type inferred from ProjectUpdateSchema - used for updating solar projects */
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;

/**
 * Project query filters schema
 *
 * Optional filters for listing/searching projects:
 * - id: Single project ID for direct lookup
 * - owner: Filter by user ID
 * - country: Filter by country
 * - from/to: Filter by installation date range
 * - search: Search by project name
 * - page: Pagination page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 */
export const ProjectQuerySchema = z.object({
  id: z.string().optional(), // Single project ID shortcut
  owner: z.string().optional(), // User ID
  country: z.string().optional(),
  from: z.coerce.date().optional(), // Filter by install date range
  to: z.coerce.date().optional(),
  search: z.string().optional(), // Search by name
  projectType: z.enum(['roof', 'agrivoltaic']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

/** Type inferred from ProjectQuerySchema - used for querying/filtering projects */
export type ProjectQueryInput = z.infer<typeof ProjectQuerySchema>;

/**
 * Optimal configuration calculation schema
 *
 * Input parameters for calculating optimal panel configuration:
 * - surfaceArea: Available surface area (positive number)
 * - panelWidth: Panel width in meters
 * - panelHeight: Panel height in meters
 * - tilt: Panel tilt angle 0-90 degrees
 * - latitude: Location latitude -90 to 90
 */
export const OptimalConfigSchema = z.object({
  surfaceArea: z.number().positive(),
  panelWidth: z.number().positive(),
  panelHeight: z.number().positive(),
  tilt: z.number().min(0).max(90),
  latitude: z.number().min(-90).max(90),
  wattPeak: z.number().positive().optional(),
});

/** Type inferred from OptimalConfigSchema - used for optimal configuration calculations */
export type OptimalConfigInput = z.infer<typeof OptimalConfigSchema>;

/**
 * Production data update schema
 *
 * Updates production time series data (all fields optional):
 * - prodToday: Today's production data points
 * - nextProd: Forecasted production data
 * - previousProd: Historical production data
 */
export const UpdateProductionSchema = z.object({
  prodToday: z.array(ProductionPointSchema).optional(),
  nextProd: z.array(ProductionPointSchema).optional(),
  previousProd: z.array(ProductionPointSchema).optional(),
});

/** Type inferred from UpdateProductionSchema - used for updating production data */
export type UpdateProductionInput = z.infer<typeof UpdateProductionSchema>;

/**
 * Optimal configuration from polygon schema
 *
 * Input parameters for calculating optimal panel configuration from a drawn polygon:
 * - area: Polygon coordinates
 * - panelId: ID of the selected panel
 * - tilt: Panel tilt angle 0-90 degrees
 */
export const OptimalConfigFromPolygonSchema = z.object({
  area: z.array(GeoPointSchema).min(3),
  panelId: z.string(),
  tilt: z.number().min(0).max(90),
});

/** Type inferred from OptimalConfigFromPolygonSchema */
export type OptimalConfigFromPolygonInput = z.infer<typeof OptimalConfigFromPolygonSchema>;

/**
 * Visitor quick estimate schema
 *
 * Unauthenticated polygon-based panel count estimate.
 * Uses fixed panel size (2m × 4m) and 2m row spacing.
 */
export const EstimateSchema = z.object({
  area: z
    .array(GeoPointSchema)
    .min(3, 'Area polygon requires at least 3 points')
    .max(1000, 'Area polygon cannot exceed 1000 points'),
});

/** Type inferred from EstimateSchema */
export type EstimateInput = z.infer<typeof EstimateSchema>;
