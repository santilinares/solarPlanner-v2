import { HydratedDocument } from 'mongoose';
type FilterQuery<_T> = Record<string, any>;
import { CultivarModel, ICultivar } from '../models/cultivar.model';
import {
  CultivarCreateInput,
  CultivarUpdateInput,
  CultivarQueryInput,
} from '../schemas/cultivar.schema';
import { CultivarResponse, CultivarListResponse } from '../types/cultivar.types';

/**
 * Transform cultivar document to response format
 */
const transformCultivarToResponse = (cultivar: HydratedDocument<ICultivar>): CultivarResponse => ({
  _id: cultivar._id.toString(),
  name: cultivar.name,
  category: cultivar.category,
  minPanelHeight: cultivar.minPanelHeight,
  maxPanelHeight: cultivar.maxPanelHeight,
  lightRequirement: cultivar.lightRequirement,
  recommendedSpacing: cultivar.recommendedSpacing,
  optimalTiltReduction: cultivar.optimalTiltReduction,
  notes: cultivar.notes,
  createdAt: cultivar.createdAt.toISOString(),
  updatedAt: cultivar.updatedAt.toISOString(),
});

export class CultivarService {
  /**
   * Create a new cultivar (admin only)
   */
  async createCultivar(data: CultivarCreateInput): Promise<CultivarResponse> {
    const cultivar = await CultivarModel.create(data);
    return transformCultivarToResponse(cultivar);
  }

  /**
   * Get cultivar by ID
   */
  async getCultivarById(id: string): Promise<CultivarResponse> {
    const cultivar = await CultivarModel.findById(id);
    if (!cultivar) throw new Error('Cultivar not found');
    return transformCultivarToResponse(cultivar);
  }

  /**
   * List / filter cultivars
   */
  async listCultivars(filters: CultivarQueryInput): Promise<CultivarListResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: FilterQuery<ICultivar> = {};

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    const [cultivars, total] = await Promise.all([
      CultivarModel.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      CultivarModel.countDocuments(query),
    ]);

    return {
      data: cultivars.map(transformCultivarToResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update cultivar (admin only)
   */
  async updateCultivar(id: string, data: CultivarUpdateInput): Promise<CultivarResponse> {
    const cultivar = await CultivarModel.findByIdAndUpdate(id, data, { new: true });
    if (!cultivar) throw new Error('Cultivar not found');
    return transformCultivarToResponse(cultivar);
  }

  /**
   * Delete cultivar (admin only)
   */
  async deleteCultivar(id: string): Promise<void> {
    const cultivar = await CultivarModel.findByIdAndDelete(id);
    if (!cultivar) throw new Error('Cultivar not found');
  }
}

export const cultivarService = new CultivarService();
