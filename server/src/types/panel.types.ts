/**
 * Panel-related TypeScript type definitions
 */

export interface PanelResponse {
  _id: string;
  brand: string;
  model: string;
  wattPeak: number;
  dimensions: {
    width: number;
    height: number;
  };
  cells?: number;
  temperatureCoefficient: number;
  efficiency: number;
  warranty: number;
  price: number;
  technology?: 'Monocrystalline' | 'Polycrystalline' | 'Thin film';
  type: 'global' | 'personal';
  owner?: string | object; // User ID or populated user object
  createdAt: string;
  updatedAt: string;
}

export interface PanelListResponse {
  panels: PanelResponse[];
  total: number;
  page?: number;
  limit?: number;
}
