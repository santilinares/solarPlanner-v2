/**
 * Cultivar-related TypeScript type definitions
 */

export interface CultivarResponse {
  _id: string;
  name: string;
  category: string;
  minPanelHeight: number;
  maxPanelHeight: number;
  lightRequirement: string;
  recommendedSpacing: number;
  optimalTiltReduction: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CultivarListResponse {
  data: CultivarResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
