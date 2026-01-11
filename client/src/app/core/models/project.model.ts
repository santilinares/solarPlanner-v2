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

export interface ProjectCreateRequest {
  name: string;
  address: string;
  coordinates: Coordinates;
  polygon: Polygon;
  orientation: string;
  averageConsumption: number;
  panelId: string;
}

export interface ProjectUpdateRequest {
  name?: string;
  address?: string;
  averageConsumption?: number;
  orientation?: string;
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
