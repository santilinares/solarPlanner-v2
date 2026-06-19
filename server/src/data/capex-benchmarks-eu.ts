/**
 * CAPEX benchmarks for solar installations in Europe (€/kWp)
 * Source: Solar Data Atlas 2025-2026
 * https://www.solardataatlas.com/en/data-solar-capex-europe
 *
 * Update frequency: Every 12-24 months
 * Last update: March 2025
 */

export type CapexSegment = 'residential' | 'commercial' | 'utility' | 'agrivoltaic';

export interface CountryCapexSegment {
  min: number; // €/kWp
  max: number; // €/kWp
  mid: number; // €/kWp — default value for estimation
}

export type CountryCapexConfig = Record<CapexSegment, CountryCapexSegment>;

export const CAPEX_BENCHMARKS_EU: Record<string, CountryCapexConfig> = {
  ES: {
    utility:     { min: 550, max: 750,  mid: 650  },
    commercial:  { min: 700, max: 1100, mid: 900  },
    residential: { min: 1100, max: 1600, mid: 1350 },
    agrivoltaic: { min: 650, max: 900,  mid: 775  },
  },
  PT: {
    utility:     { min: 580, max: 720,  mid: 650  },
    commercial:  { min: 680, max: 880,  mid: 780  },
    residential: { min: 1000, max: 1400, mid: 1200 },
    agrivoltaic: { min: 670, max: 850,  mid: 760  },
  },
  DE: {
    utility:     { min: 650, max: 850,  mid: 750  },
    commercial:  { min: 850, max: 1150, mid: 1000 },
    residential: { min: 1300, max: 1700, mid: 1500 },
    agrivoltaic: { min: 750, max: 950,  mid: 850  },
  },
  FR: {
    utility:     { min: 750, max: 950,  mid: 850  },
    commercial:  { min: 950, max: 1250, mid: 1100 },
    residential: { min: 1650, max: 2050, mid: 1850 },
    agrivoltaic: { min: 850, max: 1050, mid: 950  },
  },
  IT: {
    utility:     { min: 675, max: 875,  mid: 775  },
    commercial:  { min: 900, max: 1200, mid: 1050 },
    residential: { min: 1350, max: 1750, mid: 1550 },
    agrivoltaic: { min: 775, max: 975,  mid: 875  },
  },
  GB: {
    utility:     { min: 700, max: 900,  mid: 800  },
    commercial:  { min: 900, max: 1300, mid: 1100 },
    residential: { min: 1400, max: 1900, mid: 1650 },
    agrivoltaic: { min: 800, max: 1000, mid: 900  },
  },
  NL: {
    utility:     { min: 675, max: 875,  mid: 775  },
    commercial:  { min: 850, max: 1150, mid: 1000 },
    residential: { min: 1350, max: 1750, mid: 1550 },
    agrivoltaic: { min: 775, max: 975,  mid: 875  },
  },
  BE: {
    utility:     { min: 700, max: 900,  mid: 800  },
    commercial:  { min: 900, max: 1200, mid: 1050 },
    residential: { min: 1400, max: 1800, mid: 1600 },
    agrivoltaic: { min: 800, max: 1000, mid: 900  },
  },
  PL: {
    utility:     { min: 500, max: 700,  mid: 600  },
    commercial:  { min: 650, max: 950,  mid: 800  },
    residential: { min: 900, max: 1300, mid: 1100 },
    agrivoltaic: { min: 600, max: 800,  mid: 700  },
  },
  AT: {
    utility:     { min: 650, max: 850,  mid: 750  },
    commercial:  { min: 850, max: 1150, mid: 1000 },
    residential: { min: 1300, max: 1700, mid: 1500 },
    agrivoltaic: { min: 750, max: 950,  mid: 850  },
  },
};

export const DEFAULT_COUNTRY = 'ES';
