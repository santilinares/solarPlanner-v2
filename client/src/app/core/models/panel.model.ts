// Panel domain model
export interface Panel {
  _id?: string;
  id: string;
  brand: string;
  model: string;
  wattPeak: number;
  dimensions: PanelDimensions;
  temperatureCoefficient: number;
  efficiency: number;
  warranty: number;
  price: number;
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
  temperatureCoefficient: number;
  efficiency: number;
  warranty: number;
  price: number;
}

export interface PanelUpdateRequest {
  brand?: string;
  model?: string;
  wattPeak?: number;
  dimensions?: PanelDimensions;
  temperatureCoefficient?: number;
  efficiency?: number;
  warranty?: number;
  price?: number;
}
