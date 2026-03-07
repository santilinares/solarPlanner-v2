import { HydratedDocument, FilterQuery } from 'mongoose';
import { getCenter, getAreaOfPolygon } from 'geolib';
import { ProjectModel, IProject } from '../models/project.model';
import { PanelModel, IPanel } from '../models/panel.model';
import { CultivarModel } from '../models/cultivar.model';
import {
  ProjectCreateInput,
  ProjectQueryInput,
  OptimalConfigInput,
  OptimalConfigFromPolygonInput,
  ProjectUpdateInput,
  GeoPointInput,
} from '../schemas/project.schema';
import {
  ProjectResponse,
  ProjectListResponse,
  DashboardStats,
  OptimalConfigResponse,
} from '../types/project.types';

/**
 * Project Service
 * Handles solar project management and calculations
 */

interface SunPathData {
  latitude: number;
  summerSolstice: SunPosition;
  winterSolstice: SunPosition;
  equinox: SunPosition;
}

interface SunPosition {
  noonAltitude: number;
  daylightHours: number;
  sunrise: number;
  sunset: number;
}

interface PlanData {
  project: ProjectResponse;
  panelDetails: {
    name: string;
    capacity: number;
    width: number;
    height: number;
    technology: string;
  } | null;
  totalCapacityKw: number;
  estimatedAnnualProduction: number;
  generatedAt: string;
}

/**
 * Calculate geospatial fields from polygon area
 */
const calculateGeospatialFields = (area: GeoPointInput[]): { lat?: number; lon?: number; surface?: number } => {
  if (!area || area.length < 3) {
    return {};
  }

  try {
    const geoPoints = area.map((point: GeoPointInput) => ({ latitude: point.lat, longitude: point.lon }));
    const center = getCenter(geoPoints);
    const surface = getAreaOfPolygon(geoPoints);

    return {
      lat: center && typeof center === 'object' ? (center as { latitude: number; longitude: number }).latitude : undefined,
      lon: center && typeof center === 'object' ? (center as { latitude: number; longitude: number }).longitude : undefined,
      surface: typeof surface === 'number' ? surface : undefined,
    };
  } catch (error) {
    console.error('Error calculating geospatial fields:', error);
    return {};
  }
};

/**
 * Transform project document to response format
 * Includes calculated geospatial fields (lat, lon, surface)
 */
const transformProjectToResponse = (project: HydratedDocument<IProject>): ProjectResponse => {
  // Calculate geospatial fields from area polygon
  const geo = calculateGeospatialFields(project.area);

  return {
    _id: project._id.toString(),
    name: project.name,
    description: project.description,
    projectType: project.projectType ?? 'roof',
    area: project.area,
    lat: geo.lat,
    lon: geo.lon,
    surface: geo.surface,
    country: project.country,
    timezone: project.timezone,
    currency: project.currency,
    price: project.price,
    tilt: project.tilt,
    direction: project.direction,
    azimuth: project.azimuth,
    rawSpacing: project.rawSpacing,
    panelNumber: project.panelNumber,
    panel: project.panel?._id.toString(),
    cultivar: project.cultivar?._id?.toString(),
    owner: project.owner?._id.toString(),
    prodToday: project.prodToday,
    nextProd: project.nextProd,
    previousProd: project.previousProd,
    installDate: project.installDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
};

export class ProjectService {
  /**
   * Create a new solar project
   * @param userId Owner user ID
   * @param data Project creation data
   * @returns Created project
   */
  async createProject(userId: string, data: ProjectCreateInput): Promise<ProjectResponse> {
    // Validate panel exists if provided
    if (data.panelId) {
      const panel = await PanelModel.findById(data.panelId);
      if (!panel) {
        throw new Error('Panel not found');
      }
    }

    // Validate cultivar exists if agrivoltaic + cultivarId provided
    if (data.projectType === 'agrivoltaic' && data.cultivarId) {
      const cultivar = await CultivarModel.findById(data.cultivarId);
      if (!cultivar) {
        throw new Error('Cultivar not found');
      }
    }

    // Create project (lat, lon, surface are calculated on-demand in response)
    const project = await ProjectModel.create({
      ...data,
      panel: data.panelId,
      cultivar: data.projectType === 'agrivoltaic' ? data.cultivarId : undefined,
      owner: userId,
    });

    return transformProjectToResponse(project);
  }

  /**
   * Get project by ID
   * @param projectId Project ID
   * @param userId Requesting user ID (for ownership check)
   * @returns Project data
   */
  async getProjectById(projectId: string, userId?: string): Promise<ProjectResponse> {
    const project = await ProjectModel.findById(projectId)
      .populate('panel')
      .populate('owner', 'fullName email');

    if (!project) {
      throw new Error('Project not found');
    }

    // Check ownership if userId provided (non-admin access)
    if (userId && project.owner && project.owner.toString() !== userId) {
      throw new Error('Not authorized to view this project');
    }

    return transformProjectToResponse(project);
  }

  async updateProject(userId: string, projectId: string, data: ProjectUpdateInput): Promise<ProjectResponse> {
    // Find existing project
    const project = await ProjectModel.findById(projectId);
    if (!project) throw new Error('Project not found');
    
    // Check ownership for non-admin
    if (userId && project.owner?.toString() !== userId) {
      throw new Error('Not authorized');
    }

    // Update project (lat, lon, surface are calculated on-demand in response)
    const updated = await ProjectModel.findByIdAndUpdate(projectId, data, { new: true });
    
    if (!updated) throw new Error('Failed to update project');
    return transformProjectToResponse(updated);
  }

  /**
   * List/filter projects
   * @param filters Query filters
   * @param userId Requesting user ID (filter by owner if not admin)
   * @returns List of projects
   */
  async listProjects(filters: ProjectQueryInput, userId?: string): Promise<ProjectListResponse> {
    // Extract pagination params with defaults
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // If single ID requested, return that project
    if (filters.id) {
      const project = await this.getProjectById(filters.id, userId);
      return { 
        data: [project], 
        total: 1,
        page: 1,
        limit: 1,
        totalPages: 1,
      };
    }

    // Build query
    const query: FilterQuery<IProject> = {};

    // Owner filter
    if (filters.owner) {
      query.owner = filters.owner;
    } else if (userId) {
      // If not admin and no specific owner filter, show only user's projects
      query.owner = userId;
    }

    // Country filter
    if (filters.country) {
      query.country = filters.country;
    }

    // Date range filter (installDate)
    if (filters.from || filters.to) {
      const dateQuery: Record<string, Date> = {};
      if (filters.from) {
        dateQuery.$gte = filters.from;
      }
      if (filters.to) {
        dateQuery.$lte = filters.to;
      }
      (query as Record<string, unknown>).installDate = dateQuery;
    }

    // Search by name
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Execute query with pagination
    const [projects, total] = await Promise.all([
      ProjectModel.find(query)
        .populate('panel')
        .populate('owner', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ProjectModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: projects.map(transformProjectToResponse),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Delete project
   * @param projectId Project ID
   * @param userId Owner user ID
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Verify ownership
    if (project.owner?.toString() !== userId) {
      throw new Error('Not authorized to delete this project');
    }

    await ProjectModel.findByIdAndDelete(projectId);
  }

  /**
   * Admin delete project (bypass ownership check)
   * @param projectId Project ID
   */
  async adminDeleteProject(projectId: string): Promise<void> {
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    await ProjectModel.findByIdAndDelete(projectId);
  }

  /**
   * Get user dashboard statistics
   * @param userId User ID
   * @returns Dashboard stats
   */
  async getUserDashboard(userId: string): Promise<DashboardStats> {
    // Get user's projects
    const projects = await ProjectModel.find({ owner: userId })
      .populate('panel')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalProjects = projects.length;
    const totalPanels = projects.reduce((sum, p) => sum + p.panelNumber, 0);

    // Calculate total capacity (requires populated panel data)
    const totalCapacity = projects.reduce((sum, p) => {
      if (p.panel && typeof p.panel !== 'string' && 'wattPeak' in p.panel) {
        const panel = p.panel as unknown as IPanel;
        return sum + (panel.wattPeak * p.panelNumber) / 1000; // Convert W to kW
      }
      return sum;
    }, 0);

    // Calculate total estimated annual production (kWh/year) using capacity and location
    const totalProduction = projects.reduce((sum, p) => {
      if (p.panel && typeof p.panel !== 'string' && 'wattPeak' in p.panel) {
        const panel = p.panel as unknown as IPanel;
        const capacityKw = (panel.wattPeak * p.panelNumber) / 1000;
        const peakSunHours = p.lat ? Math.max(2, 5.5 - Math.abs(p.lat) * 0.02) : 4;
        return sum + capacityKw * peakSunHours * 365 * 0.85;
      }
      return sum;
    }, 0);

    // Get recent projects (last 5)
    const recentProjects = projects.slice(0, 5).map(transformProjectToResponse);

    return {
      totalProjects,
      totalPanels,
      totalCapacity,
      totalProduction,
      recentProjects,
    };
  }

  /**
   * Get admin dashboard statistics
   * @returns Dashboard stats for all projects
   */
  async getAdminDashboard(): Promise<DashboardStats> {
    // Get all projects
    const projects = await ProjectModel.find().populate('panel').sort({ createdAt: -1 });

    // Calculate statistics (same logic as user dashboard but for all projects)
    const totalProjects = projects.length;
    const totalPanels = projects.reduce((sum, p) => sum + p.panelNumber, 0);

    const totalCapacity = projects.reduce((sum, p) => {
      if (p.panel && typeof p.panel !== 'string' && 'wattPeak' in p.panel) {
        const panel = p.panel as unknown as IPanel;
        return sum + (panel.wattPeak * p.panelNumber) / 1000; // Convert W to kW
      }
      return sum;
    }, 0);

    const totalProduction = projects.reduce((sum, p) => {
      if (p.panel && typeof p.panel !== 'string' && 'wattPeak' in p.panel) {
        const panel = p.panel as unknown as IPanel;
        const capacityKw = (panel.wattPeak * p.panelNumber) / 1000;
        const peakSunHours = p.lat ? Math.max(2, 5.5 - Math.abs(p.lat) * 0.02) : 4;
        return sum + capacityKw * peakSunHours * 365 * 0.85;
      }
      return sum;
    }, 0);

    const recentProjects = projects.slice(0, 5).map(transformProjectToResponse);

    return {
      totalProjects,
      totalPanels,
      totalCapacity,
      totalProduction,
      recentProjects,
    };
  }

  /**
   * Calculate optimal panel configuration
   * @param data Configuration parameters
   * @returns Optimal configuration recommendations
   */
  async calculateOptimalConfig(data: OptimalConfigInput): Promise<OptimalConfigResponse> {
    const { surfaceArea, panelWidth, panelHeight, tilt, latitude, wattPeak } = data;

    // Panel dimensions are already in metres
    const W = panelWidth;
    const H = panelHeight;
    const tiltRad = (tilt * Math.PI) / 180;

    // Calculate shadow-based optimal row spacing:
    // d = H × sin(α) / tan(β)  where β = 90° − |lat| − 23.45°
    const betaDeg = 90 - Math.abs(latitude) - 23.45;
    let recommendedRowSpacing: number;
    if (betaDeg <= 0) {
      recommendedRowSpacing = H * 3; // extreme latitude fallback
    } else {
      const betaRad = (betaDeg * Math.PI) / 180;
      recommendedRowSpacing = (H * Math.sin(tiltRad)) / Math.tan(betaRad);
    }
    // Enforce a minimum of 0.6 m for maintenance access
    recommendedRowSpacing = Math.max(recommendedRowSpacing, 0.6);
    // Round to 2 decimal places
    recommendedRowSpacing = Math.round(recommendedRowSpacing * 100) / 100;

    // panelFootprint = W × (H × cos(α) + d)
    const panelFootprint = W * (H * Math.cos(tiltRad) + recommendedRowSpacing);

    // Utilisation factor: 85% for roof (default)
    const utilisation = 0.85;
    const usableArea = surfaceArea * utilisation;

    const recommendedPanels = panelFootprint > 0
      ? Math.floor(usableArea / panelFootprint)
      : 0;

    // Use actual panel wattage when available, otherwise fall back to 300 W average
    const panelWatts = wattPeak ?? 300;
    const estimatedCapacity = (recommendedPanels * panelWatts) / 1000; // kW

    // Estimate annual production (simplified calculation)
    // Peak sun hours vary by latitude: equator ~5.5h, higher latitudes ~3-4h
    const peakSunHours = 5.5 - Math.abs(latitude) * 0.02; // Rough approximation
    const systemEfficiency = 0.85; // Account for losses
    const estimatedProduction = estimatedCapacity * peakSunHours * 365 * systemEfficiency; // kWh/year

    // Coverage percentage based on raw panel area vs total surface
    const panelArea = W * H;
    const coverage = ((recommendedPanels * panelArea) / surfaceArea) * 100;

    return Promise.resolve({
      recommendedPanels,
      estimatedCapacity,
      estimatedProduction,
      coverage: Math.min(coverage, 100),
      surfaceArea,
      latitude,
      recommendedRowSpacing,
    });
  }

  /**
   * Calculate optimal panel configuration from polygon
   * @param data Polygon configuration parameters
   * @returns Optimal configuration recommendations
   */
  async calculateFromPolygon(data: OptimalConfigFromPolygonInput): Promise<OptimalConfigResponse> {
    const { area, panelId, tilt } = data;

    // Get panel details
    const panel = await PanelModel.findById(panelId);
    if (!panel) {
      throw new Error('Panel not found');
    }

    // Calculate center coordinates for latitude
    const center = getCenter(area.map((point) => ({ latitude: point.lat, longitude: point.lon })));

    if (!center) {
      throw new Error('Could not calculate center of area');
    }

    // Calculate surface area
    const surfaceArea = getAreaOfPolygon(
      area.map((point) => ({ latitude: point.lat, longitude: point.lon }))
    );

    // Call the core calculation method
    // dimensions are stored in mm — convert to metres for the area calculation
    return this.calculateOptimalConfig({
      surfaceArea,
      panelWidth: panel.dimensions.width / 1000,
      panelHeight: panel.dimensions.height / 1000,
      tilt,
      latitude: center.latitude,
      wattPeak: panel.wattPeak,
    });
  }

  /**
   * Get sun path data for project location
   * @param projectId Project ID
   * @returns Sun path calculations
   */
  async getSunPath(projectId: string): Promise<SunPathData> {
    const project = await ProjectModel.findById(projectId);

    if (!project || !project.lat || !project.lon) {
      throw new Error('Project not found or missing coordinates');
    }

    // Simplified sun path calculation
    // In production, use a library like suncalc or call an external API
    const latitude = project.lat;

    // Calculate solar declination and hour angle for key times of year
    const sunPathData = {
      latitude,
      summerSolstice: this.calculateSunPosition(latitude, 23.5), // June 21
      winterSolstice: this.calculateSunPosition(latitude, -23.5), // Dec 21
      equinox: this.calculateSunPosition(latitude, 0), // Mar 21 / Sep 21
    };

    return sunPathData;
  }

  /**
   * Helper: Calculate sun position for given latitude and declination
   */
  private calculateSunPosition(latitude: number, declination: number) {
    const latRad = (latitude * Math.PI) / 180;
    const decRad = (declination * Math.PI) / 180;

    // Solar noon altitude
    const noonAltitude = 90 - latitude + declination;

    // Sunrise/sunset hour angle
    const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
    const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosHourAngle)));
    const daylightHours = (2 * hourAngle * 180) / Math.PI / 15;

    return {
      noonAltitude: Math.max(0, noonAltitude),
      daylightHours,
      sunrise: 12 - daylightHours / 2,
      sunset: 12 + daylightHours / 2,
    };
  }

  /**
   * Generate plan data for PDF
   * @param projectId Project ID
   * @returns Structured plan data
   */
  async generatePlanData(projectId: string): Promise<PlanData> {
    const project = await ProjectModel.findById(projectId)
      .populate('panel')
      .populate('owner', 'fullName email');

    if (!project) {
      throw new Error('Project not found');
    }

    // Calculate additional metrics
    let totalCapacityKw = 0;
    let panelDetails: PlanData['panelDetails'] = null;

    if (project.panel && typeof project.panel !== 'string' && 'wattPeak' in project.panel) {
      const panel = project.panel as unknown as IPanel;
      totalCapacityKw = (panel.wattPeak * project.panelNumber) / 1000;
      panelDetails = {
        name: `${panel.brand} ${panel.model}`,
        capacity: panel.wattPeak,
        width: panel.dimensions.width,
        height: panel.dimensions.height,
        technology: panel.technology || 'N/A',
      };
    }

    // Estimate annual production (simplified)
    const peakSunHours = project.lat ? 5.5 - Math.abs(project.lat) * 0.02 : 5;
    const estimatedAnnualProduction = totalCapacityKw * peakSunHours * 365 * 0.85;

    // Return structured data for PDF generation
    return {
      project: transformProjectToResponse(project),
      panelDetails,
      totalCapacityKw,
      estimatedAnnualProduction,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const projectService = new ProjectService();
