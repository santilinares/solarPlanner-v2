import mongoose, { Schema, Model } from 'mongoose';

/**
 * Production data point (subdocument)
 */
export interface IProductionPoint {
  dateTime: Date;
  pv: number; // kWh or Wh
}

const ProductionPointSchema = new Schema<IProductionPoint>(
  {
    dateTime: {
      type: Date,
      required: true,
    },
    pv: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

/**
 * Solar project model
 */

// Project data interface
export interface IProject {
  name: string;
  area: { lat: number; lon: number }[]; // Polygon coordinates
  lat?: number; // Derived center latitude
  lon?: number; // Derived center longitude
  surface?: number; // Derived area in m²
  country?: string;
  timezone?: string;
  currency?: string;
  price?: number; // Energy price
  tilt: number; // Panel tilt angle (0-90 degrees)
  direction: string; // e.g., "south", "north"
  azimuth?: number; // Azimuth angle (0-360 degrees)
  rawSpacing?: number; // Spacing between panel rows
  panelNumber: number; // Number of panels in project
  panel?: mongoose.Types.ObjectId; // Reference to Panel
  owner?: mongoose.Types.ObjectId; // Reference to User
  prodToday?: IProductionPoint[]; // Today's production data
  nextProd?: IProductionPoint[]; // Forecast production data
  previousProd?: IProductionPoint[]; // Historical production data
  installDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Project model type (no instance methods)
export type ProjectModel = Model<IProject, Record<string, never>, Record<string, never>>;

const ProjectSchema = new Schema<IProject, ProjectModel, Record<string, never>>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    area: [
      {
        lat: { type: Number, required: true, min: -90, max: 90 },
        lon: { type: Number, required: true, min: -180, max: 180 },
      },
    ],
    lat: Number,
    lon: Number,
    surface: Number,
    country: String,
    timezone: String,
    currency: String,
    price: {
      type: Number,
      min: 0,
    },
    tilt: {
      type: Number,
      required: true,
      min: 0,
      max: 90,
    },
    direction: {
      type: String,
      required: true,
    },
    azimuth: {
      type: Number,
      min: 0,
      max: 360,
    },
    rawSpacing: Number,
    panelNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    panel: {
      type: Schema.Types.ObjectId,
      ref: 'Panels',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'Users',
    },
    prodToday: [ProductionPointSchema],
    nextProd: [ProductionPointSchema],
    previousProd: [ProductionPointSchema],
    installDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProjectSchema.index({ owner: 1 });
ProjectSchema.index({ country: 1 });
ProjectSchema.index({ installDate: 1 });
ProjectSchema.index({ name: 'text' }); // Text search on name

// TODO: Consider geospatial index for area coordinates if proximity queries needed
// ProjectSchema.index({ 'area': '2dsphere' });

export const ProjectModel = mongoose.model<IProject, ProjectModel>('Projects', ProjectSchema);
