/**
 * Project-related TypeScript type definitions
 */

import { IProductionPoint } from '../models/project.model';

export interface ProjectResponse {
  _id: string;
  name: string;
  area: { lat: number; lon: number }[];
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
  panel?: string | object; // Panel ID or populated panel object
  owner?: string | object; // User ID or populated user object
  prodToday?: IProductionPoint[];
  nextProd?: IProductionPoint[];
  previousProd?: IProductionPoint[];
  installDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  projects: ProjectResponse[];
  total: number;
  page?: number;
  limit?: number;
}

export interface DashboardStats {
  totalProjects: number;
  totalPanels: number;
  totalCapacity: number; // kW
  totalProduction: number; // kWh
  recentProjects: ProjectResponse[];
}

export interface OptimalConfigResponse {
  recommendedPanels: number;
  estimatedCapacity: number; // kW
  estimatedProduction: number; // kWh/year
  coverage: number; // percentage
}
