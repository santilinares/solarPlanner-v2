import { HydratedDocument, FilterQuery } from 'mongoose';
import { getCenter, getAreaOfPolygon } from 'geolib';
import { ProjectModel, IProject } from '../models/project.model';
import { PanelModel, IPanel } from '../models/panel.model';
import {
  ProjectCreateInput,
  ProjectQueryInput,
  OptimalConfigInput,
  OptimalConfigFromPolygonInput,
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
 * Transform project document to response format
 */
const transformProjectToResponse = (project: HydratedDocument<IProject>): ProjectResponse => ({
  _id: project._id.toString(),
  name: project.name,
  area: project.area,
  lat: project.lat,
  lon: project.lon,
  surface: project.surface,
  country: project.country,
  timezone: project.timezone,
  currency: project.currency,
  price: project.price,
  tilt: project.tilt,
  direction: project.direction,
  azimuth: project.azimuth,
  rawSpacing: project.rawSpacing,
  panelNumber: project.panelNumber,
  panel: project.panel?.toString(),
  owner: project.owner?.toString(),
  prodToday: project.prodToday,
  nextProd: project.nextProd,
  previousProd: project.previousProd,
  installDate: project.installDate.toISOString(),
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

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

    // Calculate center coordinates from polygon
    const center = getCenter(
      data.area.map((point) => ({ latitude: point.lat, longitude: point.lon }))
    );

    // Calculate surface area in square meters
    const surface = getAreaOfPolygon(
      data.area.map((point) => ({ latitude: point.lat, longitude: point.lon }))
    );

    // Create project
    const project = await ProjectModel.create({
      ...data,
      panel: data.panelId,
      owner: userId,
      lat: center ? center.latitude : undefined,
      lon: center ? center.longitude : undefined,
      surface,
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

  /**
   * List/filter projects
   * @param filters Query filters
   * @param userId Requesting user ID (filter by owner if not admin)
   * @returns List of projects
   */
  async listProjects(filters: ProjectQueryInput, userId?: string): Promise<ProjectListResponse> {
    // If single ID requested, return that project
    if (filters.id) {
      const project = await this.getProjectById(filters.id, userId);
      return { projects: [project], total: 1 };
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

    // Execute query
    const [projects, total] = await Promise.all([
      ProjectModel.find(query)
        .populate('panel')
        .populate('owner', 'fullName email')
        .sort({ createdAt: -1 }),
      ProjectModel.countDocuments(query),
    ]);

    return {
      projects: projects.map(transformProjectToResponse),
      total,
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

    // Calculate total production today
    const totalProduction = projects.reduce((sum, p) => {
      if (p.prodToday && p.prodToday.length > 0) {
        return sum + p.prodToday.reduce((pSum, point) => pSum + point.pv, 0);
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
      if (p.prodToday && p.prodToday.length > 0) {
        return sum + p.prodToday.reduce((pSum, point) => pSum + point.pv, 0);
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
    const { surfaceArea, panelWidth, panelHeight, tilt, latitude } = data;

    // Calculate panel area
    const panelArea = panelWidth * panelHeight; // m²

    // Account for tilt (increases effective space needed)
    // As tilt increases, rows need more spacing to avoid shading
    const tiltFactor = 1 + (tilt / 90) * 0.3; // Up to 30% more space at 90° tilt

    // Calculate usable surface area (accounting for spacing and tilt)
    const usableSurfaceArea = surfaceArea * 0.8; // 80% utilization
    const effectivePanelArea = panelArea * tiltFactor;

    // Calculate recommended number of panels
    const recommendedPanels = Math.floor(usableSurfaceArea / effectivePanelArea);

    // Estimate capacity (assuming 300W per panel as average)
    const avgPanelCapacity = 300; // Watts
    const estimatedCapacity = (recommendedPanels * avgPanelCapacity) / 1000; // kW

    // Estimate annual production (simplified calculation)
    // Peak sun hours vary by latitude: equator ~5.5h, higher latitudes ~3-4h
    const peakSunHours = 5.5 - Math.abs(latitude) * 0.02; // Rough approximation
    const systemEfficiency = 0.85; // Account for losses
    const estimatedProduction = estimatedCapacity * peakSunHours * 365 * systemEfficiency; // kWh/year

    // Coverage percentage
    const coverage = ((recommendedPanels * panelArea) / surfaceArea) * 100;

    return Promise.resolve({
      recommendedPanels,
      estimatedCapacity,
      estimatedProduction,
      coverage: Math.min(coverage, 100),
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
    return this.calculateOptimalConfig({
      surfaceArea,
      panelWidth: panel.dimensions.width,
      panelHeight: panel.dimensions.height,
      tilt,
      latitude: center.latitude,
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
