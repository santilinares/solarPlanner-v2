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
  tilt: number;
  direction: string;
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
 * Dashboard statistics
 */
export interface DashboardStats {
  totalProjects: number;
  totalPanels: number;
  totalCapacity: number; // kW
  totalProduction: number; // kWh
  recentProjects: ProjectResponse[];
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
  timezone?: string;
  currency?: string;
  price?: number;
  tilt: number;
  direction: string;
  azimuth?: number;
  rawSpacing?: number;
  panelNumber: number;
  panel?: string;
  cultivar?: string;
  owner?: string;
  prodToday?: unknown[];
  nextProd?: unknown[];
  previousProd?: unknown[];
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
  estimatedProduction: number; // kWh/year
  coverage: number; // Percentage
}

export interface OptimalConfigFromPolygonRequest {
  area: GeoPoint[];
  panelId: string;
  tilt: number;
}
