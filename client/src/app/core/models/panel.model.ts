// Panel domain model
export interface Panel {
  _id?: string;
  id: string;
  brand: string;
  model: string;
  wattPeak: number;
  dimensions: PanelDimensions;
  cells?: number;
  temperatureCoefficient: number;
  efficiency: number;
  warranty: number;
  price: number;
  technology?: 'Monocrystalline' | 'Polycrystalline' | 'Thin film';
  createdAt: Date;
  updatedAt: Date;
}

export interface PanelDimensions {
  width: number;
  height: number;
}

export interface PanelCreateRequest {
  brand: string;
  model: string;
  wattPeak: number;
  dimensions: PanelDimensions;
  cells?: number;
  temperatureCoefficient: number;
  efficiency: number;
  warranty: number;
  price: number;
  technology?: 'Monocrystalline' | 'Polycrystalline' | 'Thin film';
}

export interface PanelUpdateRequest {
  brand?: string;
  model?: string;
  wattPeak?: number;
  dimensions?: PanelDimensions;
  cells?: number;
  temperatureCoefficient?: number;
  efficiency?: number;
  warranty?: number;
  price?: number;
  technology?: 'Monocrystalline' | 'Polycrystalline' | 'Thin film';
}
