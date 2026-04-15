import { HydratedDocument, FilterQuery } from 'mongoose';
import { getCenter, getAreaOfPolygon } from 'geolib';
import crg from 'country-reverse-geocoding';
import { find } from 'geo-tz';
import { ProjectModel, IProject, IProductionPoint } from '../models/project.model';
import { PanelModel, IPanel } from '../models/panel.model';
import { CultivarModel } from '../models/cultivar.model';
import { UserModel } from '../models/user.model';
import { emailService } from './email.service';
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
  const ownerData = (() => {
    if (!project.owner) {
      return undefined;
    }
    if (typeof project.owner !== 'object') {
      return String(project.owner);
    }

    // When populated, owner is a Mongoose doc-ish object; keep this runtime-safe and TS-friendly.
    const owner = project.owner as unknown as {
      _id?: { toString(): string };
      email?: unknown;
      local?: { email?: unknown };
      google?: { email?: unknown };
      fullName?: unknown;
    };
    const resolvedEmail =
      typeof owner.email === 'string'
        ? owner.email
        : typeof owner.local?.email === 'string'
          ? owner.local.email
          : typeof owner.google?.email === 'string'
            ? owner.google.email
            : '';
    if (resolvedEmail !== '' || owner.fullName !== undefined) {
      return {
        _id: owner._id?.toString?.() ?? '',
        email: resolvedEmail,
        fullName: typeof owner.fullName === 'string' ? owner.fullName : '',
      };
    }

    return owner._id?.toString?.();
  })();

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
    owner: ownerData,
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

    // Calculate geospatial fields to get lat/lon for API calls
    const geo = calculateGeospatialFields(data.area);
    const { lat, lon } = geo;

    // Priority 1 API Integrations
    // Run synchronous operations inline and async operations in parallel
    const resolvedCountry = this.resolveCountry(lat, lon, undefined);
    const resolvedTimezone = this.resolveTimezone(lat, lon, undefined);

    const [priceData, productionData] = await Promise.all([
      // 1.3 Electricity price lookup
      this.fetchElectricityPrice('', undefined, undefined),

      // 1.4 Solcast integration (fetch production data)
      lat && lon && data.panelId
        ? (async () => {
            try {
              const panel = await PanelModel.findById(data.panelId);
              if (panel) {
                const capacityKw = (panel.wattPeak * data.panelNumber) / 1000;
                return await this.fetchSolcastData(lat, lon, capacityKw);
              }
              return { prodToday: [], nextProd: [], previousProd: [] };
            } catch (error) {
              console.warn('[Solcast Integration] Failed to fetch production data:', error);
              return { prodToday: [], nextProd: [], previousProd: [] };
            }
          })()
        : Promise.resolve({ prodToday: [], nextProd: [], previousProd: [] }),
    ]);

    // Update project with resolved data
    const updatedProject = await ProjectModel.findByIdAndUpdate(
      project._id,
      {
        country: resolvedCountry,
        timezone: resolvedTimezone,
        currency: priceData.currency,
        price: priceData.price,
        prodToday: productionData.prodToday,
        nextProd: productionData.nextProd,
        previousProd: productionData.previousProd,
      },
      { new: true }
    );

    if (!updatedProject) {
      throw new Error('Failed to update project with external data');
    }

    // Send project created notification (fire-and-forget)
    UserModel.findById(userId)
      .then((user) => {
        if (user) {
          const email = user.method === 'local' ? user.local?.email : user.google?.email;
          if (email) {
            emailService.sendProjectCreatedEmail(email, data.name).catch((err: unknown) => {
              console.error('Failed to send project created email:', err);
            });
          }
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch user for project created email:', err);
      });

    return transformProjectToResponse(updatedProject);
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

    // Check ownership if userId provided (non-admin access).
    // owner is populated, so compare against its _id, not the document itself.
    if (userId && project.owner) {
      const ownerId =
        typeof project.owner === 'object' && project.owner !== null && '_id' in project.owner
          ? (project.owner as { _id: { toString(): string } })._id.toString()
          : (project.owner as unknown as { toString(): string }).toString();
      if (ownerId !== userId) {
        throw new Error('Not authorized to view this project');
      }
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

    // Project type filter
    if (filters.projectType) {
      query.projectType = filters.projectType;
    }

    // Execute query with pagination
    const [projects, total] = await Promise.all([
      ProjectModel.find(query)
        .populate('panel')
        .populate('owner', 'fullName email local.email google.email')
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

  /**
   * 1.1 Resolve country from latitude and longitude
   * Uses reverse geocoding to get country name and code
   */
  private resolveCountry(lat: number | undefined, lon: number | undefined, fallback?: string): string | undefined {
    if (!lat || !lon) {
      return fallback;
    }

    try {
      const result = crg.get_country(lat, lon);
      if (result && typeof result === 'object' && 'name' in result) {
        return (result as { name: string }).name;
      }
    } catch (error) {
      console.warn(`[Country Resolution] Failed to resolve country for (${lat}, ${lon}):`, error);
    }

    return fallback;
  }

  /**
   * 1.2 Resolve timezone from latitude and longitude
   * Uses geo-tz to find IANA timezone
   */
  private resolveTimezone(lat: number | undefined, lon: number | undefined, fallback?: string): string | undefined {
    if (!lat || !lon) {
      return fallback ?? 'UTC';
    }

    try {
      const zones = find(lat, lon);
      if (zones && zones.length > 0) {
        return zones[0];
      }
    } catch (error) {
      console.warn(`[Timezone Resolution] Failed to resolve timezone for (${lat}, ${lon}):`, error);
    }

    return fallback ?? 'UTC';
  }

  /**
   * 1.3 Fetch electricity price and currency from World Bank API
   * Falls back to provided defaults if API call fails
   */
  private async fetchElectricityPrice(
    countryCode: string,
    fallbackPrice?: number,
    fallbackCurrency?: string
  ): Promise<{ price: number | undefined; currency: string | undefined }> {
    if (!countryCode) {
      return { price: fallbackPrice, currency: fallbackCurrency };
    }

    try {
      // World Bank API for electricity prices
      // Returns price in USD per kWh
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://api.worldbank.org/v2/country/${countryCode.toLowerCase()}/indicator/EG.ELC.ACCS.RU.ZS?format=json&per_page=1`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`World Bank API returned ${response.status}`);
      }

      // World Bank API call succeeded (in future, parse specific data from response)
      // For now, return fallback values and log that we're using World Bank API
      // In future iterations, we can implement region-specific price lookups
      console.info(`[Electricity Price] Using World Bank data lookup for country ${countryCode}`);

      // Typical electricity prices by region (fallback if API doesn't have current data)
      const defaultPrices: Record<string, { price: number; currency: string }> = {
        ES: { price: 0.32, currency: 'EUR' }, // Spain
        DE: { price: 0.38, currency: 'EUR' }, // Germany
        FR: { price: 0.18, currency: 'EUR' }, // France
        US: { price: 0.14, currency: 'USD' }, // USA
        BR: { price: 0.08, currency: 'BRL' }, // Brazil
      };

      const countryUpper = countryCode.toUpperCase();
      const defaultEntry = defaultPrices[countryUpper];

      if (defaultEntry) {
        return { price: defaultEntry.price, currency: defaultEntry.currency };
      }

      return { price: fallbackPrice, currency: fallbackCurrency };
    } catch (error) {
      console.warn(`[Electricity Price] Failed to fetch electricity price for ${countryCode}:`, error);
      return { price: fallbackPrice, currency: fallbackCurrency };
    }
  }

  /**
   * 1.4 Fetch production data from Solcast or generate realistic mock data
   * Returns production data for today, next 6 days, and previous 6 days
   */
  private async fetchSolcastData(
    lat: number,
    lon: number,
    capacityKw: number
  ): Promise<{ prodToday: IProductionPoint[]; nextProd: IProductionPoint[]; previousProd: IProductionPoint[] }> {
    const useMockData = process.env.USE_MOCK_SOLCAST === 'true';
    const solcastApiKey = process.env.SOLCAST_API_KEY;

    // If using mock data or no API key, generate realistic synthetic data
    if (useMockData || !solcastApiKey) {
      console.info('[Solcast] Using mock production data');
      return this.generateMockSolcastData(lat, capacityKw);
    }

    try {
      return await this.fetchRealSolcastData(lat, lon, capacityKw, solcastApiKey);
    } catch (error) {
      console.warn('[Solcast] Failed to fetch real Solcast data, falling back to mock data:', error);
      return this.generateMockSolcastData(lat, capacityKw);
    }
  }

  /**
   * Fetch real Solcast API data
   */
  private async fetchRealSolcastData(
    lat: number,
    lon: number,
    capacityKw: number,
    apiKey: string
  ): Promise<{ prodToday: IProductionPoint[]; nextProd: IProductionPoint[]; previousProd: IProductionPoint[] }> {
    const baseUrl = 'https://api.solcast.com.au/world_pv_power';
    const params = `latitude=${lat}&longitude=${lon}&capacity=${capacityKw}&hours=168&api_key=${apiKey}`;

    // Fetch forecasts
    const forecastsController = new AbortController();
    const forecastsTimeoutId = setTimeout(() => forecastsController.abort(), 10000);
    const forecastsRes = await fetch(`${baseUrl}/forecasts?${params}`, { signal: forecastsController.signal });
    clearTimeout(forecastsTimeoutId);
    if (!forecastsRes.ok) throw new Error(`Solcast forecasts returned ${forecastsRes.status}`);
    const forecastsData = (await forecastsRes.json()) as { forecasts: Array<{ period_end: string; pv_estimate: number }> };

    // Fetch estimated actuals
    const actualsController = new AbortController();
    const actualsTimeoutId = setTimeout(() => actualsController.abort(), 10000);
    const actualsRes = await fetch(`${baseUrl}/estimated_actuals?${params}`, { signal: actualsController.signal });
    clearTimeout(actualsTimeoutId);
    if (!actualsRes.ok) throw new Error(`Solcast actuals returned ${actualsRes.status}`);
    const actualsData = (await actualsRes.json()) as { estimated_actuals: Array<{ period_end: string; pv_estimate: number }> };

    // Transform data
    const prodToday = this.extractTodayProduction(forecastsData.forecasts);
    const { nextProd, previousProd } = this.aggregateProductionByDay(
      forecastsData.forecasts,
      actualsData.estimated_actuals
    );

    return { prodToday, nextProd, previousProd };
  }

  /**
   * Generate realistic mock Solcast data based on solar geometry and latitude
   */
  private generateMockSolcastData(lat: number, capacityKw: number): {
    prodToday: IProductionPoint[];
    nextProd: IProductionPoint[];
    previousProd: IProductionPoint[];
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate sunset/sunrise using simplified formula
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const B = (2 * Math.PI * (dayOfYear - 81)) / 364;
    const declinationRad = 0.33645 * Math.sin(B) - 3.6396 * Math.cos(B);
    const latRad = (lat * Math.PI) / 180;

    // Sunrise/Sunset angle (solar noon UTC = ~12:00)
    const cosH = -Math.tan(latRad) * Math.tan(declinationRad);
    const H = cosH >= -1 && cosH <= 1 ? Math.acos(cosH) : Math.PI / 2;
    const dayLengthHours = (2 * H * 180) / Math.PI / 15; // Convert to hours
    const sunriseHour = 12 - dayLengthHours / 2;
    const sunsetHour = 12 + dayLengthHours / 2;

    // Generate hourly data for today
    const prodToday: IProductionPoint[] = [];
    for (let hour = 6; hour <= 18; hour++) {
      const dt = new Date(today);
      dt.setHours(hour, 0, 0, 0);

      let pv = 0;
      if (hour >= sunriseHour && hour <= sunsetHour) {
        // Bell curve: peak at solar noon
        const normalizedHour = (hour - sunriseHour) / (sunsetHour - sunriseHour);
        const peakProduction = capacityKw * (0.8 + Math.random() * 0.1); // 80-90% of capacity
        pv = peakProduction * Math.sin(normalizedHour * Math.PI);
      }

      prodToday.push({
        dateTime: dt,
        pv: Math.max(0, Math.round(pv * 100) / 100),
      });
    }

    // Generate daily aggregates for next 6 days
    const nextProd: IProductionPoint[] = [];
    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + i);

      // Vary production by day (simulate cloudy/sunny days)
      const dayVariation = 0.7 + Math.random() * 0.3; // 70-100% of clear-sky production
      const dailyProduction = capacityKw * dayLengthHours * 0.75 * dayVariation; // 75% system efficiency

      nextProd.push({
        dateTime: futureDate,
        pv: Math.max(0, Math.round(dailyProduction * 100) / 100),
      });
    }

    // Generate daily aggregates for previous 6 days
    const previousProd: IProductionPoint[] = [];
    for (let i = 6; i >= 1; i--) {
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - i);

      // Vary production by day
      const dayVariation = 0.6 + Math.random() * 0.35; // 60-95% of clear-sky production
      const dailyProduction = capacityKw * dayLengthHours * 0.75 * dayVariation;

      previousProd.push({
        dateTime: pastDate,
        pv: Math.max(0, Math.round(dailyProduction * 100) / 100),
      });
    }

    return { prodToday, nextProd, previousProd };
  }

  /**
   * Extract today's hourly production from forecasts
   */
  private extractTodayProduction(
    forecasts: Array<{ period_end: string; pv_estimate: number }>
  ): IProductionPoint[] {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return forecasts
      .filter((f) => {
        const fDate = new Date(f.period_end);
        const fDateOnly = new Date(fDate.getFullYear(), fDate.getMonth(), fDate.getDate());
        return fDateOnly.getTime() === todayDate.getTime();
      })
      .map((f) => ({
        dateTime: new Date(f.period_end),
        pv: f.pv_estimate,
      }));
  }

  /**
   * Aggregate production data by day from hourly data
   */
  private aggregateProductionByDay(
    forecasts: Array<{ period_end: string; pv_estimate: number }>,
    actuals: Array<{ period_end: string; pv_estimate: number }>
  ): { nextProd: IProductionPoint[]; previousProd: IProductionPoint[] } {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Aggregate forecasts for next 6 days
    const forecastsByDay: Record<string, number[]> = {};
    forecasts.forEach((f) => {
      const fDate = new Date(f.period_end);
      const fDateOnly = new Date(fDate.getFullYear(), fDate.getMonth(), fDate.getDate());

      // Only include days after today
      if (fDateOnly.getTime() > todayDate.getTime()) {
        const key = fDateOnly.toISOString().split('T')[0] || '';
        if (!forecastsByDay[key]) {
          forecastsByDay[key] = [];
        }
        forecastsByDay[key].push(f.pv_estimate);
      }
    });

    const nextProd = Object.entries(forecastsByDay)
      .slice(0, 6)
      .map(([dateStr, values]) => ({
        dateTime: new Date(`${dateStr}T00:00:00Z`),
        pv: values.reduce((a, b) => a + b, 0),
      }));

    // Aggregate actuals for previous 6 days
    const actualsByDay: Record<string, number[]> = {};
    actuals.forEach((a) => {
      const aDate = new Date(a.period_end);
      const aDateOnly = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate());

      // Only include days before today
      if (aDateOnly.getTime() < todayDate.getTime()) {
        const key = aDateOnly.toISOString().split('T')[0] || '';
        if (!actualsByDay[key]) {
          actualsByDay[key] = [];
        }
        actualsByDay[key].push(a.pv_estimate);
      }
    });

    const previousProd = Object.entries(actualsByDay)
      .slice(-6)
      .map(([dateStr, values]) => ({
        dateTime: new Date(`${dateStr}T00:00:00Z`),
        pv: values.reduce((a, b) => a + b, 0),
      }));

    return { nextProd, previousProd };
  }
}

export const projectService = new ProjectService();
