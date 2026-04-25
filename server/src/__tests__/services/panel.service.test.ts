import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PanelService } from '../../services/panel.service';

vi.mock('../../models/panel.model', () => ({
  PanelModel: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

import { PanelModel } from '../../models/panel.model';

function makeMockPanel(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'panel-id-123' },
    brand: 'SunPower',
    model: 'X22-370',
    wattPeak: 370,
    dimensions: { width: 1.0, height: 1.8 },
    cells: 72,
    temperatureCoefficient: -0.29,
    efficiency: 22.7,
    warranty: 25,
    price: 350,
    technology: 'Monocrystalline',
    type: 'global',
    owner: undefined,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    populate: vi.fn().mockReturnThis(),
    ...overrides,
  };
}

// PanelModel.find returns a chainable object ending with resolved panel array
function mockFindChain(panels: ReturnType<typeof makeMockPanel>[]) {
  const chain = {
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockResolvedValue(panels),
  };
  return chain;
}

describe('PanelService', () => {
  let service: PanelService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PanelService();
  });

  // ---------- createPanel ----------

  describe('createPanel', () => {
    it('creates a personal panel with owner set', async () => {
      const mockPanel = makeMockPanel({ type: 'personal', owner: { toString: () => 'user-id-123' } });
      vi.mocked(PanelModel.create).mockResolvedValueOnce(mockPanel as any);

      const result = await service.createPanel('user-id-123', {
        brand: 'SunPower',
        model: 'X22-370',
        wattPeak: 370,
        dimensions: { width: 1.0, height: 1.8 },
        efficiency: 22.7,
        warranty: 25,
        price: 350,
        type: 'personal',
        temperatureCoefficient: 0,
      });

      expect(PanelModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'personal', owner: 'user-id-123' })
      );
      expect(result.type).toBe('personal');
    });

    it('creates a global panel without an owner', async () => {
      const mockPanel = makeMockPanel({ type: 'global', owner: undefined });
      vi.mocked(PanelModel.create).mockResolvedValueOnce(mockPanel as any);

      await service.createPanel('user-id-123', {
        brand: 'SunPower',
        model: 'X22-370',
        wattPeak: 370,
        dimensions: { width: 1.0, height: 1.8 },
        efficiency: 22.7,
        warranty: 25,
        price: 350,
        type: 'global',
        temperatureCoefficient: 0,
      });

      expect(PanelModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'global', owner: undefined })
      );
    });
  });

  // ---------- getPanelById ----------

  describe('getPanelById', () => {
    it('returns panel when found', async () => {
      const mockPanel = makeMockPanel();
      vi.mocked(PanelModel.findById).mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue(mockPanel),
      } as any);

      const result = await service.getPanelById('panel-id-123');

      expect(result._id).toBe('panel-id-123');
      expect(result.brand).toBe('SunPower');
    });

    it('throws when panel not found', async () => {
      vi.mocked(PanelModel.findById).mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(service.getPanelById('bad-id')).rejects.toThrow('Panel not found');
    });
  });

  // ---------- listPanels ----------

  describe('listPanels', () => {
    it('returns global + personal panels for a user when no owner filter', async () => {
      const panels = [makeMockPanel(), makeMockPanel({ type: 'personal' })];
      vi.mocked(PanelModel.find).mockReturnValueOnce(mockFindChain(panels) as any);
      vi.mocked(PanelModel.countDocuments).mockResolvedValueOnce(2);

      const result = await service.listPanels({}, 'user-id-123');

      expect(PanelModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) })
      );
      expect(result.total).toBe(2);
    });

    it('returns single panel when id filter is provided', async () => {
      const mockPanel = makeMockPanel();
      vi.mocked(PanelModel.findById).mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue(mockPanel),
      } as any);

      const result = await service.listPanels({ id: 'panel-id-123' });

      expect(result.panels).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies technology filter when provided', async () => {
      vi.mocked(PanelModel.find).mockReturnValueOnce(mockFindChain([makeMockPanel()]) as any);
      vi.mocked(PanelModel.countDocuments).mockResolvedValueOnce(1);

      await service.listPanels({ technology: 'Monocrystalline' });

      expect(PanelModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ technology: 'Monocrystalline' })
      );
    });
  });

  // ---------- updatePanel ----------

  describe('updatePanel', () => {
    it('allows admin to update a global panel', async () => {
      const globalPanel = makeMockPanel({ type: 'global' });
      const updatedPanel = makeMockPanel({ wattPeak: 400 });
      vi.mocked(PanelModel.findById).mockResolvedValueOnce(globalPanel as any);
      vi.mocked(PanelModel.findByIdAndUpdate).mockResolvedValueOnce(updatedPanel as any);

      const result = await service.updatePanel('panel-id-123', { wattPeak: 400 }, 'admin-id', true);

      expect(result.wattPeak).toBe(400);
    });

    it('throws when non-admin tries to update a global panel', async () => {
      vi.mocked(PanelModel.findById).mockResolvedValueOnce(makeMockPanel({ type: 'global' }) as any);

      await expect(
        service.updatePanel('panel-id-123', { wattPeak: 400 }, 'user-id-123', false)
      ).rejects.toThrow('Only admins can update global panels');
    });

    it('allows owner to update their personal panel', async () => {
      const personalPanel = makeMockPanel({
        type: 'personal',
        owner: { toString: () => 'user-id-123' },
      });
      const updatedPanel = makeMockPanel({ wattPeak: 400, type: 'personal' });
      vi.mocked(PanelModel.findById).mockResolvedValueOnce(personalPanel as any);
      vi.mocked(PanelModel.findByIdAndUpdate).mockResolvedValueOnce(updatedPanel as any);

      await expect(
        service.updatePanel('panel-id-123', { wattPeak: 400 }, 'user-id-123', false)
      ).resolves.toBeDefined();
    });

    it('throws when non-owner tries to update a personal panel', async () => {
      const personalPanel = makeMockPanel({
        type: 'personal',
        owner: { toString: () => 'other-user-id' },
      });
      vi.mocked(PanelModel.findById).mockResolvedValueOnce(personalPanel as any);

      await expect(
        service.updatePanel('panel-id-123', { wattPeak: 400 }, 'user-id-123', false)
      ).rejects.toThrow('Not authorized to update this panel');
    });

    it('throws when panel not found', async () => {
      vi.mocked(PanelModel.findById).mockResolvedValueOnce(null);

      await expect(
        service.updatePanel('bad-id', {}, 'user-id-123', false)
      ).rejects.toThrow('Panel not found');
    });
  });

  // ---------- deletePanel ----------

  describe('deletePanel', () => {
    it('allows admin to delete a global panel', async () => {
      vi.mocked(PanelModel.findById).mockResolvedValueOnce(makeMockPanel({ type: 'global' }) as any);
      vi.mocked(PanelModel.findByIdAndDelete).mockResolvedValueOnce({} as any);

      await expect(service.deletePanel('panel-id-123', 'admin-id', true)).resolves.toBeUndefined();
      expect(PanelModel.findByIdAndDelete).toHaveBeenCalledWith('panel-id-123');
    });

    it('throws when non-admin tries to delete a global panel', async () => {
      vi.mocked(PanelModel.findById).mockResolvedValueOnce(makeMockPanel({ type: 'global' }) as any);

      await expect(service.deletePanel('panel-id-123', 'user-id-123', false)).rejects.toThrow(
        'Only admins can delete global panels'
      );
    });

    it('allows owner to delete their personal panel', async () => {
      vi.mocked(PanelModel.findById).mockResolvedValueOnce(
        makeMockPanel({ type: 'personal', owner: { toString: () => 'user-id-123' } }) as any
      );
      vi.mocked(PanelModel.findByIdAndDelete).mockResolvedValueOnce({} as any);

      await expect(service.deletePanel('panel-id-123', 'user-id-123', false)).resolves.toBeUndefined();
    });

    it('throws when non-owner tries to delete a personal panel', async () => {
      vi.mocked(PanelModel.findById).mockResolvedValueOnce(
        makeMockPanel({ type: 'personal', owner: { toString: () => 'other-user-id' } }) as any
      );

      await expect(service.deletePanel('panel-id-123', 'user-id-123', false)).rejects.toThrow(
        'Not authorized to delete this panel'
      );
    });

    it('throws when panel not found', async () => {
      vi.mocked(PanelModel.findById).mockResolvedValueOnce(null);

      await expect(service.deletePanel('bad-id', 'user-id-123', false)).rejects.toThrow(
        'Panel not found'
      );
    });
  });
});
