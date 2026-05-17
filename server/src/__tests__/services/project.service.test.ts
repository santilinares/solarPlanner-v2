import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from '../../services/project.service';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockProjectCreate,
  mockProjectFindById,
  mockProjectFind,
  mockProjectFindByIdAndUpdate,
  mockProjectFindByIdAndDelete,
  mockProjectCountDocuments,
  mockProjectAggregate,
  mockPanelFindById,
  mockCultivarFindById,
  mockUserFindById,
  mockSendProjectCreatedEmail,
} = vi.hoisted(() => ({
  mockProjectCreate: vi.fn(),
  mockProjectFindById: vi.fn(),
  mockProjectFind: vi.fn(),
  mockProjectFindByIdAndUpdate: vi.fn(),
  mockProjectFindByIdAndDelete: vi.fn(),
  mockProjectCountDocuments: vi.fn(),
  mockProjectAggregate: vi.fn(),
  mockPanelFindById: vi.fn(),
  mockCultivarFindById: vi.fn(),
  mockUserFindById: vi.fn(),
  mockSendProjectCreatedEmail: vi.fn(),
}));

vi.mock('../../models/project.model', () => ({
  ProjectModel: {
    create: mockProjectCreate,
    findById: mockProjectFindById,
    find: mockProjectFind,
    findByIdAndUpdate: mockProjectFindByIdAndUpdate,
    findByIdAndDelete: mockProjectFindByIdAndDelete,
    countDocuments: mockProjectCountDocuments,
    aggregate: mockProjectAggregate,
  },
}));

vi.mock('../../models/panel.model', () => ({
  PanelModel: { findById: mockPanelFindById },
}));

vi.mock('../../models/cultivar.model', () => ({
  CultivarModel: { findById: mockCultivarFindById },
}));

vi.mock('../../models/user.model', () => ({
  UserModel: { findById: mockUserFindById },
}));

vi.mock('../../services/email.service', () => ({
  emailService: { sendProjectCreatedEmail: mockSendProjectCreatedEmail },
}));

vi.mock('geolib', () => ({
  getCenter: vi.fn(() => ({ latitude: 40.4, longitude: -3.7 })),
  getAreaOfPolygon: vi.fn(() => 1000),
}));

vi.mock('country-reverse-geocoding', () => ({
  default: {
    get_country: vi.fn(() => ({ name: 'Spain', code: 'ES' })),
  },
}));

vi.mock('geo-tz', () => ({
  find: vi.fn(() => ['Europe/Madrid']),
}));

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const PANEL_ID = '507f1f77bcf86cd799439011';
const PROJECT_ID = '507f1f77bcf86cd799439012';
const USER_ID = '507f1f77bcf86cd799439013';

function makeMockPanel(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => PANEL_ID },
    brand: 'SunPower',
    model: 'X22-370',
    wattPeak: 370,
    dimensions: { width: 1000, height: 1800 }, // mm
    cells: 72,
    gammaPmp: -0.29,
    efficiency: 22.7,
    warranty: 25,
    price: 350,
    technology: 'Monocrystalline',
    type: 'global',
    owner: undefined,
    ...overrides,
  };
}

const SAMPLE_AREA = [
  { lat: 40.41, lon: -3.71 },
  { lat: 40.42, lon: -3.71 },
  { lat: 40.42, lon: -3.70 },
  { lat: 40.41, lon: -3.70 },
];

function makeMockProject(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => PROJECT_ID },
    name: 'Test Project',
    description: 'A test solar project',
    projectType: 'roof',
    area: SAMPLE_AREA,
    lat: 40.4,
    lon: -3.7,
    surface: 1000,
    country: 'Spain',
    timezone: 'Europe/Madrid',
    currency: undefined,
    price: undefined,
    tilt: 30,
    direction: 'south',
    azimuth: 180,
    rawSpacing: 1.2,
    panelNumber: 10,
    panel: {
      _id: { toString: () => PANEL_ID },
      wattPeak: 370,
      brand: 'SunPower',
      model: 'X22-370',
      dimensions: { width: 1000, height: 1800 },
      technology: 'Monocrystalline',
    },
    cultivar: undefined,
    owner: { toString: () => USER_ID },
    prodToday: [{ dateTime: new Date(), pv: 5 }],
    nextProd: [{ dateTime: new Date(), pv: 10 }],
    previousProd: [{ dateTime: new Date(), pv: 8 }],
    totalProd: 0,
    installDate: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    populate: vi.fn().mockReturnThis(),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Chain helper for find().populate().sort().skip().limit()
function mockFindChain(projects: ReturnType<typeof makeMockProject>[]) {
  const chain = {
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(projects),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProjectService();
  });

  // ---------- createProject ----------

  describe('createProject', () => {
    it('creates a project and returns a response', async () => {
      const mockProject = makeMockProject();
      mockPanelFindById.mockResolvedValue(makeMockPanel());
      mockProjectCreate.mockResolvedValue(mockProject);
      mockProjectFindByIdAndUpdate.mockResolvedValue(mockProject);
      // fire-and-forget user lookup
      mockUserFindById.mockResolvedValue(null);

      const result = await service.createProject(USER_ID, {
        name: 'Test Project',
        area: SAMPLE_AREA,
        panelId: PANEL_ID,
        panelNumber: 10,
        tilt: 30,
        direction: 'south',
        projectType: 'roof',
      });

      expect(mockProjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({ owner: USER_ID, panel: PANEL_ID })
      );
      expect(result._id).toBe(PROJECT_ID);
    });

    it('throws when panelId is provided but panel does not exist', async () => {
      mockPanelFindById.mockResolvedValue(null);

      await expect(
        service.createProject(USER_ID, {
          name: 'Test Project',
          area: SAMPLE_AREA,
          panelId: 'bad-panel-id',
          panelNumber: 10,
          tilt: 30,
          direction: 'south',
          projectType: 'roof',
        })
      ).rejects.toThrow('Panel not found');
    });

    it('throws when cultivarId is provided for agrivoltaic project but cultivar does not exist', async () => {
      mockPanelFindById.mockResolvedValue(makeMockPanel());
      mockCultivarFindById.mockResolvedValue(null);

      await expect(
        service.createProject(USER_ID, {
          name: 'Agri Project',
          area: SAMPLE_AREA,
          panelId: PANEL_ID,
          panelNumber: 10,
          tilt: 30,
          direction: 'south',
          projectType: 'agrivoltaic',
          cultivarId: 'bad-cultivar-id',
        })
      ).rejects.toThrow('Cultivar not found');
    });
  });

  // ---------- getProjectById ----------

  describe('getProjectById', () => {
    it('returns project when owner matches caller', async () => {
      const mockProject = makeMockProject();
      mockProjectFindById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        // second .populate() returns the final document
        then: undefined,
      });
      // Override to return project on second populate call
      const populateMock = vi.fn();
      populateMock.mockReturnValueOnce({ populate: populateMock }).mockResolvedValueOnce(mockProject);
      mockProjectFindById.mockReturnValue({ populate: populateMock });

      const result = await service.getProjectById(PROJECT_ID, {
        userId: USER_ID,
        role: 'user',
      });

      expect(result._id).toBe(PROJECT_ID);
    });

    it('throws when project is not found', async () => {
      const populateMock = vi.fn();
      populateMock.mockReturnValueOnce({ populate: populateMock }).mockResolvedValueOnce(null);
      mockProjectFindById.mockReturnValue({ populate: populateMock });

      await expect(
        service.getProjectById('bad-id', { userId: USER_ID, role: 'user' })
      ).rejects.toThrow('Project not found');
    });

    it('throws when caller is not owner and not admin', async () => {
      const mockProject = makeMockProject({
        owner: { toString: () => 'other-user-id', _id: { toString: () => 'other-user-id' } },
      });
      const populateMock = vi.fn();
      populateMock.mockReturnValueOnce({ populate: populateMock }).mockResolvedValueOnce(mockProject);
      mockProjectFindById.mockReturnValue({ populate: populateMock });

      await expect(
        service.getProjectById(PROJECT_ID, { userId: USER_ID, role: 'user' })
      ).rejects.toThrow('Not authorized to view this project');
    });

    it('allows admin to view any project', async () => {
      const mockProject = makeMockProject({
        owner: { toString: () => 'other-user-id', _id: { toString: () => 'other-user-id' } },
      });
      const populateMock = vi.fn();
      populateMock.mockReturnValueOnce({ populate: populateMock }).mockResolvedValueOnce(mockProject);
      mockProjectFindById.mockReturnValue({ populate: populateMock });

      const result = await service.getProjectById(PROJECT_ID, { userId: 'admin-id', role: 'admin' });

      expect(result._id).toBe(PROJECT_ID);
    });
  });

  // ---------- updateProject ----------

  describe('updateProject', () => {
    it('updates project when caller is owner', async () => {
      const mockProject = makeMockProject();
      const updatedProject = makeMockProject({ name: 'Updated Name' });
      mockProjectFindById.mockResolvedValue(mockProject);
      mockProjectFindByIdAndUpdate.mockResolvedValue(updatedProject);

      const result = await service.updateProject(
        { userId: USER_ID, role: 'user' },
        PROJECT_ID,
        { name: 'Updated Name' }
      );

      expect(result.name).toBe('Updated Name');
    });

    it('allows admin to update any project', async () => {
      const mockProject = makeMockProject({ owner: { toString: () => 'other-user-id' } });
      const updatedProject = makeMockProject({ name: 'Admin Update' });
      mockProjectFindById.mockResolvedValue(mockProject);
      mockProjectFindByIdAndUpdate.mockResolvedValue(updatedProject);

      const result = await service.updateProject(
        { userId: 'admin-id', role: 'admin' },
        PROJECT_ID,
        { name: 'Admin Update' }
      );

      expect(result.name).toBe('Admin Update');
    });

    it('throws when caller is not owner and not admin', async () => {
      mockProjectFindById.mockResolvedValue(
        makeMockProject({ owner: { toString: () => 'other-user-id' } })
      );

      await expect(
        service.updateProject({ userId: USER_ID, role: 'user' }, PROJECT_ID, { name: 'Hack' })
      ).rejects.toThrow('Not authorized');
    });

    it('throws when project is not found', async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        service.updateProject({ userId: USER_ID, role: 'user' }, 'bad-id', { name: 'X' })
      ).rejects.toThrow('Project not found');
    });
  });

  // ---------- listProjects ----------

  describe('listProjects', () => {
    it('returns paginated projects for a user caller', async () => {
      const projects = [makeMockProject()];
      mockProjectFind.mockReturnValue(mockFindChain(projects));
      mockProjectCountDocuments.mockResolvedValue(1);

      const result = await service.listProjects({ page: 1, limit: 10 }, { userId: USER_ID, role: 'user' });

      expect(mockProjectFind).toHaveBeenCalledWith(
        expect.objectContaining({ owner: USER_ID })
      );
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.totalPages).toBe(1);
    });

    it('returns all projects for an admin caller', async () => {
      const projects = [makeMockProject(), makeMockProject({ _id: { toString: () => 'other-project' } })];
      mockProjectFind.mockReturnValue(mockFindChain(projects));
      mockProjectCountDocuments.mockResolvedValue(2);

      const result = await service.listProjects({ page: 1, limit: 10 }, { userId: 'admin-id', role: 'admin' });

      // Admin gets no owner filter
      expect(mockProjectFind).toHaveBeenCalledWith({});
      expect(result.total).toBe(2);
    });

    it('applies country filter when provided', async () => {
      mockProjectFind.mockReturnValue(mockFindChain([]));
      mockProjectCountDocuments.mockResolvedValue(0);

      await service.listProjects({ page: 1, limit: 10, country: 'Spain' }, { userId: USER_ID, role: 'user' });

      expect(mockProjectFind).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'Spain' })
      );
    });

    it('applies projectType filter when provided', async () => {
      mockProjectFind.mockReturnValue(mockFindChain([]));
      mockProjectCountDocuments.mockResolvedValue(0);

      await service.listProjects({ page: 1, limit: 10, projectType: 'agrivoltaic' }, { userId: USER_ID, role: 'user' });

      expect(mockProjectFind).toHaveBeenCalledWith(
        expect.objectContaining({ projectType: 'agrivoltaic' })
      );
    });

    it('delegates to getProjectById when id filter is provided', async () => {
      const populateMock = vi.fn();
      const mockProject = makeMockProject();
      populateMock.mockReturnValueOnce({ populate: populateMock }).mockResolvedValueOnce(mockProject);
      mockProjectFindById.mockReturnValue({ populate: populateMock });

      const result = await service.listProjects(
        { page: 1, limit: 10, id: PROJECT_ID },
        { userId: USER_ID, role: 'user' }
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('calculates correct pagination metadata', async () => {
      mockProjectFind.mockReturnValue(mockFindChain([makeMockProject()]));
      mockProjectCountDocuments.mockResolvedValue(25);

      const result = await service.listProjects(
        { page: 2, limit: 10 },
        { userId: USER_ID, role: 'user' }
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
    });
  });

  // ---------- deleteProject ----------

  describe('deleteProject', () => {
    it('deletes project when caller is owner', async () => {
      mockProjectFindById.mockResolvedValue(makeMockProject());
      mockProjectFindByIdAndDelete.mockResolvedValue({});

      await expect(service.deleteProject(PROJECT_ID, USER_ID)).resolves.toBeUndefined();
      expect(mockProjectFindByIdAndDelete).toHaveBeenCalledWith(PROJECT_ID);
    });

    it('throws when project is not found', async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(service.deleteProject('bad-id', USER_ID)).rejects.toThrow('Project not found');
    });

    it('throws when caller is not owner', async () => {
      mockProjectFindById.mockResolvedValue(
        makeMockProject({ owner: { toString: () => 'other-user-id' } })
      );

      await expect(service.deleteProject(PROJECT_ID, USER_ID)).rejects.toThrow(
        'Not authorized to delete this project'
      );
    });
  });

  // ---------- adminDeleteProject ----------

  describe('adminDeleteProject', () => {
    it('deletes any project without ownership check', async () => {
      mockProjectFindById.mockResolvedValue(makeMockProject({ owner: { toString: () => 'some-user' } }));
      mockProjectFindByIdAndDelete.mockResolvedValue({});

      await expect(service.adminDeleteProject(PROJECT_ID)).resolves.toBeUndefined();
      expect(mockProjectFindByIdAndDelete).toHaveBeenCalledWith(PROJECT_ID);
    });

    it('throws when project is not found', async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(service.adminDeleteProject('bad-id')).rejects.toThrow('Project not found');
    });
  });

  // ---------- getUserDashboard / getAdminDashboard ----------

  describe('getUserDashboard', () => {
    it('returns zero stats when user has no projects', async () => {
      mockProjectAggregate.mockResolvedValue([
        { projectStats: [], todayStats: [], nextStats: [], prevStats: [] },
      ]);
      mockProjectFind.mockReturnValue(mockFindChain([]));

      const result = await service.getUserDashboard(USER_ID);

      expect(result.totalProjects).toBe(0);
      expect(result.totalPanels).toBe(0);
      expect(result.totalCapacity).toBe(0);
      expect(result.totalProduction).toBe(0);
      expect(result.todayProduction).toBe(0);
      expect(result.next6DaysTotal).toBe(0);
      expect(result.past6DaysTotal).toBe(0);
      expect(result.recentProjects).toHaveLength(0);
    });

    it('returns aggregated stats when user has projects', async () => {
      mockProjectAggregate.mockResolvedValue([
        {
          projectStats: [{ totalProjects: 2, totalPanels: 20, totalCapacity: 7.4, totalProduction: 9200 }],
          todayStats: [{ total: 15 }],
          nextStats: [{ total: 50 }],
          prevStats: [{ total: 40 }],
        },
      ]);
      mockProjectFind.mockReturnValue(mockFindChain([makeMockProject()]));

      const result = await service.getUserDashboard(USER_ID);

      expect(result.totalProjects).toBe(2);
      expect(result.totalPanels).toBe(20);
      expect(result.totalCapacity).toBe(7.4);
      expect(result.totalProduction).toBe(9200);
      expect(result.todayProduction).toBe(15);
      expect(result.next6DaysTotal).toBe(50);
      expect(result.past6DaysTotal).toBe(40);
      expect(result.recentProjects).toHaveLength(1);
    });
  });

  describe('getAdminDashboard', () => {
    it('returns aggregated stats across all projects', async () => {
      mockProjectAggregate.mockResolvedValue([
        {
          projectStats: [{ totalProjects: 10, totalPanels: 100, totalCapacity: 37, totalProduction: 46000 }],
          todayStats: [{ total: 100 }],
          nextStats: [{ total: 300 }],
          prevStats: [{ total: 250 }],
        },
      ]);
      mockProjectFind.mockReturnValue(mockFindChain([makeMockProject(), makeMockProject()]));

      const result = await service.getAdminDashboard();

      expect(result.totalProjects).toBe(10);
      expect(result.recentProjects).toHaveLength(2);
    });

    it('passes an empty match filter to aggregate', async () => {
      mockProjectAggregate.mockResolvedValue([
        { projectStats: [], todayStats: [], nextStats: [], prevStats: [] },
      ]);
      mockProjectFind.mockReturnValue(mockFindChain([]));

      await service.getAdminDashboard();

      const pipeline = mockProjectAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
      expect((pipeline[0] as { $match: unknown }).$match).toEqual({});
    });
  });

  // ---------- calculateOptimalConfig ----------

  describe('calculateOptimalConfig', () => {
    const baseInput = {
      surfaceArea: 100,
      panelWidth: 1.0,
      panelHeight: 1.8,
      tilt: 30,
      latitude: 40,
      wattPeak: 370,
    };

    it('returns positive values for a typical mid-latitude installation', async () => {
      const result = await service.calculateOptimalConfig(baseInput);

      expect(result.recommendedPanels).toBeGreaterThan(0);
      expect(result.estimatedCapacity).toBeGreaterThan(0);
      expect(result.estimatedProduction).toBeGreaterThan(0);
      expect(result.coverage).toBeGreaterThan(0);
      expect(result.coverage).toBeLessThanOrEqual(100);
      expect(result.recommendedRowSpacing).toBeGreaterThanOrEqual(0.6);
      expect(result.surfaceArea).toBe(100);
      expect(result.latitude).toBe(40);
    });

    it('enforces minimum row spacing of 0.6 m at high latitudes', async () => {
      const result = await service.calculateOptimalConfig({ ...baseInput, latitude: 80 });

      expect(result.recommendedRowSpacing).toBeGreaterThanOrEqual(0.6);
    });

    it('uses fallback wattage of 300 W when wattPeak is not provided', async () => {
      const withWatt = await service.calculateOptimalConfig(baseInput);
      const withoutWatt = await service.calculateOptimalConfig({
        surfaceArea: baseInput.surfaceArea,
        panelWidth: baseInput.panelWidth,
        panelHeight: baseInput.panelHeight,
        tilt: baseInput.tilt,
        latitude: baseInput.latitude,
        wattPeak: undefined,
      });

      // Same number of panels but different capacity
      expect(withoutWatt.recommendedPanels).toBe(withWatt.recommendedPanels);
      expect(withoutWatt.estimatedCapacity).toBeLessThan(withWatt.estimatedCapacity);
    });

    it('returns zero panels when surface area is 0', async () => {
      const result = await service.calculateOptimalConfig({ ...baseInput, surfaceArea: 0 });

      expect(result.recommendedPanels).toBe(0);
    });
  });

  // ---------- calculateFromPolygon ----------

  describe('calculateFromPolygon', () => {
    it('fetches panel and delegates to calculateOptimalConfig', async () => {
      mockPanelFindById.mockResolvedValue(makeMockPanel());

      const result = await service.calculateFromPolygon({
        area: SAMPLE_AREA,
        panelId: PANEL_ID,
        tilt: 30,
      });

      expect(mockPanelFindById).toHaveBeenCalledWith(PANEL_ID);
      expect(result.recommendedPanels).toBeGreaterThanOrEqual(0);
    });

    it('throws when panel does not exist', async () => {
      mockPanelFindById.mockResolvedValue(null);

      await expect(
        service.calculateFromPolygon({ area: SAMPLE_AREA, panelId: 'bad-panel', tilt: 30 })
      ).rejects.toThrow('Panel not found');
    });
  });

  // ---------- estimateFromPolygon ----------

  describe('estimateFromPolygon', () => {
    it('returns non-negative estimates for a valid polygon', () => {
      const result = service.estimateFromPolygon(SAMPLE_AREA);

      expect(result.panelCount).toBeGreaterThanOrEqual(0);
      expect(result.areaSqm).toBeGreaterThan(0);
      expect(result.estimatedKwp).toBeGreaterThanOrEqual(0);
    });

    it('returns zero panels for an empty area', async () => {
      const { getAreaOfPolygon } = await import('geolib');
      vi.mocked(getAreaOfPolygon).mockReturnValueOnce(0);

      const result = service.estimateFromPolygon(SAMPLE_AREA);

      expect(result.panelCount).toBe(0);
      expect(result.estimatedKwp).toBe(0);
    });
  });

  // ---------- getSunPath ----------

  describe('getSunPath', () => {
    it('returns sun path data for project owner', async () => {
      mockProjectFindById.mockResolvedValue(makeMockProject());

      const result = await service.getSunPath(PROJECT_ID, { userId: USER_ID, role: 'user' });

      expect(result.latitude).toBe(40.4);
      expect(result.summerSolstice).toBeDefined();
      expect(result.winterSolstice).toBeDefined();
      expect(result.equinox).toBeDefined();
      expect(result.summerSolstice.daylightHours).toBeGreaterThan(result.winterSolstice.daylightHours);
    });

    it('allows admin to view sun path for any project', async () => {
      mockProjectFindById.mockResolvedValue(
        makeMockProject({ owner: { toString: () => 'other-user-id' } })
      );

      await expect(
        service.getSunPath(PROJECT_ID, { userId: 'admin-id', role: 'admin' })
      ).resolves.toBeDefined();
    });

    it('throws when project is not found', async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        service.getSunPath('bad-id', { userId: USER_ID, role: 'user' })
      ).rejects.toThrow('Project not found');
    });

    it('throws when caller is not owner and not admin', async () => {
      mockProjectFindById.mockResolvedValue(
        makeMockProject({ owner: { toString: () => 'other-user-id' } })
      );

      await expect(
        service.getSunPath(PROJECT_ID, { userId: USER_ID, role: 'user' })
      ).rejects.toThrow('Not authorized to view this project');
    });

    it('throws when project has no area polygon', async () => {
      mockProjectFindById.mockResolvedValue(makeMockProject({ area: [] }));

      const { getCenter } = await import('geolib');
      vi.mocked(getCenter).mockReturnValueOnce(false);

      await expect(
        service.getSunPath(PROJECT_ID, { userId: USER_ID, role: 'user' })
      ).rejects.toThrow('Project has no defined area polygon');
    });
  });

  // ---------- generatePlanData ----------

  describe('generatePlanData', () => {
    it('returns plan data for project owner', async () => {
      const populateMock = vi.fn();
      populateMock.mockReturnValueOnce({ populate: populateMock }).mockResolvedValueOnce(makeMockProject());
      mockProjectFindById.mockReturnValue({ populate: populateMock });

      const result = await service.generatePlanData(PROJECT_ID, { userId: USER_ID, role: 'user' });

      expect(result.project._id).toBe(PROJECT_ID);
      expect(result.totalCapacityKw).toBeGreaterThan(0);
      expect(result.estimatedAnnualProduction).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();
    });

    it('allows admin to generate plan for any project', async () => {
      const otherProject = makeMockProject({ owner: { toString: () => 'other-user', _id: { toString: () => 'other-user' } } });
      const populateMock = vi.fn();
      populateMock.mockReturnValueOnce({ populate: populateMock }).mockResolvedValueOnce(otherProject);
      mockProjectFindById.mockReturnValue({ populate: populateMock });

      await expect(
        service.generatePlanData(PROJECT_ID, { userId: 'admin-id', role: 'admin' })
      ).resolves.toBeDefined();
    });

    it('throws when project is not found', async () => {
      const populateMock = vi.fn();
      populateMock.mockReturnValueOnce({ populate: populateMock }).mockResolvedValueOnce(null);
      mockProjectFindById.mockReturnValue({ populate: populateMock });

      await expect(
        service.generatePlanData('bad-id', { userId: USER_ID, role: 'user' })
      ).rejects.toThrow('Project not found');
    });

    it('throws when caller is not owner and not admin', async () => {
      const otherProject = makeMockProject({ owner: { toString: () => 'other-user', _id: { toString: () => 'other-user' } } });
      const populateMock = vi.fn();
      populateMock.mockReturnValueOnce({ populate: populateMock }).mockResolvedValueOnce(otherProject);
      mockProjectFindById.mockReturnValue({ populate: populateMock });

      await expect(
        service.generatePlanData(PROJECT_ID, { userId: USER_ID, role: 'user' })
      ).rejects.toThrow('Not authorized to view this project');
    });
  });
});
