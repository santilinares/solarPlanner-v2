/**
 * Cultivar domain model — describes crop types for agrivoltaic projects
 */
export interface Cultivar {
  _id: string;
  name: string;
  category: 'cereal' | 'vegetable' | 'fruit' | 'legume' | 'other';
  minPanelHeight: number;
  maxPanelHeight: number;
  lightRequirement: 'full-sun' | 'partial-shade' | 'shade-tolerant';
  recommendedSpacing: number;
  optimalTiltReduction: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CultivarListResponse {
  data: Cultivar[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
