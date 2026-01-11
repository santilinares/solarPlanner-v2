import { HydratedDocument, FilterQuery } from 'mongoose';
import { PanelModel, IPanel } from '../models/panel.model';
import { PanelCreateInput, PanelQueryInput } from '../schemas/panel.schema';
import { PanelResponse, PanelListResponse } from '../types/panel.types';

/**
 * Panel Service
 * Handles solar panel management
 */

/**
 * Transform panel document to response format
 */
const transformPanelToResponse = (panel: HydratedDocument<IPanel>): PanelResponse => ({
  _id: panel._id.toString(),
  name: panel.name,
  capacity: panel.capacity,
  height: panel.height,
  width: panel.width,
  technology: panel.technology,
  type: panel.type,
  owner: panel.owner?.toString(),
  createdAt: panel.createdAt.toISOString(),
  updatedAt: panel.updatedAt.toISOString(),
});

export class PanelService {
  /**
   * Create a new solar panel
   * @param userId Creator user ID
   * @param data Panel creation data
   * @returns Created panel
   */
  async createPanel(userId: string, data: PanelCreateInput): Promise<PanelResponse> {
    const panel = await PanelModel.create({
      ...data,
      owner: data.type === 'personal' ? userId : undefined,
    });

    return transformPanelToResponse(panel);
  }

  /**
   * Get panel by ID
   * @param panelId Panel ID
   * @returns Panel data
   */
  async getPanelById(panelId: string): Promise<PanelResponse> {
    const panel = await PanelModel.findById(panelId).populate('owner', 'fullName email');

    if (!panel) {
      throw new Error('Panel not found');
    }

    return transformPanelToResponse(panel);
  }

  /**
   * List/filter panels
   * @param filters Query filters
   * @param userId Requesting user ID (for filtering personal panels)
   * @returns List of panels
   */
  async listPanels(filters: PanelQueryInput, userId?: string): Promise<PanelListResponse> {
    // If single ID requested, return that panel
    if (filters.id) {
      const panel = await this.getPanelById(filters.id);
      return { panels: [panel], total: 1 };
    }

    // Build query
    const query: FilterQuery<IPanel> = {};

    // Type filter
    if (filters.type) {
      query.type = filters.type;
    }

    // Technology filter
    if (filters.technology) {
      query.technology = filters.technology;
    }

    // Owner filter
    if (filters.owner) {
      query.owner = filters.owner;
    }

    // Search by name
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // If not filtering by specific owner, show global + user's personal panels
    if (!filters.owner && userId) {
      query.$or = [
        { type: 'global' },
        { type: 'personal', owner: userId },
      ];
    }

    // Execute query
    const [panels, total] = await Promise.all([
      PanelModel.find(query).populate('owner', 'fullName email').sort({ createdAt: -1 }),
      PanelModel.countDocuments(query),
    ]);

    return {
      panels: panels.map(transformPanelToResponse),
      total,
    };
  }

  /**
   * Delete panel
   * @param panelId Panel ID
   * @param userId User ID (for ownership check)
   * @param isAdmin Whether user is admin
   */
  async deletePanel(panelId: string, userId: string, isAdmin: boolean): Promise<void> {
    const panel = await PanelModel.findById(panelId);

    if (!panel) {
      throw new Error('Panel not found');
    }

    // Global panels can only be deleted by admins
    if (panel.type === 'global' && !isAdmin) {
      throw new Error('Only admins can delete global panels');
    }

    // Personal panels: verify ownership or admin
    if (panel.type === 'personal' && !isAdmin && panel.owner?.toString() !== userId) {
      throw new Error('Not authorized to delete this panel');
    }

    await PanelModel.findByIdAndDelete(panelId);
  }

  /**
   * Get panels available to user (global + personal)
   * @param userId User ID
   * @returns List of available panels
   */
  async getAvailablePanels(userId: string): Promise<PanelListResponse> {
    // Return global panels + personal panels owned by user
    const filters: PanelQueryInput = {};
    return this.listPanels(filters, userId);
  }
}

export const panelService = new PanelService();
