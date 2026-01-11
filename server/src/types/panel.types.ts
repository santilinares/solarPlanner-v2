/**
 * Panel-related TypeScript type definitions
 */

export interface PanelResponse {
  _id: string;
  name: string;
  capacity: number;
  height: number;
  width: number;
  technology: 'Monocrystalline' | 'Polycrystalline' | 'Thin film';
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
