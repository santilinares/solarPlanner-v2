/**
 * Project-related TypeScript type definitions
 */

import { IProductionPoint } from '../models/project.model';
import { GeoPointInput } from '../schemas/project.schema';

export interface ProjectResponse {
  _id: string;
  name: string;
  description?: string;
  projectType: 'roof' | 'agrivoltaic';
  area: GeoPointInput[];
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
  cultivar?: string | object; // Cultivar ID or populated cultivar object
  owner?: string | object; // User ID or populated user object
  prodToday?: IProductionPoint[];
  nextProd?: IProductionPoint[];
  previousProd?: IProductionPoint[];
  installDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  data: ProjectResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
