import { z } from 'zod';

/**
 * Production data point validation schema
 * Used as subdocument in Project model
 */

/**
 * Single production data point schema
 * 
 * Represents energy production at a specific time:
 * - dateTime: Timestamp of measurement (auto-converted to Date)
 * - pv: Photovoltaic energy production (kWh or Wh, non-negative)
 * 
 * @example
 * ```json
 * {
 *   "dateTime": "2026-01-11T14:00:00Z",
 *   "pv": 3.5
 * }
 * ```
 */
export const ProductionPointSchema = z.object({
  dateTime: z.coerce.date(),
  pv: z.number().nonnegative(), // kWh or Wh (photovoltaic energy production)
});

/** Type inferred from ProductionPointSchema - single production measurement */
export type ProductionPointInput = z.infer<typeof ProductionPointSchema>;

/**
 * Production time series array schema
 * 
 * Validates an array of production data points for time series data
 */
export const ProductionArraySchema = z.array(ProductionPointSchema);

/** Type inferred from ProductionArraySchema - array of production measurements */
export type ProductionArrayInput = z.infer<typeof ProductionArraySchema>;
