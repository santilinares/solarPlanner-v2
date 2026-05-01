import mongoose, { Schema, Model } from 'mongoose';

/**
 * Solar panel model
 */

// Panel data interface
export interface IPanel {
  brand: string;
  model: string;
  wattPeak: number; // Watts
  dimensions: {
    width: number; // mm
    height: number; // mm
  };
  cells?: number;
  efficiency: number;
  warranty: number;
  price: number;
  technology?: 'Monocrystalline' | 'Polycrystalline' | 'Thin film';
  type: 'global' | 'personal';
  owner?: mongoose.Types.ObjectId; // Reference to User (for personal panels)
  // STC electrical parameters
  stcIsc?: number;               // Short-circuit current at STC (A)
  stcVoc?: number;               // Open-circuit voltage at STC (V)
  stcImp?: number;               // MPP current at STC (A)
  stcVmp?: number;               // MPP voltage at STC (V)
  gammaPmp?: number;             // Power temperature coefficient (%/°C), e.g. -0.35
  noct?: number;                 // Nominal cell operating temperature (°C), e.g. 45
  bifacial?: boolean;
  bifacialityFactor?: number;    // Rear/front power ratio (0–1)
  degradationFirstYear?: number; // % drop in year 1
  degradationAnnual?: number;    // %/year from year 2 onwards
  createdAt: Date;
  updatedAt: Date;
}

// Panel model type (no instance methods)
export type PanelModel = Model<IPanel, Record<string, never>, Record<string, never>>;

const PanelSchema = new Schema<IPanel, PanelModel, Record<string, never>>(
  {
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    wattPeak: {
      type: Number,
      required: true,
      min: 0,
    },
    dimensions: {
      width: { type: Number, required: true, min: 0 },
      height: { type: Number, required: true, min: 0 },
    },
    cells: { type: Number, min: 0 },
    efficiency: { type: Number, required: true, min: 0, max: 100 },
    warranty: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    technology: {
      type: String,
      enum: ['Monocrystalline', 'Polycrystalline', 'Thin film'],
      required: false,
    },
    stcIsc:               { type: Number },
    stcVoc:               { type: Number },
    stcImp:               { type: Number },
    stcVmp:               { type: Number },
    gammaPmp:             { type: Number },
    noct:                 { type: Number },
    bifacial:             { type: Boolean },
    bifacialityFactor:    { type: Number, min: 0, max: 1 },
    degradationFirstYear: { type: Number, min: 0, max: 100 },
    degradationAnnual:    { type: Number, min: 0, max: 100 },
    type: {
      type: String,
      enum: ['global', 'personal'],
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'Users',
      required: function (this: IPanel) {
        return this.type === 'personal';
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PanelSchema.index({ type: 1 });
PanelSchema.index({ owner: 1 });
PanelSchema.index({ brand: 'text', model: 'text' }); // Text search on brand/model

export const PanelModel = mongoose.model<IPanel, PanelModel>('Panels', PanelSchema);
