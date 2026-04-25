import { describe, it, expect } from 'vitest';
import {
  CultivarCreateSchema,
  CultivarUpdateSchema,
  CultivarQuerySchema,
} from '../../schemas/cultivar.schema';

const validCultivar = {
  name: 'Wheat',
  category: 'cereal' as const,
  minPanelHeight: 1.5,
  maxPanelHeight: 3.0,
  lightRequirement: 'full-sun' as const,
  recommendedSpacing: 2.0,
  optimalTiltReduction: 10,
};

describe('CultivarCreateSchema', () => {
  it('accepts valid cultivar', () => {
    expect(CultivarCreateSchema.safeParse(validCultivar).success).toBe(true);
  });

  it('accepts all category values', () => {
    for (const cat of ['cereal', 'vegetable', 'fruit', 'legume', 'other'] as const) {
      expect(CultivarCreateSchema.safeParse({ ...validCultivar, category: cat }).success).toBe(true);
    }
  });

  it('accepts all lightRequirement values', () => {
    for (const req of ['full-sun', 'partial-shade', 'shade-tolerant'] as const) {
      expect(CultivarCreateSchema.safeParse({ ...validCultivar, lightRequirement: req }).success).toBe(true);
    }
  });

  it('allows optional notes', () => {
    expect(CultivarCreateSchema.safeParse({ ...validCultivar, notes: 'some note' }).success).toBe(true);
    expect(CultivarCreateSchema.safeParse(validCultivar).success).toBe(true);
  });

  it('rejects name shorter than 2 chars', () => {
    expect(CultivarCreateSchema.safeParse({ ...validCultivar, name: 'X' }).success).toBe(false);
  });

  it('rejects invalid category', () => {
    expect(CultivarCreateSchema.safeParse({ ...validCultivar, category: 'flower' }).success).toBe(false);
  });

  it('rejects invalid lightRequirement', () => {
    expect(CultivarCreateSchema.safeParse({ ...validCultivar, lightRequirement: 'dark' }).success).toBe(false);
  });

  it('rejects negative minPanelHeight', () => {
    expect(CultivarCreateSchema.safeParse({ ...validCultivar, minPanelHeight: -1 }).success).toBe(false);
  });

  it('rejects optimalTiltReduction > 45', () => {
    expect(CultivarCreateSchema.safeParse({ ...validCultivar, optimalTiltReduction: 46 }).success).toBe(false);
  });

  it('rejects maxPanelHeight < minPanelHeight', () => {
    const result = CultivarCreateSchema.safeParse({
      ...validCultivar,
      minPanelHeight: 3.0,
      maxPanelHeight: 1.5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('maxPanelHeight');
    }
  });

  it('accepts equal minPanelHeight and maxPanelHeight', () => {
    expect(
      CultivarCreateSchema.safeParse({ ...validCultivar, minPanelHeight: 2, maxPanelHeight: 2 }).success
    ).toBe(true);
  });

  it('rejects non-positive recommendedSpacing', () => {
    expect(CultivarCreateSchema.safeParse({ ...validCultivar, recommendedSpacing: 0 }).success).toBe(false);
  });
});

describe('CultivarUpdateSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(CultivarUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update', () => {
    expect(CultivarUpdateSchema.safeParse({ name: 'Barley' }).success).toBe(true);
  });

  it('rejects maxPanelHeight < minPanelHeight when both provided', () => {
    expect(
      CultivarUpdateSchema.safeParse({ minPanelHeight: 3, maxPanelHeight: 1 }).success
    ).toBe(false);
  });

  it('allows updating only maxPanelHeight without minPanelHeight (no cross-check)', () => {
    expect(CultivarUpdateSchema.safeParse({ maxPanelHeight: 0.5 }).success).toBe(true);
  });
});

describe('CultivarQuerySchema', () => {
  it('applies default page and limit', () => {
    const result = CultivarQuerySchema.safeParse({});
    expect(result.success && result.data.page).toBe(1);
    expect(result.success && result.data.limit).toBe(20);
  });

  it('coerces string page and limit to numbers', () => {
    const result = CultivarQuerySchema.safeParse({ page: '2', limit: '50' });
    expect(result.success && result.data.page).toBe(2);
    expect(result.success && result.data.limit).toBe(50);
  });

  it('rejects limit > 100', () => {
    expect(CultivarQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('accepts category filter', () => {
    expect(CultivarQuerySchema.safeParse({ category: 'fruit' }).success).toBe(true);
  });

  it('rejects invalid category', () => {
    expect(CultivarQuerySchema.safeParse({ category: 'herb' }).success).toBe(false);
  });
});
