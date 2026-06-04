// Project domain model
export interface Project {
  _id: string;
  name: string;
  area: GeoPoint[];
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
  panel?: string | ProjectPanel;
  owner?: string | object;
  prodToday?: ProductionPoint[];
  nextProd?: ProductionPoint[];
  previousProd?: ProductionPoint[];
  installDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface ProductionPoint {
  dateTime: string;
  pv: number;
}

export interface ProjectCreateRequest {
  name: string;
  area: GeoPoint[];
  tilt: number;
  direction: string;
  azimuth?: number;
  rawSpacing?: number;
  panelNumber: number;
  panelId?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  price?: number;
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

export interface ProjectPanel {
  _id: string;
  name: string;
  capacity: number;
  width: number;
  height: number;
  technology: string;
}

export interface OptimalConfigRequest {
  surfaceArea: number;
  panelWidth: number;
  panelHeight: number;
  tilt: number;
  latitude: number;
}

export interface OptimalConfig {
  recommendedPanels: number;
  estimatedCapacity: number;
  estimatedProduction: number;
  coverage: number;
}

export interface EnergyPriceSuggestion {
  price: number;
  currency: string;
  country: string;
  source: 'entsoe' | 'fallback';
  period?: string;
  message: string;
}
