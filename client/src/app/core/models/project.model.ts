// Project domain model
export interface Project {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  polygon: Polygon;
  orientation: string;
  averageConsumption: number;
  productionData: MonthlyProduction[];
  panel: Panel;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Polygon {
  coordinates: Coordinates[];
  area: number;
}

export interface MonthlyProduction {
  month: string;
  production: number;
  consumption: number;
  surplus: number;
  deficit: number;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  projectType: 'roof' | 'agrivoltaic';
  area: GeoPoint[];
  country?: string;
  countryCode?: string;
  timezone?: string;
  currency?: string;
  price?: number;
  tilt: number;
  direction: string;
  azimuth?: number;
  panelNumber: number;
  panelId?: string;
  rawSpacing?: number;
  cultivarId?: string;
}

export interface ProjectUpdateRequest {
  name?: string;
  area?: GeoPoint[];
  tilt?: number;
  direction?: string;
  azimuth?: number;
  rawSpacing?: number;
  panelNumber?: number;
  panelId?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  price?: number;
  installationCost?: number;
  segment?: 'residential' | 'commercial' | 'utility' | 'agrivoltaic';
  albedo?: number;
}

// Simplified Panel reference for project
export interface Panel {
  id: string;
  brand: string;
  model: string;
  wattPeak: number;
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Sun position data for a specific time of year
 */
export interface SunPosition {
  noonAltitude: number;
  daylightHours: number;
  sunrise: number;
  sunset: number;
}

/**
 * Sun path calculations for project location
 */
export interface SunPathData {
  latitude: number;
  summerSolstice: SunPosition;
  winterSolstice: SunPosition;
  equinox: SunPosition;
}

/**
 * Panel details for plan generation
 */
export interface PanelDetails {
  name: string;
  capacity: number;
  width: number;
  height: number;
  technology: string;
}

/**
 * Project plan data for PDF generation
 */
export interface PlanData {
  project: {
    _id: string;
    name: string;
    area: Array<{ lat: number; lon: number }>;
    lat: number;
    lon: number;
    surface: number;
    country: string;
    timezone: string;
    currency: string;
    price: number;
    tilt: number;
    direction: string;
    azimuth: number;
    rawSpacing: number;
    panelNumber: number;
    panel?: string;
    owner?: string;
    prodToday?: number;
    nextProd?: number;
    previousProd?: number;
    installDate: string;
    createdAt: string;
    updatedAt: string;
  };
  panelDetails: PanelDetails | null;
  totalCapacityKw: number;
  estimatedAnnualProduction: number;
  generatedAt: string;
}

/**
 * Production data point from Solcast (serialized from server)
 */
export interface ProductionPoint {
  dateTime: string; // ISO string
  pv: number; // kWh
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalProjects: number;
  totalPanels: number;
  totalCapacity: number; // kW
  totalProduction: number; // kWh
  recentProjects: ProjectResponse[];
  todayProduction: number; // kWh today across all projects
  next6DaysTotal: number; // kWh forecast next 6 days across all projects
  past6DaysTotal: number; // kWh estimated actuals past 6 days across all projects
}

/**
 * Project response from server
 */
export interface ProjectResponse {
  _id: string;
  name: string;
  description?: string;
  projectType: 'roof' | 'agrivoltaic';
  area: Array<{ lat: number; lon: number }>;
  lat?: number;
  lon?: number;
  surface?: number;
  country?: string;
  countryCode?: string;
  timezone?: string;
  currency?: string;
  price?: number;
  installationCost?: number;
  segment?: 'residential' | 'commercial' | 'utility' | 'agrivoltaic';
  albedo?: number;
  tilt: number;
  direction: string;
  azimuth?: number;
  rawSpacing?: number;
  panelNumber: number;
  panel?: string;
  cultivar?: string;
  owner?: string;
  pvgisRef?: {
    yearlyKwh: number;
    yearlyKwhPerKwp: number;
    monthlyKwh: number[];
    yearlyPOAIrradiation?: number;
  };
  prodToday?: ProductionPoint[];
  nextProd?: ProductionPoint[];
  previousProd?: ProductionPoint[];
  totalProd?: number;
  installDate: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Optimal configuration response
 */
export interface OptimalConfigResponse {
  recommendedPanels: number;
  estimatedCapacity: number; // kW
  estimatedProduction: number; // kWh/year midpoint of the preliminary range
  estimatedProductionRange: {
    low: number;
    high: number;
  };
  productionEstimateMode: 'preliminary';
  coverage: number; // Percentage
  surfaceArea: number; // m² — polygon area used by backend optimal configuration
  latitude: number; // centre latitude for client-side sun elevation calc
  recommendedRowSpacing: number; // m — shadow-based optimal row spacing
}

export interface OptimalConfigFromPolygonRequest {
  area: GeoPoint[];
  panelId: string;
  tilt: number;
  azimuth?: number;
}

export interface ElectricityPriceSuggestion {
  price: number | null;
  currency: string | null;
  source: 'entsoe' | 'unavailable';
  countryCode: string;
}

export interface ProjectAnalytics {
  capacityFactor: number;                               // CF (%) — NREL PVWatts V5 §8.1
  performanceRatio: number | null;                      // PR (%) — null if H(i)_y not stored
  annualSavingsEur: number | null;                      // yearlyKwh × price — null if price not set
  annualSavingsPerYear: number[] | null;                // 25-element array with degradation — null if no price
  paybackYears: number | null;                          // installationCost / annualSavingsEur
  roi25Years: number | null;                            // % ROI over 25 years
  installationCostUsed: number | null;                  // cost used for calculations
  installationCostSource: 'user' | 'benchmark' | null; // where the cost came from
}
