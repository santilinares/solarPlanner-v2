import {
  CAPEX_BENCHMARKS_EU,
  CapexSegment,
  DEFAULT_COUNTRY,
} from '../data/capex-benchmarks-eu';

export interface CapexPerKwpResult {
  value: number;       // €/kWp — mid value
  min: number;         // €/kWp
  max: number;         // €/kWp
  source: 'benchmark';
  countryCode: string;
  segment: CapexSegment;
  year: number;        // Data vintage
}

/**
 * Get CAPEX per kWp for a given country and segment.
 * Falls back to DEFAULT_COUNTRY if countryCode is not in the table.
 */
export function getCapexPerKwp(
  countryCode: string,
  segment: CapexSegment,
  defaultCountry: string = DEFAULT_COUNTRY,
): CapexPerKwpResult | null {
  const upperCountry = (countryCode || defaultCountry).toUpperCase();

  let countryData = CAPEX_BENCHMARKS_EU[upperCountry];
  let usedCountry = upperCountry;

  if (!countryData) {
    countryData = CAPEX_BENCHMARKS_EU[defaultCountry];
    usedCountry = defaultCountry;
  }

  if (!countryData) return null;

  const segmentData = countryData[segment] ?? countryData['residential'];
  if (!segmentData) return null;

  return {
    value: segmentData.mid,
    min: segmentData.min,
    max: segmentData.max,
    source: 'benchmark',
    countryCode: usedCountry,
    segment,
    year: 2025,
  };
}
