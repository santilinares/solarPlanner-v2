import { describe, it, expect } from 'vitest';
import {
  PanelCreateSchema,
  PanelUpdateSchema,
  PanelQuerySchema,
} from '../../schemas/panel.schema';

const validPanel = {
  brand: 'SunPower',
  model: 'X22-370',
  wattPeak: 370,
  dimensions: { width: 1.0, height: 1.8 },
  efficiency: 22.7,
  warranty: 25,
  price: 350,
  type: 'global' as const,
};

describe('PanelCreateSchema', () => {
  it('accepts valid global panel', () => {
    expect(PanelCreateSchema.safeParse(validPanel).success).toBe(true);
  });

  it('accepts valid personal panel', () => {
    expect(PanelCreateSchema.safeParse({ ...validPanel, type: 'personal' }).success).toBe(true);
  });

  it('accepts all technology enum values', () => {
    for (const tech of ['Monocrystalline', 'Polycrystalline', 'Thin film'] as const) {
      expect(PanelCreateSchema.safeParse({ ...validPanel, technology: tech }).success).toBe(true);
    }
  });

  it('rejects invalid technology', () => {
    expect(PanelCreateSchema.safeParse({ ...validPanel, technology: 'CdTe' }).success).toBe(false);
  });

  it('rejects brand shorter than 2 chars', () => {
    expect(PanelCreateSchema.safeParse({ ...validPanel, brand: 'A' }).success).toBe(false);
  });

  it('rejects model shorter than 2 chars', () => {
    expect(PanelCreateSchema.safeParse({ ...validPanel, model: 'X' }).success).toBe(false);
  });

  it('rejects non-positive wattPeak', () => {
    expect(PanelCreateSchema.safeParse({ ...validPanel, wattPeak: 0 }).success).toBe(false);
    expect(PanelCreateSchema.safeParse({ ...validPanel, wattPeak: -10 }).success).toBe(false);
  });

  it('rejects non-positive dimensions', () => {
    expect(PanelCreateSchema.safeParse({ ...validPanel, dimensions: { width: 0, height: 1 } }).success).toBe(false);
    expect(PanelCreateSchema.safeParse({ ...validPanel, dimensions: { width: 1, height: -1 } }).success).toBe(false);
  });

  it('rejects efficiency outside 0-100', () => {
    expect(PanelCreateSchema.safeParse({ ...validPanel, efficiency: -1 }).success).toBe(false);
    expect(PanelCreateSchema.safeParse({ ...validPanel, efficiency: 101 }).success).toBe(false);
  });

  it('rejects negative warranty', () => {
    expect(PanelCreateSchema.safeParse({ ...validPanel, warranty: -1 }).success).toBe(false);
  });

  it('rejects negative price', () => {
    expect(PanelCreateSchema.safeParse({ ...validPanel, price: -1 }).success).toBe(false);
  });

  it('rejects invalid type', () => {
    expect(PanelCreateSchema.safeParse({ ...validPanel, type: 'shared' }).success).toBe(false);
  });

  it('optional fields can be absent', () => {
    expect(PanelCreateSchema.safeParse(validPanel).success).toBe(true);
  });
});

describe('PanelUpdateSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(PanelUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update', () => {
    expect(PanelUpdateSchema.safeParse({ wattPeak: 400, price: 400 }).success).toBe(true);
  });

  it('still validates field constraints', () => {
    expect(PanelUpdateSchema.safeParse({ wattPeak: -1 }).success).toBe(false);
  });
});

describe('PanelQuerySchema', () => {
  it('accepts empty filters', () => {
    expect(PanelQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts type filter', () => {
    expect(PanelQuerySchema.safeParse({ type: 'global' }).success).toBe(true);
  });

  it('rejects invalid type', () => {
    expect(PanelQuerySchema.safeParse({ type: 'shared' }).success).toBe(false);
  });

  it('accepts technology filter', () => {
    expect(PanelQuerySchema.safeParse({ technology: 'Monocrystalline' }).success).toBe(true);
  });

  it('rejects invalid technology', () => {
    expect(PanelQuerySchema.safeParse({ technology: 'Unknown' }).success).toBe(false);
  });
});
