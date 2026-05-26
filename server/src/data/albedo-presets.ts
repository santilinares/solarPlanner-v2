/**
 * Albedo coefficients for different ground surfaces.
 * Source: IEA-PVPS Task 13 (2021) + NREL PVWatts documentation
 */

export const ALBEDO_PRESETS: Record<string, number> = {
  grass:        0.20, // Default — lawn, meadow
  asphalt:      0.15, // Dark pavement
  concrete:     0.25, // Gray concrete, gravel
  white_roof:   0.60, // White membrane roofing
  fresh_snow:   0.80, // Fresh snow (seasonal)
  agricultural: 0.18, // Bare soil, crops
  water:        0.06, // Water bodies
  desert_sand:  0.40, // Light-colored sand
};

export const DEFAULT_ALBEDO = ALBEDO_PRESETS.grass; // 0.20
