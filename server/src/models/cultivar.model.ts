import mongoose, { Schema, Model } from 'mongoose';

/**
 * Cultivar model — describes a crop type for agrivoltaic projects
 */

export interface ICultivar {
  name: string;
  category: 'cereal' | 'vegetable' | 'fruit' | 'legume' | 'other';
  minPanelHeight: number;   // Metres — min mounting height above ground
  maxPanelHeight: number;   // Metres — max recommended mounting height
  lightRequirement: 'full-sun' | 'partial-shade' | 'shade-tolerant';
  recommendedSpacing: number; // Metres — min row spacing for crop access
  optimalTiltReduction: number; // Degrees to subtract from default tilt (0–45)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CultivarModel = Model<ICultivar, Record<string, never>, Record<string, never>>;

const CultivarSchema = new Schema<ICultivar, CultivarModel, Record<string, never>>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      enum: ['cereal', 'vegetable', 'fruit', 'legume', 'other'],
      required: true,
    },
    minPanelHeight: {
      type: Number,
      required: true,
      min: 0,
    },
    maxPanelHeight: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(this: ICultivar, value: number) {
          return value >= this.minPanelHeight;
        },
        message: 'maxPanelHeight must be >= minPanelHeight',
      },
    },
    lightRequirement: {
      type: String,
      enum: ['full-sun', 'partial-shade', 'shade-tolerant'],
      required: true,
    },
    recommendedSpacing: {
      type: Number,
      required: true,
      min: 0,
    },
    optimalTiltReduction: {
      type: Number,
      required: true,
      min: 0,
      max: 45,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CultivarSchema.index({ category: 1 });
CultivarSchema.index({ name: 'text' });

export const CultivarModel = mongoose.model<ICultivar, CultivarModel>('Cultivars', CultivarSchema);
