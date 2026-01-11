import { z } from 'zod';

/**
 * Production data point validation schema
 * Used as subdocument in Project model
 */

export const ProductionPointSchema = z.object({
  dateTime: z.coerce.date(),
  pv: z.number().nonnegative(), // kWh or Wh (photovoltaic energy production)
});

export type ProductionPointInput = z.infer<typeof ProductionPointSchema>;

// Array validation for production time series
export const ProductionArraySchema = z.array(ProductionPointSchema);

export type ProductionArrayInput = z.infer<typeof ProductionArraySchema>;
