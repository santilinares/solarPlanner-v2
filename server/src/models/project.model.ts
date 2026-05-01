import mongoose, { Schema, Model } from 'mongoose';
import { GeoPointInput } from '../schemas/project.schema';

/**
 * Production data point (subdocument)
 */
export interface IProductionPoint {
  dateTime: Date;
  // TODO - Unidades ambiguas: el comentario dice "kWh or Wh" pero no está definido cuál usa cada campo.
  // prodToday viene de Solcast en kW por período (pendiente conversión ×0.5), nextProd/previousProd son agregados diarios.
  // Aclarar y unificar las unidades en todos los campos de producción.
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

export interface ISystemLosses {
  inverterEfficiency?: number;
  dcWiring?: number;
  acWiring?: number;
  mismatch?: number;
  soiling?: number;
  degradationExtra?: number;
  shadingStatic?: number;
}

const SystemLossesSchema = new Schema<ISystemLosses>(
  {
    inverterEfficiency: { type: Number, min: 0, max: 1 },
    dcWiring:           { type: Number, min: 0, max: 100 },
    acWiring:           { type: Number, min: 0, max: 100 },
    mismatch:           { type: Number, min: 0, max: 100 },
    soiling:            { type: Number, min: 0, max: 100 },
    degradationExtra:   { type: Number, min: 0, max: 100 },
    shadingStatic:      { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

/**
 * Solar project model
 */

// Project data interface
export interface IProject {
  name: string;
  description?: string;
  projectType: 'roof' | 'agrivoltaic';
  area: GeoPointInput[]; // Polygon coordinates
  lat?: number; // Stored center latitude (derived from area polygon)
  lon?: number; // Stored center longitude (derived from area polygon)
  surface?: number; // Stored area in m² (derived from area polygon)
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
  cultivar?: mongoose.Types.ObjectId; // Reference to Cultivar (agrivoltaic only)
  owner?: mongoose.Types.ObjectId; // Reference to User
  prodToday?: IProductionPoint[]; // Today's production data
  nextProd?: IProductionPoint[]; // Forecast production data
  previousProd?: IProductionPoint[]; // Historical production data
  totalProd?: number; // Accumulated total production since install (kWh)
  lastRefreshedAt?: Date; // Timestamp of the last successful nightly production refresh
  systemLosses?: ISystemLosses;
  resourceModelVersion?: string;
  pvModuleModelVersion?: string;
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
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    projectType: {
      type: String,
      enum: ['roof', 'agrivoltaic'],
      required: true,
      default: 'roof',
    },
    area: [
      {
        lat: { type: Number, required: true, min: -90, max: 90 },
        lon: { type: Number, required: true, min: -180, max: 180 },
      },
    ],
    lat: { type: Number, min: -90, max: 90 },
    lon: { type: Number, min: -180, max: 180 },
    surface: { type: Number, min: 0 },
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
    cultivar: {
      type: Schema.Types.ObjectId,
      ref: 'Cultivars',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'Users',
    },
    prodToday: [ProductionPointSchema],
    nextProd: [ProductionPointSchema],
    previousProd: [ProductionPointSchema],
    totalProd: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastRefreshedAt:      { type: Date },
    systemLosses:         { type: SystemLossesSchema, default: {} },
    resourceModelVersion: { type: String },
    pvModuleModelVersion: { type: String },
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
