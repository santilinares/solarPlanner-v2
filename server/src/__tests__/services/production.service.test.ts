import { describe, it, expect } from 'vitest';
import {
  calculateInverterEfficiency,
  calculateEffectiveIrradiance,
} from '../../services/production.service';

describe('calculateInverterEfficiency — PVWatts V5', () => {
  it('returns 0 for zero DC power', () => {
    expect(calculateInverterEfficiency(0, 5000, 0.96)).toBe(0);
  });

  it('returns etaNom for clipping (zeta >= 1)', () => {
    const eta = calculateInverterEfficiency(6000, 5000, 0.96);
    expect(eta).toBeCloseTo(0.96, 3);
  });

  it('returns etaNom for zeta exactly 1', () => {
    // pDc0 = pAcNameplate / etaNom = 5000 / 0.96 ≈ 5208.3
    const pDc0 = 5000 / 0.96;
    expect(calculateInverterEfficiency(pDc0, 5000, 0.96)).toBeCloseTo(0.96, 3);
  });

  it('has higher efficiency at 50% load than at 10% load', () => {
    const pAcNameplate = 5000;
    const etaNom = 0.96;
    const pDc0 = pAcNameplate / etaNom;

    const eta10 = calculateInverterEfficiency(pDc0 * 0.10, pAcNameplate, etaNom);
    const eta50 = calculateInverterEfficiency(pDc0 * 0.50, pAcNameplate, etaNom);

    expect(eta50).toBeGreaterThan(eta10);
  });

  it('efficiency increases significantly from 10% to 50% load', () => {
    // At 10% load the PVWatts V5 curve is well below etaNom; at 50%+ it reaches etaNom.
    const pAcNameplate = 5000;
    const etaNom = 0.96;
    const pDc0 = pAcNameplate / etaNom;

    const eta10 = calculateInverterEfficiency(pDc0 * 0.10, pAcNameplate, etaNom);
    const eta50 = calculateInverterEfficiency(pDc0 * 0.50, pAcNameplate, etaNom);
    const eta90 = calculateInverterEfficiency(pDc0 * 0.90, pAcNameplate, etaNom);

    // Efficiency at low load is clearly below etaNom
    expect(eta10).toBeLessThan(etaNom);
    // Efficiency at medium and high loads reaches or approximates etaNom
    expect(eta50).toBeGreaterThan(eta10);
    expect(eta90).toBeGreaterThan(eta10);
  });

  it('never exceeds etaNom', () => {
    const pAcNameplate = 5000;
    const etaNom = 0.96;
    const pDc0 = pAcNameplate / etaNom;

    for (const fraction of [0.1, 0.3, 0.5, 0.7, 0.9, 1.1]) {
      const eta = calculateInverterEfficiency(pDc0 * fraction, pAcNameplate, etaNom);
      expect(eta).toBeLessThanOrEqual(etaNom + 1e-9);
    }
  });

  it('never returns negative', () => {
    expect(calculateInverterEfficiency(10, 5000, 0.96)).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateEffectiveIrradiance — bifacial model', () => {
  it('returns GTI for monofacial panels (bifacialityFactor = 0)', () => {
    const gti = 800;
    expect(calculateEffectiveIrradiance(gti, 1000, 30, 0, 0.20)).toBe(gti);
  });

  it('returns GTI when GHI is 0', () => {
    const gti = 800;
    expect(calculateEffectiveIrradiance(gti, 0, 30, 0.70, 0.20)).toBe(gti);
  });

  it('increases irradiance for bifacial panels', () => {
    const gti = 800;
    const gEffective = calculateEffectiveIrradiance(gti, 1000, 30, 0.70, 0.20);
    expect(gEffective).toBeGreaterThan(gti);
  });

  it('rear gain is bounded (less than full GHI × bifaciality)', () => {
    const gti = 800;
    const ghi = 1000;
    const bifaciality = 0.70;
    const gEffective = calculateEffectiveIrradiance(gti, ghi, 30, bifaciality, 0.20);
    expect(gEffective).toBeLessThan(gti + bifaciality * ghi);
  });

  it('higher albedo produces more rear gain', () => {
    const gti = 800;
    const ghi = 1000;
    const gEffLow  = calculateEffectiveIrradiance(gti, ghi, 30, 0.70, 0.15);
    const gEffHigh = calculateEffectiveIrradiance(gti, ghi, 30, 0.70, 0.60);
    expect(gEffHigh).toBeGreaterThan(gEffLow);
  });

  it('horizontal panels (tilt = 0) produce zero rear gain', () => {
    const gti = 800;
    const gEffective = calculateEffectiveIrradiance(gti, 1000, 0, 0.70, 0.20);
    expect(gEffective).toBeCloseTo(gti, 5);
  });

  it('vertical panels (tilt = 90) produce maximum view factor rear gain', () => {
    const gti = 400;
    const ghi = 1000;
    const albedo = 0.20;
    const bifaciality = 0.70;
    // view factor = (1 - cos(90°)) / 2 = 0.5
    const expectedRear = albedo * ghi * 0.5;
    const expected = gti + bifaciality * expectedRear;
    const actual = calculateEffectiveIrradiance(gti, ghi, 90, bifaciality, albedo);
    expect(actual).toBeCloseTo(expected, 3);
  });
});
