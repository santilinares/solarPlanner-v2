import { describe, it, expect } from 'vitest';
import {
  GeoPointSchema,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  ProjectQuerySchema,
  OptimalConfigSchema,
  OptimalConfigFromPolygonSchema,
  EstimateSchema,
} from '../../schemas/project.schema';

const validPoint = { lat: 40.7128, lon: -74.006 };
const threePoints = [validPoint, { lat: 40.713, lon: -74.007 }, { lat: 40.714, lon: -74.005 }];

const validProject = {
  name: 'Rooftop Array',
  projectType: 'roof' as const,
  area: threePoints,
  tilt: 30,
  direction: 'south',
  panelNumber: 20,
};

describe('GeoPointSchema', () => {
  it('accepts valid coordinates', () => {
    expect(GeoPointSchema.safeParse(validPoint).success).toBe(true);
  });

  it('rejects lat > 90', () => {
    expect(GeoPointSchema.safeParse({ lat: 91, lon: 0 }).success).toBe(false);
  });

  it('rejects lat < -90', () => {
    expect(GeoPointSchema.safeParse({ lat: -91, lon: 0 }).success).toBe(false);
  });

  it('rejects lon > 180', () => {
    expect(GeoPointSchema.safeParse({ lat: 0, lon: 181 }).success).toBe(false);
  });

  it('rejects lon < -180', () => {
    expect(GeoPointSchema.safeParse({ lat: 0, lon: -181 }).success).toBe(false);
  });

  it('accepts boundary values', () => {
    expect(GeoPointSchema.safeParse({ lat: 90, lon: 180 }).success).toBe(true);
    expect(GeoPointSchema.safeParse({ lat: -90, lon: -180 }).success).toBe(true);
  });
});

describe('ProjectCreateSchema', () => {
  it('accepts valid project', () => {
    expect(ProjectCreateSchema.safeParse(validProject).success).toBe(true);
  });

  it('accepts agrivoltaic type', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, projectType: 'agrivoltaic' }).success).toBe(true);
  });

  it('rejects invalid projectType', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, projectType: 'field' }).success).toBe(false);
  });

  it('rejects name shorter than 2 chars', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, name: 'A' }).success).toBe(false);
  });

  it('rejects area with fewer than 3 points', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, area: [validPoint, validPoint] }).success).toBe(false);
  });

  it('rejects tilt > 90', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, tilt: 91 }).success).toBe(false);
  });

  it('rejects tilt < 0', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, tilt: -1 }).success).toBe(false);
  });

  it('rejects empty direction', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, direction: '' }).success).toBe(false);
  });

  it('rejects non-positive panelNumber', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, panelNumber: 0 }).success).toBe(false);
  });

  it('rejects non-integer panelNumber', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, panelNumber: 1.5 }).success).toBe(false);
  });

  it('accepts optional fields absent', () => {
    expect(ProjectCreateSchema.safeParse(validProject).success).toBe(true);
  });

  it('accepts optional rawSpacing', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, rawSpacing: 2.5 }).success).toBe(true);
  });

  it('accepts country metadata and energy price on creation', () => {
    expect(
      ProjectCreateSchema.safeParse({
        ...validProject,
        azimuth: 180,
        country: 'Spain',
        countryCode: 'ES',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
        price: 0.18,
      }).success
    ).toBe(true);
  });

  it('rejects negative creation price', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, price: -0.01 }).success).toBe(false);
  });

  it('rejects non-positive rawSpacing', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, rawSpacing: 0 }).success).toBe(false);
  });

  it('accepts description up to 500 chars', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, description: 'desc' }).success).toBe(true);
  });

  it('rejects description over 500 chars', () => {
    expect(ProjectCreateSchema.safeParse({ ...validProject, description: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('ProjectUpdateSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(ProjectUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update', () => {
    expect(ProjectUpdateSchema.safeParse({ name: 'New Name', tilt: 45 }).success).toBe(true);
  });

  it('accepts azimuth 0-360', () => {
    expect(ProjectUpdateSchema.safeParse({ azimuth: 180 }).success).toBe(true);
    expect(ProjectUpdateSchema.safeParse({ azimuth: 0 }).success).toBe(true);
    expect(ProjectUpdateSchema.safeParse({ azimuth: 360 }).success).toBe(true);
  });

  it('rejects azimuth > 360', () => {
    expect(ProjectUpdateSchema.safeParse({ azimuth: 361 }).success).toBe(false);
  });

  it('accepts non-negative price', () => {
    expect(ProjectUpdateSchema.safeParse({ price: 0 }).success).toBe(true);
    expect(ProjectUpdateSchema.safeParse({ price: 0.15 }).success).toBe(true);
  });

  it('rejects negative price', () => {
    expect(ProjectUpdateSchema.safeParse({ price: -1 }).success).toBe(false);
  });
});

describe('ProjectQuerySchema', () => {
  it('applies default page and limit', () => {
    const result = ProjectQuerySchema.safeParse({});
    expect(result.success && result.data.page).toBe(1);
    expect(result.success && result.data.limit).toBe(10);
  });

  it('coerces string page and limit', () => {
    const result = ProjectQuerySchema.safeParse({ page: '3', limit: '25' });
    expect(result.success && result.data.page).toBe(3);
    expect(result.success && result.data.limit).toBe(25);
  });

  it('rejects limit > 100', () => {
    expect(ProjectQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('accepts projectType filter', () => {
    expect(ProjectQuerySchema.safeParse({ projectType: 'agrivoltaic' }).success).toBe(true);
  });

  it('rejects invalid projectType', () => {
    expect(ProjectQuerySchema.safeParse({ projectType: 'solar' }).success).toBe(false);
  });

  it('coerces from/to dates', () => {
    const result = ProjectQuerySchema.safeParse({ from: '2024-01-01', to: '2024-12-31' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBeInstanceOf(Date);
      expect(result.data.to).toBeInstanceOf(Date);
    }
  });
});

describe('OptimalConfigSchema', () => {
  const valid = {
    surfaceArea: 100,
    panelWidth: 1.0,
    panelHeight: 1.8,
    tilt: 30,
    latitude: 40,
  };

  it('accepts valid input', () => {
    expect(OptimalConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects non-positive surfaceArea', () => {
    expect(OptimalConfigSchema.safeParse({ ...valid, surfaceArea: 0 }).success).toBe(false);
  });

  it('rejects latitude outside -90 to 90', () => {
    expect(OptimalConfigSchema.safeParse({ ...valid, latitude: 91 }).success).toBe(false);
    expect(OptimalConfigSchema.safeParse({ ...valid, latitude: -91 }).success).toBe(false);
  });
});

describe('OptimalConfigFromPolygonSchema', () => {
  const valid = {
    area: threePoints,
    panelId: '507f1f77bcf86cd799439011',
    tilt: 25,
  };

  it('accepts valid input', () => {
    expect(OptimalConfigFromPolygonSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts optional azimuth', () => {
    expect(OptimalConfigFromPolygonSchema.safeParse({ ...valid, azimuth: 180 }).success).toBe(true);
  });

  it('rejects area with fewer than 3 points', () => {
    expect(OptimalConfigFromPolygonSchema.safeParse({ ...valid, area: [validPoint] }).success).toBe(false);
  });
});

describe('EstimateSchema', () => {
  it('accepts polygon with 3+ points', () => {
    expect(EstimateSchema.safeParse({ area: threePoints }).success).toBe(true);
  });

  it('rejects polygon with fewer than 3 points', () => {
    expect(EstimateSchema.safeParse({ area: [validPoint, validPoint] }).success).toBe(false);
  });

  it('rejects polygon exceeding 1000 points', () => {
    const tooMany = Array.from({ length: 1001 }, () => validPoint);
    expect(EstimateSchema.safeParse({ area: tooMany }).success).toBe(false);
  });
});
