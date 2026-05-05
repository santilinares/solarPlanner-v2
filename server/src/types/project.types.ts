/**
 * Project-related TypeScript type definitions
 */

import { IProductionPoint } from '../models/project.model';
import { GeoPointInput } from '../schemas/project.schema';

export type CallerContext =
  | { role: 'user'; userId: string }
  | { role: 'admin'; userId: string };

export interface SystemLossesResponse {
  inverterEfficiency?: number;
  dcWiring?: number;
  acWiring?: number;
  mismatch?: number;
  soiling?: number;
  degradationExtra?: number;
  shadingStatic?: number;
}

export interface PvgisRefResponse {
  yearlyKwh: number;
  yearlyKwhPerKwp: number;
  monthlyKwh: number[];
  yearlyPOAIrradiation?: number; // H(i)_y — absent for projects created before this field was added
}

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
  dcAcRatio?: number;
  panel?: string | object; // Panel ID or populated panel object
  cultivar?: string | object; // Cultivar ID or populated cultivar object
  owner?: string | { _id: string; fullName: string; email: string }; // User ID or populated user object
  prodToday?: IProductionPoint[];
  nextProd?: IProductionPoint[];
  previousProd?: IProductionPoint[];
  totalProd?: number;
  lastRefreshedAt?: string; // ISO timestamp of last production data refresh
  systemLosses?: SystemLossesResponse;
  pvgisRef?: PvgisRefResponse;
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
  todayProduction: number; // sum of all prodToday.pv across user projects (kWh)
  next6DaysTotal: number; // sum of all nextProd.pv across user projects (kWh)
  past6DaysTotal: number; // sum of all previousProd.pv across user projects (kWh)
}

export interface OptimalConfigResponse {
  recommendedPanels: number;
  estimatedCapacity: number; // kW
  estimatedProduction: number; // kWh/year
  coverage: number; // percentage
  surfaceArea: number; // m² — polygon area for client-side maxPanels recalc
  latitude: number; // centre latitude for client-side sun elevation calc
  recommendedRowSpacing: number; // m — shadow-based optimal row spacing
}

export interface ProjectAnalytics {
  capacityFactor: number;               // CF (%) — NREL PVWatts V5 §8.1
  performanceRatio: number | null;      // PR (%) — null if yearlyPOAIrradiation not stored (old projects)
  annualSavingsEur: number | null;      // yearlyKwh × price — null if project.price not set
  annualSavingsPerYear: number[] | null; // 25-element array with degradation — null if no price
  // TODO: paybackYears: number | null  — add once installationCost is implemented
  // TODO: roi25Years: number | null    — add once installationCost is implemented
}
