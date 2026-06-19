import { z } from 'zod';

/**
 * Solar panel validation schemas
 */

/**
 * Solar panel technology types
 * @enum {string}
 * @property Monocrystalline - High efficiency, single crystal silicon
 * @property Polycrystalline - Lower cost, multiple crystal silicon
 * @property Thin film - Lightweight, flexible panels
 */
export const PanelTechnologyEnum = z.enum(['Monocrystalline', 'Polycrystalline', 'Thin film']);

/**
 * Panel ownership type
 * @enum {string}
 * @property global - Shared panels available to all users
 * @property personal - User-specific custom panels
 */
export const PanelTypeEnum = z.enum(['global', 'personal']);

/**
 * Panel creation schema
 *
 * Validates solar panel specifications:
 * - name: Minimum 2 characters
 * - capacity: Positive number in Watts
 * - height: Positive number in meters
 * - width: Positive number in meters
 * - technology: Panel technology type
 * - type: Global or personal panel
 *
 * @example
 * ```json
 * {
 *   "name": "High Efficiency 400W",
 *   "capacity": 400,
 *   "height": 1.8,
 *   "width": 1.0,
 *   "technology": "Monocrystalline",
 *   "type": "personal"
 * }
 * ```
 */
export const PanelCreateSchema = z.object({
  brand: z.string().min(2, 'Brand must be at least 2 characters'),
  model: z.string().min(2, 'Model must be at least 2 characters'),
  wattPeak: z.number().positive('Power (Watt Peak) must be positive'),
  dimensions: z.object({
    width: z.number().positive('Width must be positive'),
    height: z.number().positive('Height must be positive'),
  }),
  cells: z.number().int().positive().optional(),
  efficiency: z.number().min(0).max(100),
  warranty: z.number().min(0),
  price: z.number().min(0),
  technology: PanelTechnologyEnum.optional(),
  type: PanelTypeEnum,
  stcIsc:               z.number().positive().optional(),
  stcVoc:               z.number().positive().optional(),
  stcImp:               z.number().positive().optional(),
  stcVmp:               z.number().positive().optional(),
  gammaPmp:             z.number().optional(),
  noct:                 z.number().positive().optional(),
  bifacial:             z.boolean().optional(),
  bifacialityFactor:    z.number().min(0).max(1).optional(),
  degradationFirstYear: z.number().min(0).max(100).optional(),
  degradationAnnual:    z.number().min(0).max(100).optional(),
});

/** Type inferred from PanelCreateSchema - used for creating solar panels */
export type PanelCreateInput = z.infer<typeof PanelCreateSchema>;

/**
 * Panel update schema (all fields optional)
 *
 * Allows partial updates to panel specifications
 */
export const PanelUpdateSchema = PanelCreateSchema.partial();

/** Type inferred from PanelUpdateSchema - used for updating solar panels */
export type PanelUpdateInput = z.infer<typeof PanelUpdateSchema>;

/**
 * Panel query filters schema
 *
 * Optional filters for listing/searching panels:
 * - id: Single panel ID for direct lookup
 * - type: Filter by global/personal type
 * - owner: Filter by user ID (for personal panels)
 * - technology: Filter by panel technology
 * - search: Search by panel name
 * - page: Pagination page number (default: 1)
 * - limit: Items per page (default: 20, max: 200)
 */
export const PanelQuerySchema = z.object({
  id: z.string().optional(), // Single panel ID shortcut
  type: PanelTypeEnum.optional(),
  owner: z.string().optional(), // User ID
  technology: PanelTechnologyEnum.optional(),
  search: z.string().optional(), // Search by brand/model
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

/** Type inferred from PanelQuerySchema - used for querying/filtering panels */
export type PanelQueryInput = z.infer<typeof PanelQuerySchema>;
