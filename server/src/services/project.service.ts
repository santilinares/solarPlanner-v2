import { HydratedDocument, FilterQuery } from 'mongoose';
import { getCenter, getAreaOfPolygon } from 'geolib';
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
  CallerContext,
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
    totalProd: project.totalProd,
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

    // TODO - [SEVERIDAD MEDIA] El documento se crea en BD antes de completar las integraciones externas
    // (Solcast, precio de electricidad). Si el update posterior falla, el proyecto queda en un estado
    // inconsistente: creado pero sin datos de producción, país ni timezone.
    // Considerar acumular todos los datos primero y crear el documento solo cuando todo esté listo,
    // o usar una transacción de MongoDB para hacer el create + update atómicos.
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

    console.info(`[Project Creation] Starting API integrations for (${lat}, ${lon})`);

    // Priority 1 API Integrations
    // Run synchronous operations inline and async operations in parallel
    let resolvedCountry: { name: string; code: string } | undefined;
    let resolvedTimezone: string | undefined;

    try {
      resolvedCountry = this.resolveCountry(lat, lon, undefined);
      console.info(`[Project Creation] Country resolved: ${resolvedCountry?.name} (${resolvedCountry?.code})`);
    } catch (error) {
      console.warn('[Project Creation] Country resolution error:', error);
    }

    try {
      resolvedTimezone = this.resolveTimezone(lat, lon, undefined);
      console.info(`[Project Creation] Timezone resolved: ${resolvedTimezone}`);
    } catch (error) {
      console.warn('[Project Creation] Timezone resolution error:', error);
    }

    const [priceData, productionData] = await Promise.all([
      // 1.3 Electricity price lookup
      this.fetchElectricityPrice(resolvedCountry?.code ?? '', undefined, undefined).catch((error) => {
        console.warn('[Project Creation] Price lookup error:', error);
        return { price: undefined, currency: undefined };
      }),

      // 1.4 Solcast integration (fetch production data)
      lat && lon && data.panelId
        ? (async () => {
            try {
              const panel = await PanelModel.findById(data.panelId);
              if (panel) {
                const capacityKw = (panel.wattPeak * data.panelNumber) / 1000;
                console.info(`[Project Creation] Fetching Solcast data for capacity ${capacityKw}kW`);
                return await this.fetchSolcastData(lat, lon, capacityKw);
              }
              return { prodToday: [], nextProd: [], previousProd: [] };
            } catch (error) {
              console.warn('[Project Creation] Solcast integration error:', error);
              return { prodToday: [], nextProd: [], previousProd: [] };
            }
          })()
        : Promise.resolve({ prodToday: [], nextProd: [], previousProd: [] }),
    ]);

    // Update project with resolved data
    console.info('[Project Creation] Updating project with resolved data:', {
      country: resolvedCountry?.name,
      timezone: resolvedTimezone,
      currency: priceData.currency,
      price: priceData.price,
      prodTodayCount: productionData.prodToday.length,
      nextProdCount: productionData.nextProd.length,
      previousProdCount: productionData.previousProd.length,
    });

    const updatedProject = await ProjectModel.findByIdAndUpdate(
      project._id,
      {
        country: resolvedCountry?.name,
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

    console.info(`[Project Creation] ✅ Successfully created project ${updatedProject._id.toString()} with all integrations`);

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
  async getProjectById(projectId: string, caller: CallerContext): Promise<ProjectResponse> {
    const project = await ProjectModel.findById(projectId)
      .populate('panel')
      .populate('owner', 'fullName email');

    if (!project) {
      throw new Error('Project not found');
    }

    if (caller.role !== 'admin' && project.owner) {
      const ownerId =
        typeof project.owner === 'object' && project.owner !== null && '_id' in project.owner
          ? (project.owner as { _id: { toString(): string } })._id.toString()
          : (project.owner as unknown as { toString(): string }).toString();
      if (ownerId !== caller.userId) {
        throw new Error('Not authorized to view this project');
      }
    }

    return transformProjectToResponse(project);
  }

  async updateProject(caller: CallerContext, projectId: string, data: ProjectUpdateInput): Promise<ProjectResponse> {
    const project = await ProjectModel.findById(projectId);
    if (!project) throw new Error('Project not found');

    if (caller.role !== 'admin' && project.owner?.toString() !== caller.userId) {
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
  async listProjects(filters: ProjectQueryInput, caller: CallerContext): Promise<ProjectListResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    if (filters.id) {
      const project = await this.getProjectById(filters.id, caller);
      return {
        data: [project],
        total: 1,
        page: 1,
        limit: 1,
        totalPages: 1,
      };
    }

    const query: FilterQuery<IProject> = {};

    if (filters.owner) {
      query.owner = filters.owner;
    } else if (caller.role !== 'admin') {
      query.owner = caller.userId;
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
    // TODO - Sin límite de proyectos: si un usuario tiene cientos de proyectos, se cargan todos en memoria con populate('panel').
    // Considerar añadir un límite o calcular los agregados con una query de aggregation en MongoDB en lugar de en JS.
    // TODO - Duplicación: esta función y getAdminDashboard contienen la misma lógica de cálculo. Extraer a un método privado compartido.
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
        //TODO - Como hacer este cálculo más robusto?
        const peakSunHours = p.lat ? Math.max(2, 5.5 - Math.abs(p.lat) * 0.02) : 4;
        return sum + capacityKw * peakSunHours * 365 * 0.85;
      }
      return sum;
    }, 0);

    // Aggregate real production data across all user projects
    const todayProduction = projects.reduce((sum, p) => {
      return sum + (p.prodToday ?? []).reduce((s, point) => s + point.pv, 0);
    }, 0);

    const next6DaysTotal = projects.reduce((sum, p) => {
      return sum + (p.nextProd ?? []).reduce((s, point) => s + point.pv, 0);
    }, 0);

    const past6DaysTotal = projects.reduce((sum, p) => {
      return sum + (p.previousProd ?? []).reduce((s, point) => s + point.pv, 0);
    }, 0);

    // Get recent projects (last 5)
    const recentProjects = projects.slice(0, 5).map(transformProjectToResponse);

    return {
      totalProjects,
      totalPanels,
      totalCapacity,
      totalProduction,
      recentProjects,
      todayProduction,
      next6DaysTotal,
      past6DaysTotal,
    };
  }

  /**
   * Get admin dashboard statistics
   * @returns Dashboard stats for all projects
   */
  async getAdminDashboard(): Promise<DashboardStats> {
    // TODO - Peligro de rendimiento: carga TODOS los proyectos de todos los usuarios en memoria sin ningún límite.
    // En producción con miles de proyectos esto puede agotar la memoria del servidor.
    // Refactorizar usando aggregation pipeline de MongoDB para calcular los totales directamente en la BD.
    // TODO - Duplicación: misma lógica que getUserDashboard. Extraer a un método privado compartido.
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

    const todayProduction = projects.reduce((sum, p) => {
      return sum + (p.prodToday ?? []).reduce((s, point) => s + point.pv, 0);
    }, 0);

    const next6DaysTotal = projects.reduce((sum, p) => {
      return sum + (p.nextProd ?? []).reduce((s, point) => s + point.pv, 0);
    }, 0);

    const past6DaysTotal = projects.reduce((sum, p) => {
      return sum + (p.previousProd ?? []).reduce((s, point) => s + point.pv, 0);
    }, 0);

    return {
      totalProjects,
      totalPanels,
      totalCapacity,
      totalProduction,
      recentProjects,
      todayProduction,
      next6DaysTotal,
      past6DaysTotal,
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
    //TODO - Revisar que esta formula se aplica correctamente. Por que hay datos hardcoadeados? Explicaciónd de por qué revisarlo:
    /**
     * La fórmula de espaciado d = H × sin(α) / tan(β) asume implícitamente que los paneles están orientados al sur (azimut 180°). 
     * Si un panel está orientado al este u oeste, las sombras caen de forma diferente y el espaciado necesario es distinto. 
     * El azimut está guardado en el proyecto pero no se usa aquí.
     */
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
    //TODO - No sólo debería ser por acceso a manetimiento sino porque pueden generarse sombra entre los paneles si se acercan mucho y de la inclinación.
    recommendedRowSpacing = Math.max(recommendedRowSpacing, 0.6);
    // Round to 2 decimal places
    recommendedRowSpacing = Math.round(recommendedRowSpacing * 100) / 100;

    // panelFootprint = W × (H × cos(α) + d)
    const panelFootprint = W * (H * Math.cos(tiltRad) + recommendedRowSpacing);

    // Utilisation factor: 85% for roof (default)
    //TODO - Hay alguna manera de no tener que asumir el porcentaje de area aprovechable?
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
    //TODO - Usar API para calcular las horas de sol
    const peakSunHours = 5.5 - Math.abs(latitude) * 0.02; // Rough approximation
    //TODO - Modificar para que tenga en cuenta factores reales, como sombras, orientacion, nubes, inversor, etc.
    const systemEfficiency = 0.85; // Account for losses
    const estimatedProduction = estimatedCapacity * peakSunHours * 365 * systemEfficiency; // kWh/year

    // Coverage percentage based on raw panel area vs total surface
    // TODO - Revisar este cálculo. Explicación:
    /**
     * coverage = (recommendedPanels × panelArea) / surfaceArea × 100
     * El coverage se calcula como área física de los paneles vs área total, 
     * pero ignora el espacio de los pasillos entre filas. 
     * No es un error grave, pero da la impresión de que "solo se cubre un X% 
     * de la superficie" cuando en realidad los paneles + sus pasillos ocupan mucho más.
     */
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
   * Quick visitor estimate from polygon — no auth, fixed panel size
   * Panel: 2m × 4m, row spacing: 2m, tilt: 30°, utilisation: 85%
   */
  async estimateFromPolygon(area: GeoPointInput[]): Promise<{ panelCount: number; areaSqm: number; estimatedKwp: number }> {
    const geoPoints = area.map((p) => ({ latitude: p.lat, longitude: p.lon }));
    const areaSqm = getAreaOfPolygon(geoPoints);

    // Fixed panel dimensions: 2m wide × 4m tall, 2m row spacing
    const panelW = 2;
    const panelH = 4;
    const rowSpacing = 2;
    const footprint = panelW * (panelH + rowSpacing);
    const usableArea = areaSqm * 0.85;
    const panelCount = footprint > 0 ? Math.max(0, Math.floor(usableArea / footprint)) : 0;

    // Assume 400 W per panel (typical standard panel)
    const estimatedKwp = (panelCount * 400) / 1000;

    return { panelCount, areaSqm, estimatedKwp };
  }

  /**
   * Get sun path data for project location
   * @param projectId Project ID
   * @returns Sun path calculations
   */
  async getSunPath(projectId: string, caller: CallerContext): Promise<SunPathData> {
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    if (caller.role !== 'admin' && project.owner?.toString() !== caller.userId) {
      throw new Error('Not authorized to view this project');
    }

    // lat/lon are not stored in the DB — derive them from the area polygon
    const geo = calculateGeospatialFields(project.area);
    if (!geo.lat || !geo.lon) {
      throw new Error('Project has no defined area polygon');
    }

    const latitude = geo.lat;

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
    //TODO - Revisar que el cálculo. Se sugiere esto: noonAltitude = 90 - |latitude - declination|
    const noonAltitude = 90 - latitude + declination;

    // Sunrise/sunset hour angle
    const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
    const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosHourAngle)));
    const daylightHours = (2 * hourAngle * 180) / Math.PI / 15;

    return {
      noonAltitude: Math.max(0, noonAltitude),
      daylightHours,
      //TODO - Revisar cálculos de sunrise/sunset. Explicación:
      /**
       * sunrise = 12 - daylightHours / 2
       * sunset = 12 + daylightHours / 2
       * Se asume que el mediodía solar es a las 12:00 UTC, lo cual solo es 
       * correcto en el meridiano 0°. Para cualquier otra longitud hay una desviación, 
       * y la ecuación del tiempo añade hasta ±16 minutos adicionales. 
       * No es crítico para los cálculos de producción, pero los horarios mostrados al 
       * usuario pueden estar desfasados hasta 1-2 horas
       */
      sunrise: 12 - daylightHours / 2,
      sunset: 12 + daylightHours / 2,
    };
  }

  /**
   * Generate plan data for PDF
   * @param projectId Project ID
   * @returns Structured plan data
   */
  async generatePlanData(projectId: string, caller: CallerContext): Promise<PlanData> {
    const project = await ProjectModel.findById(projectId)
      .populate('panel')
      .populate('owner', 'fullName email');

    if (!project) {
      throw new Error('Project not found');
    }

    if (caller.role !== 'admin' && project.owner) {
      const ownerId =
        typeof project.owner === 'object' && project.owner !== null && '_id' in project.owner
          ? (project.owner as { _id: { toString(): string } })._id.toString()
          : (project.owner as unknown as { toString(): string }).toString();
      if (ownerId !== caller.userId) {
        throw new Error('Not authorized to view this project');
      }
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
   * 2.3 Refresh a project's production data (called by the nightly scheduler)
   * Re-fetches Solcast data and accumulates totalProd
   */
  async refreshProductionData(projectId: string): Promise<void> {
    const project = await ProjectModel.findById(projectId).populate('panel');
    if (!project || !project.lat || !project.lon) {
      console.warn(`[Scheduler] Skipping project ${projectId}: missing location or not found`);
      return;
    }

    // TODO - Fallback silencioso: si el proyecto no tiene panel asociado, se usa 1 kW por defecto sin ningún aviso.
    // Esto hace que totalProd se acumule con datos de una capacidad ficticia. Considerar saltar el refresh o loguear un warning más visible.
    let capacityKw = 1;
    if (project.panel && typeof project.panel !== 'string' && 'wattPeak' in project.panel) {
      const panel = project.panel as unknown as { wattPeak: number };
      capacityKw = (panel.wattPeak * project.panelNumber) / 1000;
    }

    const production = await this.fetchSolcastData(project.lat, project.lon, capacityKw);
    const todaySum = production.prodToday.reduce((sum, p) => sum + p.pv, 0);

    await ProjectModel.findByIdAndUpdate(projectId, {
      prodToday: production.prodToday,
      nextProd: production.nextProd,
      previousProd: production.previousProd,
      $inc: { totalProd: todaySum },
    });

    console.info(`[Scheduler] Refreshed production for project ${projectId} (+${todaySum.toFixed(2)} kWh)`);
  }

  /**
   * 1.1 Resolve country from latitude and longitude
   * Uses reverse geocoding to get country name and code
   */
  private resolveCountry(
    lat: number | undefined,
    lon: number | undefined,
    fallback?: { name: string; code: string }
  ): { name: string; code: string } | undefined {
    if (!lat || !lon) {
      return fallback;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const CRG = require('country-reverse-geocoding').country_reverse_geocoding;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const crg = CRG();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = crg.get_country(lat, lon) as { code: string; name: string } | null;
      if (result && result.name) {
        return { name: result.name, code: result.code };
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

  //TODO - Implementar usando entsoe.eu API para los precios de electricidad.
  /**
   * 1.3 Fetch electricity price
   * Falls back to provided defaults if API call fails
   */
  // private async fetchElectricityPrice(
  //   countryCode: string,
  //   fallbackPrice?: number,
  //   fallbackCurrency?: string
  // ): Promise<{ price: number | undefined; currency: string | undefined }> {

  // }

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
  //TODO - Se esta haciendo un fetch de 168 horas = 7 días pero estamos mostrando 6. Ver esto
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
  //TODO - Borrar y hacer pruebas reales con datos de Solcast
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
      //TODO - Modificar para que esto no sea random, sino que pille datos históricos de nubosidad por día.
      const dayVariation = 0.7 + Math.random() * 0.3; // 70-100% of clear-sky production
      //TODO - De donde sale ese system efficiency del 75%? Como puedo hacer que este valor sea calculado de unas variables?
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
      //TODO - Modificar para que esto no sea random, sino que pille datos históricos de nubosidad por día.
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
    //TODO - Por qué quedarme con 6 días? Si en teoría tengo acceso a más? Explorar añadir mas de forecast o sino de past data.
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

    // TODO - Verificar unidades: Solcast devuelve pv_estimate en kW promedio por período (normalmente 30 min).
    // Para convertir a kWh hay que multiplicar cada valor por 0.5 (duración del período en horas).
    // Si los totales diarios son el doble de lo esperado, es este factor el que falta.
    // Corrección: values.reduce((a, b) => a + b * 0.5, 0)
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

    // TODO - Mismo problema de unidades que en nextProd: pv_estimate está en kW por período, no en kWh.
    // Aplicar el mismo factor × 0.5 si los períodos son de 30 min.
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
