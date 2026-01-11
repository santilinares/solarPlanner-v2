import mongoose, { Schema, Model } from 'mongoose';

/**
 * Solar panel model
 */

// Panel data interface
export interface IPanel {
  name: string;
  capacity: number; // Watts
  height: number; // meters
  width: number; // meters
  technology: 'Monocrystalline' | 'Polycrystalline' | 'Thin film';
  type: 'global' | 'personal';
  owner?: mongoose.Types.ObjectId; // Reference to User (for personal panels)
  createdAt: Date;
  updatedAt: Date;
}

// Panel model type (no instance methods)
export type PanelModel = Model<IPanel, Record<string, never>, Record<string, never>>;

const PanelSchema = new Schema<IPanel, PanelModel, Record<string, never>>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
    },
    height: {
      type: Number,
      required: true,
      min: 0,
    },
    width: {
      type: Number,
      required: true,
      min: 0,
    },
    technology: {
      type: String,
      enum: ['Monocrystalline', 'Polycrystalline', 'Thin film'],
      required: true,
    },
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
PanelSchema.index({ technology: 1 });
PanelSchema.index({ name: 'text' }); // Text search on name

export const PanelModel = mongoose.model<IPanel, PanelModel>('Panels', PanelSchema);
