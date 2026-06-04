// Panel domain model
export interface Panel {
  _id: string;
  name: string;
  capacity: number;
  height: number;
  width: number;
  technology: PanelTechnology;
  type: 'global' | 'personal';
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export type PanelTechnology = 'monocrystalline' | 'polycrystalline' | 'thin-film' | 'bifacial';

export interface PanelCreateRequest {
  name: string;
  capacity: number;
  height: number;
  width: number;
  technology: PanelTechnology;
  type: 'global' | 'personal';
}

export interface PanelUpdateRequest {
  name?: string;
  capacity?: number;
  height?: number;
  width?: number;
  technology?: PanelTechnology;
  type?: 'global' | 'personal';
}
