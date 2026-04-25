import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CultivarService } from '../../services/cultivar.service';

const {
  mockCreate,
  mockFindById,
  mockFind,
  mockCountDocuments,
  mockFindByIdAndUpdate,
  mockFindByIdAndDelete,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFind: vi.fn(),
  mockCountDocuments: vi.fn(),
  mockFindByIdAndUpdate: vi.fn(),
  mockFindByIdAndDelete: vi.fn(),
}));

vi.mock('../../models/cultivar.model', () => ({
  CultivarModel: {
    create: mockCreate,
    findById: mockFindById,
    find: mockFind,
    countDocuments: mockCountDocuments,
    findByIdAndUpdate: mockFindByIdAndUpdate,
    findByIdAndDelete: mockFindByIdAndDelete,
  },
}));

function makeMockCultivar(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'cultivar-id-123' },
    name: 'Wheat',
    category: 'cereal',
    minPanelHeight: 1.5,
    maxPanelHeight: 3.0,
    lightRequirement: 'full-sun',
    recommendedSpacing: 2.0,
    optimalTiltReduction: 10,
    notes: undefined,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function mockFindChain(cultivars: ReturnType<typeof makeMockCultivar>[]) {
  return {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(cultivars),
  };
}

describe('CultivarService', () => {
  let service: CultivarService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CultivarService();
  });

  // ---------- createCultivar ----------

  describe('createCultivar', () => {
    it('creates and returns a cultivar', async () => {
      mockCreate.mockResolvedValueOnce(makeMockCultivar());

      const result = await service.createCultivar({
        name: 'Wheat',
        category: 'cereal',
        minPanelHeight: 1.5,
        maxPanelHeight: 3.0,
        lightRequirement: 'full-sun',
        recommendedSpacing: 2.0,
        optimalTiltReduction: 10,
      });

      expect(result._id).toBe('cultivar-id-123');
      expect(result.name).toBe('Wheat');
      expect(result.category).toBe('cereal');
    });
  });

  // ---------- getCultivarById ----------

  describe('getCultivarById', () => {
    it('returns cultivar when found', async () => {
      mockFindById.mockResolvedValueOnce(makeMockCultivar());

      const result = await service.getCultivarById('cultivar-id-123');

      expect(result._id).toBe('cultivar-id-123');
      expect(result.name).toBe('Wheat');
    });

    it('throws when cultivar not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.getCultivarById('bad-id')).rejects.toThrow('Cultivar not found');
    });
  });

  // ---------- listCultivars ----------

  describe('listCultivars', () => {
    it('returns paginated list with defaults (page 1, limit 20)', async () => {
      const cultivars = [makeMockCultivar()];
      mockFind.mockReturnValueOnce(mockFindChain(cultivars));
      mockCountDocuments.mockResolvedValueOnce(1);

      const result = await service.listCultivars({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('calculates totalPages correctly', async () => {
      mockFind.mockReturnValueOnce(mockFindChain([]));
      mockCountDocuments.mockResolvedValueOnce(45);

      const result = await service.listCultivars({ page: 1, limit: 20 });

      expect(result.totalPages).toBe(3);
    });

    it('applies category filter', async () => {
      mockFind.mockReturnValueOnce(mockFindChain([]));
      mockCountDocuments.mockResolvedValueOnce(0);

      await service.listCultivars({ category: 'vegetable', page: 1, limit: 20 });

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'vegetable' })
      );
    });

    it('applies text search filter', async () => {
      mockFind.mockReturnValueOnce(mockFindChain([]));
      mockCountDocuments.mockResolvedValueOnce(0);

      await service.listCultivars({ search: 'wheat', page: 1, limit: 20 });

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ $text: { $search: 'wheat' } })
      );
    });

    it('applies correct skip for page 2', async () => {
      const chain = mockFindChain([]);
      mockFind.mockReturnValueOnce(chain);
      mockCountDocuments.mockResolvedValueOnce(0);

      await service.listCultivars({ page: 2, limit: 10 });

      expect(chain.skip).toHaveBeenCalledWith(10);
    });
  });

  // ---------- updateCultivar ----------

  describe('updateCultivar', () => {
    it('updates and returns the cultivar', async () => {
      const updatedCultivar = makeMockCultivar({ name: 'Barley' });
      mockFindByIdAndUpdate.mockResolvedValueOnce(updatedCultivar);

      const result = await service.updateCultivar('cultivar-id-123', { name: 'Barley' });

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'cultivar-id-123',
        { name: 'Barley' },
        { new: true }
      );
      expect(result.name).toBe('Barley');
    });

    it('throws when cultivar not found', async () => {
      mockFindByIdAndUpdate.mockResolvedValueOnce(null);

      await expect(service.updateCultivar('bad-id', { name: 'Barley' })).rejects.toThrow(
        'Cultivar not found'
      );
    });
  });

  // ---------- deleteCultivar ----------

  describe('deleteCultivar', () => {
    it('deletes an existing cultivar', async () => {
      mockFindByIdAndDelete.mockResolvedValueOnce(makeMockCultivar());

      await expect(service.deleteCultivar('cultivar-id-123')).resolves.toBeUndefined();
      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('cultivar-id-123');
    });

    it('throws when cultivar not found', async () => {
      mockFindByIdAndDelete.mockResolvedValueOnce(null);

      await expect(service.deleteCultivar('bad-id')).rejects.toThrow('Cultivar not found');
    });
  });
});
