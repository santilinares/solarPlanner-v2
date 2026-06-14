import { HydratedDocument, Types, startSession } from 'mongoose';
type FilterQuery<_T> = Record<string, any>;
import { getCenter, getAreaOfPolygon } from 'geolib';
import { find } from 'geo-tz';
import { ProjectModel, IProject, IProductionPoint} from '../models/project.model';
import { PanelModel, IPanel } from '../models/panel.model';
import { CultivarModel } from '../models/cultivar.model';
import { UserModel } from '../models/user.model';
import { emailService } from './email.service';
import { productionService, computeTotalSystemLossPct, ProjectProductionParams, TodayAndForecastData } from './production.service';
import { pvgisService, PvgisAnnualResult } from './pvgis.service';
import { entsoeService } from './entsoe.service';
import { openMeteoService } from './openmeteo.service';
import {
  ProjectCreateInput,
  ProjectQueryInput,
  OptimalConfigInput,
  OptimalConfigFromPolygonInput,
  ProjectUpdateInput,
  GeoPointInput,
  ProjectConfigPreviewInput,
} from '../schemas/project.schema';
import {
  ProjectResponse,
  ProjectListResponse,
  DashboardStats,
  OptimalConfigResponse,
  ProjectAnalytics,
  CallerContext,
  PvgisRefResponse,
  ProjectConfigPreview,
  ProjectPanelSummary,
} from '../types/project.types';
import { getCapexPerKwp } from './capex-benchmark.service';
import { CapexSegment } from '../data/capex-benchmarks-eu';

/**
 * Project Service
 * Handles solar project management and calculations.
 *
 * Production data units: all IProductionPoint.pv values are in kWh.
 */

interface SunPathData {
  latitude: number;
  longitude: number;
  timezone: string;
  summerSolstice: SunPosition;
  winterSolstice: SunPosition;
  equinox: SunPosition;
  todaySunlight: TodaySunlight | null;
}

interface SunPosition {
  noonAltitude: number;
  daylightHours: number;
  sunrise?: number;
  sunset?: number;
}

interface TodaySunlight {
  date: string;
  timezone: string;
  sunrise: string;
  sunset: string;
  daylightHours: number;
  sunshineHours: number | null;
  source: 'open-meteo';
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const calculateGeospatialFields = (area: GeoPointInput[]): { lat?: number; lon?: number; surface?: number } => {
  if (!area || area.length < 3) return {};

  try {
    const geoPoints = area.map((p: GeoPointInput) => ({ latitude: p.lat, longitude: p.lon }));
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
 * Extract a populated IPanel document from the panel field of a project.
 * Returns null when the field is an ObjectId (not populated) or absent.
 */
const resolvePopulatedPanel = (panelField: unknown): IPanel | null => {
  if (!panelField || typeof panelField !== 'object') return null;
  if ('wattPeak' in panelField) return panelField as IPanel;
  return null;
};

const resolvePanelId = (panelField: unknown): string | undefined => {
  if (!panelField) return undefined;
  if (typeof panelField === 'string') return panelField;
  if (typeof panelField === 'object') {
    const maybePanel = panelField as { _id?: { toString(): string }; toString?: () => string };
    return maybePanel._id?.toString?.() ?? maybePanel.toString?.();
  }
  return undefined;
};

const buildPanelSummary = (panelField: unknown): string | ProjectPanelSummary | undefined => {
  const id = resolvePanelId(panelField);
  const panel = resolvePopulatedPanel(panelField);
  if (!panel) return id;
  const panelDoc = panel as IPanel & { _id?: { toString(): string } };
  return {
    _id: panelDoc._id?.toString?.() ?? id ?? '',
    id: panelDoc._id?.toString?.() ?? id ?? '',
    brand: panel.brand,
    model: panel.model,
    wattPeak: panel.wattPeak,
    dimensions: panel.dimensions,
    efficiency: panel.efficiency,
    warranty: panel.warranty,
    price: panel.price,
    technology: panel.technology,
    bifacial: panel.bifacial,
    bifacialityFactor: panel.bifacialityFactor,
    degradationFirstYear: panel.degradationFirstYear,
    degradationAnnual: panel.degradationAnnual,
  };
};

/**
 * Build the ProductionParams needed by ProductionService from a project document.
 * Returns null if the project lacks lat/lon.
 */
const toProductionParams = (project: HydratedDocument<IProject>): ProjectProductionParams | null => {
  if (!project.lat || !project.lon) return null;
  return {
    lat: project.lat,
    lon: project.lon,
    tilt: project.tilt,
    azimuth: project.azimuth,
    panelNumber: project.panelNumber,
    installDate: project.installDate,
    albedo: project.albedo,
    dcAcRatio: project.dcAcRatio,
    systemLosses: project.systemLosses,
  };
};

const transformProjectToResponse = (project: HydratedDocument<IProject>): ProjectResponse => {
  const ownerData = (() => {
    if (!project.owner) return undefined;
    if (typeof project.owner !== 'object') return String(project.owner);

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
    lat: project.lat,
    lon: project.lon,
    surface: project.surface,
    country: project.country,
    countryCode: project.countryCode,
    timezone: project.timezone,
    currency: project.currency,
    price: project.price,
    installationCost: project.installationCost,
    segment: project.segment,
    albedo: project.albedo,
    tilt: project.tilt,
    direction: project.direction,
    azimuth: project.azimuth,
    rawSpacing: project.rawSpacing,
    panelNumber: project.panelNumber,
    dcAcRatio: project.dcAcRatio,
    panel: buildPanelSummary(project.panel),
    cultivar: project.cultivar?._id?.toString(),
    owner: ownerData,
    prodToday: project.prodToday,
    nextProd: project.nextProd,
    previousProd: project.previousProd,
    totalProd: project.totalProd,
    lastRefreshedAt: project.lastRefreshedAt?.toISOString(),
    systemLosses: project.systemLosses
      ? {
          inverterEfficiency: project.systemLosses.inverterEfficiency,
          dcWiring: project.systemLosses.dcWiring,
          acWiring: project.systemLosses.acWiring,
          mismatch: project.systemLosses.mismatch,
          soiling: project.systemLosses.soiling,
          degradationExtra: project.systemLosses.degradationExtra,
          shadingStatic: project.systemLosses.shadingStatic,
        }
      : undefined,
    pvgisRef: project.pvgisRef
      ? {
          yearlyKwh: project.pvgisRef.yearlyKwh,
          yearlyKwhPerKwp: project.pvgisRef.yearlyKwhPerKwp,
          monthlyKwh: project.pvgisRef.monthlyKwh,
          yearlyPOAIrradiation: project.pvgisRef.yearlyPOAIrradiation,
        }
      : undefined,
    installDate: project.installDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ProjectService {
  /**
   * Create a new solar project.
   * Resolves geospatial fields, country, timezone, electricity price, and
   * fetches initial production data from Open-Meteo.
   */
  async createProject(userId: string, data: ProjectCreateInput): Promise<ProjectResponse> {
    // 1. Validate referenced documents (panel reused below to avoid a second DB round-trip)
    let panel: Awaited<ReturnType<typeof PanelModel.findById>> | null = null;
    if (data.panelId) {
      panel = await PanelModel.findById(data.panelId);
      if (!panel) throw new Error('Panel not found');
    }
    if (data.projectType === 'agrivoltaic' && data.cultivarId) {
      const cultivar = await CultivarModel.findById(data.cultivarId);
      if (!cultivar) throw new Error('Cultivar not found');
    }

    // 2. Geospatial + country + timezone (synchronous, no network)
    const geo = calculateGeospatialFields(data.area);
    const { lat, lon } = geo;
    console.info(`[Project Creation] Starting API integrations for (${lat}, ${lon})`);

    let resolvedCountry: { name: string; code: string } | undefined;
    let resolvedTimezone: string | undefined;

    try {
      resolvedCountry = this.resolveCountry(lat, lon, undefined);
      console.info(`[Project Creation] Country: ${resolvedCountry?.name} (${resolvedCountry?.code})`);
    } catch (error) {
      console.warn('[Project Creation] Country resolution error:', error);
    }

    try {
      resolvedTimezone = this.resolveTimezone(lat, lon, undefined);
      console.info(`[Project Creation] Timezone: ${resolvedTimezone}`);
    } catch (error) {
      console.warn('[Project Creation] Timezone resolution error:', error);
    }

    // 3. External API calls — completed before the DB transaction so the session stays short
    const priceData = await this.fetchElectricityPrice(resolvedCountry?.code ?? '').catch(
      (error: unknown) => {
        console.warn('[Project Creation] Price lookup error:', error);
        return { price: undefined, currency: undefined };
      },
    );

    let productionData = { prodToday: [] as IProductionPoint[], nextProd: [] as IProductionPoint[], previousProd: [] as IProductionPoint[] };
    let pvgisResult: PvgisAnnualResult | undefined;

    if (lat && lon && panel) {
      try {
        productionData = await productionService.computeProductionData(
          {
            lat,
            lon,
            tilt: data.tilt,
            azimuth: undefined, // azimuth not in create schema, defaults to south
            panelNumber: data.panelNumber,
            installDate: new Date(),
            dcAcRatio: data.dcAcRatio,
            systemLosses: data.systemLosses,
          },
          panel,
        );
        console.info(`[Project Creation] Production data: today=${productionData.prodToday.length}pts, prev=${productionData.previousProd.length}pts, next=${productionData.nextProd.length}pts`);

        // PVGIS reference — called once per project creation, no API key required.
        // Provides annual/monthly production estimate for ROI/payback calculations.
        try {
          const peakpowerKw = (data.panelNumber * panel.wattPeak) / 1000;
          const systemLossPct = computeTotalSystemLossPct(data.systemLosses);
          pvgisResult = await pvgisService.fetchAnnualProduction(
            lat,
            lon,
            peakpowerKw,
            systemLossPct,
            data.tilt,
            undefined, // azimuth not in create schema, defaults to south
          );
          console.info(`[Project Creation] PVGIS: ${pvgisResult.yearlyKwh.toFixed(0)} kWh/year, ${pvgisResult.yearlyKwhPerKwp.toFixed(0)} kWh/kWp`);
        } catch (pvgisError) {
          console.warn('[Project Creation] PVGIS lookup skipped:', pvgisError);
        }
      } catch (error) {
        console.warn('[Project Creation] Production data error:', error);
      }
    }

    const hasProduction = productionData.prodToday.length > 0 || productionData.previousProd.length > 0 || productionData.nextProd.length > 0;

    const pvgisRef: PvgisRefResponse | undefined = pvgisResult
      ? {
          yearlyKwh: pvgisResult.yearlyKwh,
          yearlyKwhPerKwp: pvgisResult.yearlyKwhPerKwp,
          monthlyKwh: pvgisResult.monthlyKwh,
          yearlyPOAIrradiation: pvgisResult.yearlyPOAIrradiation,
        }
      : undefined;

    const enrichedFields = {
      lat: geo.lat,
      lon: geo.lon,
      surface: geo.surface,
      country: resolvedCountry?.name,
      countryCode: resolvedCountry?.code,
      timezone: resolvedTimezone,
      currency: priceData.currency,
      price: priceData.price,
      prodToday: productionData.prodToday,
      nextProd: productionData.nextProd,
      previousProd: productionData.previousProd,
      lastRefreshedAt: hasProduction ? new Date() : undefined,
      ...(pvgisRef && { pvgisRef }),
    };

    // 4. Atomic create + update in a single MongoDB transaction.
    // All external data is already collected; the session only covers fast DB writes.
    // If findByIdAndUpdate fails, the session rollback removes the newly created document.
    const session = await startSession();
    let finalProject!: HydratedDocument<IProject>;

    try {
      await session.withTransaction(async () => {
        const [created] = await ProjectModel.create(
          [{
            ...data,
            panel: data.panelId,
            cultivar: data.projectType === 'agrivoltaic' ? data.cultivarId : undefined,
            owner: userId,
          }],
          { session },
        );

        const updated = await ProjectModel.findByIdAndUpdate(
          created._id,
          enrichedFields,
          { new: true, session },
        );

        if (!updated) throw new Error('Failed to update project with external data');
        finalProject = updated;
      });
    } finally {
      await session.endSession();
    }

    console.info(`[Project Creation] ✅ Project ${finalProject._id.toString()} created`);

    // Fire-and-forget welcome email (outside the transaction — not critical path)
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

    return transformProjectToResponse(finalProject);
  }

  /**
   * Get project by ID.
   * Triggers an on-demand production refresh if data is stale (§5.3).
   */
  async getProjectById(projectId: string, caller: CallerContext): Promise<ProjectResponse> {
    let project = await ProjectModel.findById(projectId)
      .populate('panel')
      .populate('owner', 'fullName email');

    if (!project) throw new Error('Project not found');

    if (caller.role !== 'admin' && project.owner) {
      const ownerId =
        typeof project.owner === 'object' && project.owner !== null && '_id' in project.owner
          ? (project.owner as { _id: { toString(): string } })._id.toString()
          : (project.owner as unknown as { toString(): string }).toString();
      if (ownerId !== caller.userId) throw new Error('Not authorized to view this project');
    }

    // On-demand refresh if production data is stale (§5.3)
    const thresholdMs =
      parseInt(process.env.PRODUCTION_REFRESH_THRESHOLD_H ?? '6', 10) * 3_600_000;
    const isStale =
      !project.lastRefreshedAt ||
      Date.now() - project.lastRefreshedAt.getTime() >= thresholdMs;

    if (isStale && project.lat && project.lon) {
      const panel = resolvePopulatedPanel(project.panel);
      if (panel) {
        try {
          await this.refreshOnDemand(project, panel);
          const updated = await ProjectModel.findById(projectId)
            .populate('panel')
            .populate('owner', 'fullName email');
          if (updated) project = updated;
        } catch (err) {
          console.warn(`[Project] On-demand refresh failed for ${projectId}:`, err);
        }
      }
    }

    return transformProjectToResponse(project);
  }

  async updateProject(
    caller: CallerContext,
    projectId: string,
    data: ProjectUpdateInput,
  ): Promise<ProjectResponse> {
    const project = await ProjectModel.findById(projectId);
    if (!project) throw new Error('Project not found');

    if (caller.role !== 'admin' && project.owner?.toString() !== caller.userId) {
      throw new Error('Not authorized');
    }

    let nextPanel: IPanel | null = resolvePopulatedPanel(project.panel);
    if (data.panelId) {
      nextPanel = await PanelModel.findById(data.panelId);
      if (!nextPanel) throw new Error('Panel not found');
    } else if (!nextPanel && project.panel) {
      nextPanel = await PanelModel.findById(project.panel);
    }

    const geo = data.area ? calculateGeospatialFields(data.area) : {};
    const { panelId, cultivarId, ...rest } = data;
    const updatePayload: Record<string, unknown> = { ...rest, ...geo };
    if (panelId) updatePayload.panel = panelId;
    if (cultivarId) updatePayload.cultivar = cultivarId;

    const solarImpactingFields = [
      'area',
      'panelId',
      'panelNumber',
      'tilt',
      'azimuth',
      'dcAcRatio',
      'systemLosses',
      'albedo',
    ] as const;
    const shouldRecalculateSolar = solarImpactingFields.some((field) => data[field] !== undefined);

    if (shouldRecalculateSolar && nextPanel) {
      const lat = geo.lat ?? project.lat;
      const lon = geo.lon ?? project.lon;
      if (lat && lon) {
        const params: ProjectProductionParams = {
          lat,
          lon,
          tilt: data.tilt ?? project.tilt,
          azimuth: data.azimuth ?? project.azimuth,
          panelNumber: data.panelNumber ?? project.panelNumber,
          installDate: project.installDate,
          albedo: data.albedo ?? project.albedo,
          dcAcRatio: data.dcAcRatio ?? project.dcAcRatio,
          systemLosses: data.systemLosses ?? project.systemLosses,
        };

        try {
          const production = await productionService.computeProductionData(params, nextPanel);
          updatePayload.prodToday = production.prodToday;
          updatePayload.previousProd = production.previousProd;
          updatePayload.nextProd = production.nextProd;
          updatePayload.lastRefreshedAt = new Date();
        } catch (error) {
          console.warn(`[Project Update] Production refresh skipped for ${projectId}:`, error);
        }

        try {
          const peakpowerKw = (params.panelNumber * nextPanel.wattPeak) / 1000;
          const systemLossPct = computeTotalSystemLossPct(params.systemLosses);
          const pvgisResult = await pvgisService.fetchAnnualProduction(
            lat,
            lon,
            peakpowerKw,
            systemLossPct,
            params.tilt,
            params.azimuth,
          );
          updatePayload.pvgisRef = {
            yearlyKwh: pvgisResult.yearlyKwh,
            yearlyKwhPerKwp: pvgisResult.yearlyKwhPerKwp,
            monthlyKwh: pvgisResult.monthlyKwh,
            yearlyPOAIrradiation: pvgisResult.yearlyPOAIrradiation,
          };
        } catch (error) {
          console.warn(`[Project Update] PVGIS refresh skipped for ${projectId}:`, error);
        }
      }
    }

    const updated = await ProjectModel.findByIdAndUpdate(
      projectId,
      updatePayload,
      { new: true },
    );

    if (!updated) throw new Error('Failed to update project');
    return transformProjectToResponse(updated);
  }

  /**
   * List/filter projects.
   */
  async listProjects(filters: ProjectQueryInput, caller: CallerContext): Promise<ProjectListResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    if (filters.id) {
      const project = await this.getProjectById(filters.id, caller);
      return { data: [project], total: 1, page: 1, limit: 1, totalPages: 1 };
    }

    const query: FilterQuery<IProject> = {};

    if (filters.owner) {
      query.owner = filters.owner;
    } else if (caller.role !== 'admin') {
      query.owner = caller.userId;
    }

    if (filters.country) query.country = filters.country;

    if (filters.from || filters.to) {
      const dateQuery: Record<string, Date> = {};
      if (filters.from) dateQuery.$gte = filters.from;
      if (filters.to) dateQuery.$lte = filters.to;
      (query as Record<string, unknown>).installDate = dateQuery;
    }

    if (filters.search) query.$text = { $search: filters.search };
    if (filters.projectType) query.projectType = filters.projectType;

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
    return { data: projects.map(transformProjectToResponse), total, page, limit, totalPages };
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await ProjectModel.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (project.owner?.toString() !== userId) throw new Error('Not authorized to delete this project');
    await ProjectModel.findByIdAndDelete(projectId);
  }

  async adminDeleteProject(projectId: string): Promise<void> {
    const project = await ProjectModel.findById(projectId);
    if (!project) throw new Error('Project not found');
    await ProjectModel.findByIdAndDelete(projectId);
  }

  /**
   * User dashboard statistics.
   * Fires a background refresh for stale projects without blocking the response.
   */
  async getUserDashboard(userId: string): Promise<DashboardStats> {
    const stats = await this.computeDashboardStats({ owner: new Types.ObjectId(userId) });

    // Non-blocking: refresh stale projects in the background
    this.refreshStaleProjectsForUser(userId).catch((err: unknown) => {
      console.warn('[Dashboard] Background refresh error:', err);
    });

    return stats;
  }

  async getAdminDashboard(): Promise<DashboardStats> {
    return this.computeDashboardStats({});
  }

  private async computeDashboardStats(matchFilter: Record<string, unknown>): Promise<DashboardStats> {
    interface DashboardAggregateResult {
      projectStats: Array<{
        totalProjects: number;
        totalPanels: number;
        totalCapacity: number;
        totalProduction: number;
      }>;
      todayStats: Array<{ total: number }>;
      nextStats: Array<{ total: number }>;
      prevStats: Array<{ total: number }>;
    }

    const pipeline = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'panels',
          localField: 'panel',
          foreignField: '_id',
          as: '_panelDoc',
        },
      },
      {
        $addFields: {
          _capacityKw: {
            $divide: [
              {
                $multiply: [
                  { $ifNull: [{ $arrayElemAt: ['$_panelDoc.wattPeak', 0] }, 0] },
                  '$panelNumber',
                ],
              },
              1000,
            ],
          },
          _peakSunHours: {
            $cond: {
              if: { $gt: [{ $ifNull: ['$lat', null] }, null] },
              then: {
                $max: [2, { $subtract: [5.5, { $multiply: [{ $abs: '$lat' }, 0.02] }] }],
              },
              else: 4,
            },
          },
        },
      },
      {
        $addFields: {
          _productionKwh: { $multiply: ['$_capacityKw', '$_peakSunHours', 365, 0.85] },
        },
      },
      {
        $facet: {
          projectStats: [
            {
              $group: {
                _id: null,
                totalProjects: { $sum: 1 },
                totalPanels: { $sum: '$panelNumber' },
                totalCapacity: { $sum: '$_capacityKw' },
                totalProduction: { $sum: '$_productionKwh' },
              },
            },
          ],
          todayStats: [
            { $unwind: { path: '$prodToday', preserveNullAndEmptyArrays: true } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$prodToday.pv', 0] } } } },
          ],
          nextStats: [
            { $unwind: { path: '$nextProd', preserveNullAndEmptyArrays: true } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$nextProd.pv', 0] } } } },
          ],
          prevStats: [
            { $unwind: { path: '$previousProd', preserveNullAndEmptyArrays: true } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$previousProd.pv', 0] } } } },
          ],
        },
      },
    ];

    const [raw, recentDocs] = await Promise.all([
      ProjectModel.aggregate(pipeline),
      ProjectModel.find(matchFilter).populate('panel').sort({ createdAt: -1 }).limit(5),
    ]);

    const result = raw[0] as DashboardAggregateResult;
    const ps = result.projectStats[0];

    return {
      totalProjects: ps?.totalProjects ?? 0,
      totalPanels: ps?.totalPanels ?? 0,
      totalCapacity: ps?.totalCapacity ?? 0,
      totalProduction: ps?.totalProduction ?? 0,
      recentProjects: recentDocs.map(transformProjectToResponse),
      todayProduction: result.todayStats[0]?.total ?? 0,
      next6DaysTotal: result.nextStats[0]?.total ?? 0,
      past6DaysTotal: result.prevStats[0]?.total ?? 0,
    };
  }

  /**
   * Explicit on-demand production refresh (§5.3 — forced via endpoint).
   *
   * Default: recalculates prodToday + nextProd only (previousProd untouched).
   * forceFullRecalc=true: full recalculation of all three windows (e.g. for debugging).
   */
  async refreshProjectProductionOnDemand(
    projectId: string,
    caller: CallerContext,
    forceFullRecalc = false,
  ): Promise<{
    prodToday: IProductionPoint[];
    previousProd: IProductionPoint[];
    nextProd: IProductionPoint[];
    lastRefreshedAt: string;
  }> {
    const project = await ProjectModel.findById(projectId).populate('panel');
    if (!project) throw new Error('Project not found');

    if (caller.role !== 'admin' && project.owner?.toString() !== caller.userId) {
      throw new Error('Not authorized');
    }

    if (!project.lat || !project.lon) {
      throw new Error('Project has no location data; cannot calculate production');
    }

    const panel = resolvePopulatedPanel(project.panel);
    if (!panel) {
      throw new Error('No panel associated with project; cannot calculate production');
    }

    const params = toProductionParams(project)!;
    const refreshedAt = new Date();

    if (forceFullRecalc) {
      // Full recalc: rebuild all three windows from Open-Meteo history + forecast
      const production = await productionService.computeProductionData(params, panel);
      await ProjectModel.findByIdAndUpdate(projectId, {
        ...production,
        lastRefreshedAt: refreshedAt,
      });
      return {
        prodToday: production.prodToday,
        previousProd: production.previousProd,
        nextProd: production.nextProd,
        lastRefreshedAt: refreshedAt.toISOString(),
      };
    }

    // On-demand: update only prodToday + nextProd; previousProd remains as stored
    const { prodToday, nextProd } = await this.refreshOnDemand(project, panel);

    return {
      prodToday,
      previousProd: project.previousProd ?? [],
      nextProd,
      lastRefreshedAt: refreshedAt.toISOString(),
    };
  }

  /**
   * Nightly refresh called by the scheduler (§5.2).
   *
   * Flow:
   *   1. Accumulate stored prodToday into totalProd (day that just ended)
   *   2. Roll prodToday → previousProd and trim to last PRODUCTION_HISTORY_DAYS
   *   3. Clear prodToday
   *   4. Fetch fresh nextProd forecast from Open-Meteo
   *   5. Persist and update lastRefreshedAt
   */
  async refreshProductionData(projectId: string): Promise<void> {
    const project = await ProjectModel.findById(projectId).populate('panel');
    if (!project || !project.lat || !project.lon) {
      console.warn(`[Scheduler] Skipping ${projectId}: missing location or not found`);
      return;
    }

    const panel = resolvePopulatedPanel(project.panel);
    if (!panel) {
      console.warn(`[Scheduler] Skipping ${projectId}: no panel associated`);
      return;
    }

    const params = toProductionParams(project);
    if (!params) return;

    // §5.2.5 — Accumulate the day that just ended before rolling over
    const storedToday = project.prodToday ?? [];
    const todayAccum = storedToday.reduce((sum, p) => sum + p.pv, 0);

    // §5.2.1-2 — Roll prodToday into previousProd and trim to history window
    const historyDays = parseInt(process.env.PRODUCTION_HISTORY_DAYS ?? '7', 10);
    const cutoff = new Date(Date.now() - historyDays * 24 * 3_600_000);
    const rolledPreviousProd: IProductionPoint[] = [
      ...(project.previousProd ?? []).filter((p) => p.dateTime >= cutoff),
      ...storedToday,
    ];

    // §5.2.4 — Fetch fresh forecast for nextProd (no history needed)
    const { nextProd } = await productionService.computeTodayAndForecast(params, panel);

    // §5.2.3 + §5.2.6-7 — Persist: clear today, save rolled history, new forecast
    await ProjectModel.findByIdAndUpdate(projectId, {
      prodToday: [],
      previousProd: rolledPreviousProd,
      nextProd,
      lastRefreshedAt: new Date(),
      $inc: { totalProd: todayAccum },
    });

    console.info(
      `[Scheduler] Refreshed ${projectId}: +${todayAccum.toFixed(3)} kWh accumulated, ` +
      `${rolledPreviousProd.length} history pts, ${nextProd.length} forecast pts`,
    );
  }

  // ---------------------------------------------------------------------------
  // Solar calculations
  // ---------------------------------------------------------------------------

  async calculateOptimalConfig(data: OptimalConfigInput, projectId?: string): Promise<OptimalConfigResponse> {
    const { surfaceArea, panelWidth, panelHeight, tilt, latitude, wattPeak, azimuth } = data;

    const W = panelWidth;
    const H = panelHeight;
    const tiltRad = (tilt * Math.PI) / 180;

    // Shadow-based row spacing: d = H × sin(α) / tan(β) × |cos(φ)|
    // β = 90° − |lat| − 23.45° (solar elevation at winter solstice noon)
    // φ = deviation from south (compass azimuth − 180°)
    // The N-S shadow component shrinks as the panel turns away from south,
    // so rows can be placed closer for east/west-facing orientations.
    const betaDeg = 90 - Math.abs(latitude) - 23.45;
    const azimuthDevRad = ((azimuth ?? 180) - 180) * (Math.PI / 180);
    const nsShadowFactor = Math.abs(Math.cos(azimuthDevRad));
    let recommendedRowSpacing: number;
    if (betaDeg <= 0) {
      recommendedRowSpacing = H * 3 * nsShadowFactor;
    } else {
      const betaRad = (betaDeg * Math.PI) / 180;
      recommendedRowSpacing = ((H * Math.sin(tiltRad)) / Math.tan(betaRad)) * nsShadowFactor;
    }
    recommendedRowSpacing = Math.max(recommendedRowSpacing, 0.6);
    recommendedRowSpacing = Math.round(recommendedRowSpacing * 100) / 100;

    const panelFootprint = W * (H * Math.cos(tiltRad) + recommendedRowSpacing);
    const utilisation = 0.85;
    const usableArea = surfaceArea * utilisation;
    const recommendedPanels = panelFootprint > 0 ? Math.floor(usableArea / panelFootprint) : 0;

    const panelWatts = wattPeak ?? 300;
    const estimatedCapacity = (recommendedPanels * panelWatts) / 1000;

    // Use real irradiation from PVGIS (H(i)_y ÷ 365) when the project has it stored;
    // fall back to the empirical formula for standalone estimates without a project context.
    let peakSunHours: number;
    if (projectId) {
      const proj = await ProjectModel.findById(projectId).select('pvgisRef').lean();
      const poa = proj?.pvgisRef?.yearlyPOAIrradiation;
      peakSunHours = poa ? poa / 365 : 5.5 - Math.abs(latitude) * 0.02;
    } else {
      peakSunHours = 5.5 - Math.abs(latitude) * 0.02;
    }
    const systemEfficiency = 0.85;
    const estimatedProduction = estimatedCapacity * peakSunHours * 365 * systemEfficiency;

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

  async calculateFromPolygon(data: OptimalConfigFromPolygonInput): Promise<OptimalConfigResponse> {
    const { area, panelId, tilt, azimuth } = data;

    const panel = await PanelModel.findById(panelId);
    if (!panel) throw new Error('Panel not found');

    const center = getCenter(area.map((p) => ({ latitude: p.lat, longitude: p.lon })));
    if (!center) throw new Error('Could not calculate center of area');

    const surfaceArea = getAreaOfPolygon(
      area.map((p) => ({ latitude: p.lat, longitude: p.lon })),
    );

    return this.calculateOptimalConfig({
      surfaceArea,
      panelWidth: panel.dimensions.width / 1000,
      panelHeight: panel.dimensions.height / 1000,
      tilt,
      latitude: center.latitude,
      wattPeak: panel.wattPeak,
      azimuth,
    });
  }

  async previewProjectConfig(
    projectId: string,
    caller: CallerContext,
    data: ProjectConfigPreviewInput,
  ): Promise<ProjectConfigPreview> {
    const project = await ProjectModel.findById(projectId).populate('panel');
    if (!project) throw new Error('Project not found');

    if (caller.role !== 'admin' && project.owner?.toString() !== caller.userId) {
      throw new Error('Not authorized');
    }

    const warnings: string[] = [];
    const geo = data.area ? calculateGeospatialFields(data.area) : {};
    const lat = geo.lat ?? project.lat;
    const surface = geo.surface ?? project.surface ?? 0;

    let previewPanel = resolvePopulatedPanel(project.panel);
    if (data.panelId) {
      previewPanel = await PanelModel.findById(data.panelId);
      if (!previewPanel) throw new Error('Panel not found');
    }

    const currentPanel = resolvePopulatedPanel(project.panel);
    const previewPanelNumber = data.panelNumber ?? project.panelNumber;
    const previewTilt = data.tilt ?? project.tilt;
    const previewAzimuth = data.azimuth ?? project.azimuth;
    const price = data.price ?? project.price;
    const currency = data.currency ?? project.currency;

    const capacityKw = (panel: IPanel | null, count: number) =>
      panel ? (panel.wattPeak * count) / 1000 : 0;
    const coveragePct = (panel: IPanel | null, count: number) => {
      if (!panel || !surface) return null;
      const panelArea = (panel.dimensions.width / 1000) * (panel.dimensions.height / 1000);
      return Math.min(100, (panelArea * count * 100) / surface);
    };
    const annualProduction = (capacity: number, fallback?: number | null) => {
      if (capacity <= 0) return null;
      if (project.pvgisRef?.yearlyKwhPerKwp) return project.pvgisRef.yearlyKwhPerKwp * capacity;
      if (fallback != null) return fallback;
      if (lat != null) return capacity * (5.5 - Math.abs(lat) * 0.02) * 365 * 0.85;
      return null;
    };
    const annualSavings = (production: number | null) =>
      production != null && price != null ? production * price : null;

    let optimal: OptimalConfigResponse | null = null;
    if (previewPanel && surface > 0 && lat != null) {
      optimal = await this.calculateOptimalConfig(
        {
          surfaceArea: surface,
          panelWidth: previewPanel.dimensions.width / 1000,
          panelHeight: previewPanel.dimensions.height / 1000,
          tilt: previewTilt,
          latitude: lat,
          wattPeak: previewPanel.wattPeak,
          azimuth: previewAzimuth,
        },
        projectId,
      );
    } else {
      warnings.push('Select a panel and valid area to calculate optimal configuration.');
    }

    const currentCapacityKw = capacityKw(currentPanel, project.panelNumber);
    const previewCapacityKw = capacityKw(previewPanel, previewPanelNumber);
    const currentAnnualProduction = project.pvgisRef?.yearlyKwh ?? annualProduction(currentCapacityKw);
    const previewAnnualProduction = annualProduction(previewCapacityKw, optimal?.estimatedProduction ?? null);
    const monthlyProductionKwh =
      project.pvgisRef?.monthlyKwh && currentCapacityKw > 0
        ? project.pvgisRef.monthlyKwh.map((v) => (v / currentCapacityKw) * previewCapacityKw)
        : null;

    if (!project.pvgisRef) warnings.push('PVGIS reference is unavailable; preview uses a simplified production estimate.');
    if (price == null) warnings.push('Set an energy price to preview annual savings.');

    return {
      current: {
        panelNumber: project.panelNumber,
        capacityKw: currentCapacityKw,
        annualProductionKwh: currentAnnualProduction,
        annualSavings: annualSavings(currentAnnualProduction),
        coverage: coveragePct(currentPanel, project.panelNumber),
        rowSpacing: project.rawSpacing ?? null,
      },
      preview: {
        panelNumber: previewPanelNumber,
        capacityKw: previewCapacityKw,
        annualProductionKwh: previewAnnualProduction,
        annualSavings: annualSavings(previewAnnualProduction),
        coverage: coveragePct(previewPanel, previewPanelNumber),
        rowSpacing: data.rawSpacing ?? optimal?.recommendedRowSpacing ?? project.rawSpacing ?? null,
        monthlyProductionKwh,
      },
      optimal,
      currency,
      warnings,
    };
  }

  estimateFromPolygon(
    area: GeoPointInput[],
  ): { panelCount: number; areaSqm: number; estimatedKwp: number } {
    const geoPoints = area.map((p) => ({ latitude: p.lat, longitude: p.lon }));
    const areaSqm = getAreaOfPolygon(geoPoints);

    const panelW = 2;
    const panelH = 4;
    const rowSpacing = 2;
    const footprint = panelW * (panelH + rowSpacing);
    const usableArea = areaSqm * 0.85;
    const panelCount = footprint > 0 ? Math.max(0, Math.floor(usableArea / footprint)) : 0;
    const estimatedKwp = (panelCount * 400) / 1000;

    return { panelCount, areaSqm, estimatedKwp };
  }

  async getSunPath(projectId: string, caller: CallerContext): Promise<SunPathData> {
    const project = await ProjectModel.findById(projectId);
    if (!project) throw new Error('Project not found');

    if (caller.role !== 'admin' && project.owner?.toString() !== caller.userId) {
      throw new Error('Not authorized to view this project');
    }

    const geo = calculateGeospatialFields(project.area);
    if (geo.lat == null || geo.lon == null) throw new Error('Project has no defined area polygon');

    const latitude = geo.lat;
    const longitude = geo.lon;
    const timezone = this.resolveProjectTimezone(project, latitude, longitude);
    const todaySunlight = await this.fetchTodaySunlight(latitude, longitude, timezone);

    return {
      latitude,
      longitude,
      timezone,
      summerSolstice: this.calculateSunPosition(latitude, 23.5),
      winterSolstice: this.calculateSunPosition(latitude, -23.5),
      equinox: this.calculateSunPosition(latitude, 0),
      todaySunlight,
    };
  }

  private resolveProjectTimezone(project: HydratedDocument<IProject> | IProject, latitude: number, longitude: number): string {
    if (project.timezone) return project.timezone;
    return find(latitude, longitude)[0] ?? 'auto';
  }

  private async fetchTodaySunlight(latitude: number, longitude: number, timezone: string): Promise<TodaySunlight | null> {
    try {
      const sunlight = await openMeteoService.fetchDailySunlight(latitude, longitude, timezone);
      return { ...sunlight, source: 'open-meteo' };
    } catch (error) {
      console.warn('Open-Meteo daily sunlight unavailable:', error);
      return null;
    }
  }

  private calculateSunPosition(latitude: number, declination: number) {
    const latRad = (latitude * Math.PI) / 180;
    const decRad = (declination * Math.PI) / 180;

    const noonAltitude = 90 - Math.abs(latitude - declination);

    const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
    const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosHourAngle)));
    const daylightHours = (2 * hourAngle * 180) / Math.PI / 15;

    return {
      noonAltitude: Math.max(0, noonAltitude),
      daylightHours,
    };
  }

  async generatePlanData(projectId: string, caller: CallerContext): Promise<PlanData> {
    const project = await ProjectModel.findById(projectId)
      .populate('panel')
      .populate('owner', 'fullName email');

    if (!project) throw new Error('Project not found');

    if (caller.role !== 'admin' && project.owner) {
      const ownerId =
        typeof project.owner === 'object' && project.owner !== null && '_id' in project.owner
          ? (project.owner as { _id: { toString(): string } })._id.toString()
          : (project.owner as unknown as { toString(): string }).toString();
      if (ownerId !== caller.userId) throw new Error('Not authorized to view this project');
    }

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

    const peakSunHours = project.lat ? 5.5 - Math.abs(project.lat) * 0.02 : 5;
    const estimatedAnnualProduction = totalCapacityKw * peakSunHours * 365 * 0.85;

    return {
      project: transformProjectToResponse(project),
      panelDetails,
      totalCapacityKw,
      estimatedAnnualProduction,
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * On-demand production refresh (§5.3).
   * Updates only prodToday and nextProd — never touches previousProd.
   * previousProd is only modified by the nightly cron (§5.2).
   */
  private async refreshOnDemand(
    project: HydratedDocument<IProject>,
    panel: IPanel,
  ): Promise<TodayAndForecastData> {
    const params = toProductionParams(project);
    if (!params) return { prodToday: project.prodToday ?? [], nextProd: project.nextProd ?? [] };

    const { prodToday, nextProd } = await productionService.computeTodayAndForecast(params, panel);

    await ProjectModel.findByIdAndUpdate(project._id, {
      prodToday,
      nextProd,
      lastRefreshedAt: new Date(),
    });

    return { prodToday, nextProd };
  }

  /**
   * Background production refresh for all stale projects of a user.
   * Called fire-and-forget from getUserDashboard.
   * Uses on-demand logic (§5.3) — does NOT roll prodToday into previousProd.
   */
  private async refreshStaleProjectsForUser(userId: string): Promise<void> {
    const thresholdMs =
      parseInt(process.env.PRODUCTION_REFRESH_THRESHOLD_H ?? '6', 10) * 3_600_000;
    const cutoff = new Date(Date.now() - thresholdMs);

    const staleProjects = await ProjectModel.find({
      owner: userId,
      lat: { $exists: true, $ne: null },
      lon: { $exists: true, $ne: null },
      panel: { $exists: true, $ne: null },
      $or: [
        { lastRefreshedAt: { $exists: false } },
        { lastRefreshedAt: { $lt: cutoff } },
      ],
    })
      .populate('panel')
      .limit(5); // Cap to avoid overwhelming Open-Meteo on each dashboard load

    for (const project of staleProjects) {
      try {
        const panel = resolvePopulatedPanel(project.panel);
        if (!panel) continue;
        await this.refreshOnDemand(project, panel);
      } catch (err) {
        console.warn(`[Dashboard] Refresh failed for ${project._id.toString()}:`, err);
      }
    }
  }

  /**
   * Compute analytics metrics for a project.
   * Formulas from NREL PVWatts V5 (NREL/TP-6A20-62641) §3.1, §5.1, §5.2, §8.1, §8.2.
   */
  async getProjectAnalytics(projectId: string, caller: CallerContext): Promise<ProjectAnalytics> {
    const project = await ProjectModel.findById(projectId).populate('panel');

    if (!project) throw new Error('Project not found');

    if (caller.role !== 'admin' && project.owner) {
      const ownerId =
        typeof project.owner === 'object' && project.owner !== null && '_id' in project.owner
          ? (project.owner as { _id: { toString(): string } })._id.toString()
          : (project.owner as unknown as { toString(): string }).toString();
      if (ownerId !== caller.userId) throw new Error('Not authorized to view this project');
    }

    const pvgisRef = project.pvgisRef;
    if (!pvgisRef) throw new Error('No PVGIS reference data for this project');

    const panel = resolvePopulatedPanel(project.panel);
    const wattPeak = panel?.wattPeak ?? 0;
    const pDc0Kw = (project.panelNumber * wattPeak) / 1000;

    // CF (%) = 100 × yearlyKwh / (Pdc0_kW × 8760) — NREL PVWatts V5 §8.1
    const capacityFactor = pDc0Kw > 0 ? (100 * pvgisRef.yearlyKwh) / (pDc0Kw * 8760) : 0;

    // PR (%) = 100 × yearlyKwh / (Pdc0_kW × H(i)_y) — NREL PVWatts V5 §8.2
    // null for projects created before yearlyPOAIrradiation was stored
    const performanceRatio =
      pvgisRef.yearlyPOAIrradiation && pDc0Kw > 0
        ? (100 * pvgisRef.yearlyKwh) / (pDc0Kw * pvgisRef.yearlyPOAIrradiation)
        : null;

    const price = project.price ?? null;

    // Annual savings = yearlyKwh × price — null if price not set
    const annualSavingsEur = price != null ? pvgisRef.yearlyKwh * price : null;

    // 25-year savings projection with panel degradation — null if no price
    const PROJECTION_YEARS = 25;
    const dfy = panel?.degradationFirstYear ?? 2.0;
    const da = panel?.degradationAnnual ?? 0.5;
    let annualSavingsPerYear: number[] | null = null;
    if (price != null) {
      annualSavingsPerYear = [];
      for (let i = 1; i <= PROJECTION_YEARS; i++) {
        const degradationFactor = (1 - dfy / 100) * Math.pow(1 - da / 100, i - 1);
        annualSavingsPerYear.push(pvgisRef.yearlyKwh * degradationFactor * price);
      }
    }

    // Installation cost: user-provided value takes precedence, then CAPEX benchmark
    let installationCost: number | null = project.installationCost ?? null;
    let installationCostSource: 'user' | 'benchmark' | null = null;

    if (installationCost != null) {
      installationCostSource = 'user';
    } else if (pDc0Kw > 0) {
      const segment = (project.segment ?? 'residential') as CapexSegment;
      const countryCode = project.countryCode ?? 'ES';
      const capex = getCapexPerKwp(countryCode, segment);
      if (capex) {
        installationCost = pDc0Kw * capex.value;
        installationCostSource = 'benchmark';
      }
    }

    // Payback period
    const paybackYears =
      installationCost != null && annualSavingsEur && annualSavingsEur > 0
        ? installationCost / annualSavingsEur
        : null;

    // 25-year ROI
    let roi25Years: number | null = null;
    if (annualSavingsPerYear && installationCost != null && installationCost > 0) {
      const cumulativeSavings = annualSavingsPerYear.reduce((s, v) => s + v, 0);
      roi25Years = (100 * (cumulativeSavings - installationCost)) / installationCost;
    }

    return {
      capacityFactor,
      performanceRatio,
      annualSavingsEur,
      annualSavingsPerYear,
      paybackYears,
      roi25Years,
      installationCostUsed: installationCost,
      installationCostSource,
    };
  }

  private resolveCountry(
    lat: number | undefined,
    lon: number | undefined,
    fallback?: { name: string; code: string },
  ): { name: string; code: string } | undefined {
    if (!lat || !lon) return fallback;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const CRG = require('country-reverse-geocoding').country_reverse_geocoding;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const crg = CRG();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = crg.get_country(lat, lon) as { code: string; name: string } | null;
      if (result?.name) return { name: result.name, code: result.code };
    } catch (error) {
      console.warn(`[Country Resolution] Failed for (${lat}, ${lon}):`, error);
    }
    return fallback;
  }

  private resolveTimezone(
    lat: number | undefined,
    lon: number | undefined,
    fallback?: string,
  ): string | undefined {
    if (!lat || !lon) return fallback ?? 'UTC';
    try {
      const zones = find(lat, lon);
      if (zones?.length > 0) return zones[0];
    } catch (error) {
      console.warn(`[Timezone Resolution] Failed for (${lat}, ${lon}):`, error);
    }
    return fallback ?? 'UTC';
  }

  private async fetchElectricityPrice(
    countryCode: string,
  ): Promise<{ price: number | undefined; currency: string | undefined }> {
    if (!countryCode) return { price: undefined, currency: undefined };
    const result = await entsoeService.fetchElectricityPrice(countryCode);
    if (result) return result;
    return { price: undefined, currency: undefined };
  }
}

export const projectService = new ProjectService();
