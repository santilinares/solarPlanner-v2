# Solar Planner v2 — Implementation Guide for Pending Features

> **Target:** Claude Code / AI Assistant  
> **Context:** Backend refactor + 4 critical features implementation  
> **Stack:** Node.js, Express, TypeScript, MongoDB/Mongoose, Zod  
> **Estimated time:** 4-6 hours

---

## 📋 Table of Contents

1. [Implementation Order](#implementation-order)
2. [Gap #6: CEC Panel Catalog Seed](#gap-6-cec-panel-catalog-seed)
3. [Gap #1: Installation Cost + Economic Metrics](#gap-1-installation-cost--economic-metrics)
4. [Gap #3: Inverter Efficiency Curve (PVWatts V5)](#gap-3-inverter-efficiency-curve-pvwatts-v5)
5. [Gap #7: Bifacial Panel Model](#gap-7-bifacial-panel-model)
6. [Testing & Validation](#testing--validation)
7. [Documentation Updates](#documentation-updates)

---

## 🎯 Implementation Order

Execute in this exact order to avoid dependencies issues:

```
1. Gap #6 → Panel catalog (enables testing with real panels)
2. Gap #1 → Economic metrics (independent feature)
3. Gap #3 → Inverter curve (modifies production calculation)
4. Gap #7 → Bifacial model (depends on Gap #3 completion)
```

---

## Gap #6: CEC Panel Catalog Seed

### 🎯 Objective
Populate `Panels` collection with 30-50 representative modules from CEC database.

### 📁 Files to Create/Modify

#### 1. `server/src/data/cec-panels-subset.json`

Create this file with the following curated panel list:

```json
[
  {
    "Manufacturer": "Jinko Solar Co. Ltd.",
    "Model": "JKM400M-72HL",
    "Nameplate_Pmax": "400",
    "I_sc_ref": "10.38",
    "V_oc_ref": "49.56",
    "I_mp_ref": "9.80",
    "V_mp_ref": "40.84",
    "T_PmaxC": "-0.370",
    "NOCT": "45",
    "Bifacial": "0",
    "Bifaciality": "0",
    "PVModTech_name": "Mono-c-Si"
  },
  {
    "Manufacturer": "LONGi Solar Technology Co. Ltd.",
    "Model": "LR5-72HIH-500M",
    "Nameplate_Pmax": "500",
    "I_sc_ref": "13.48",
    "V_oc_ref": "47.86",
    "I_mp_ref": "12.80",
    "V_mp_ref": "39.06",
    "T_PmaxC": "-0.340",
    "NOCT": "43",
    "Bifacial": "0",
    "Bifaciality": "0",
    "PVModTech_name": "Mono-c-Si"
  },
  {
    "Manufacturer": "Trina Solar Co. Ltd.",
    "Model": "TSM-DEG21C.20 575",
    "Nameplate_Pmax": "575",
    "I_sc_ref": "14.30",
    "V_oc_ref": "51.70",
    "I_mp_ref": "13.60",
    "V_mp_ref": "42.30",
    "T_PmaxC": "-0.290",
    "NOCT": "44",
    "Bifacial": "1",
    "Bifaciality": "0.70",
    "PVModTech_name": "Mono-c-Si"
  },
  {
    "Manufacturer": "REC Solar EMEA GmbH",
    "Model": "REC Alpha Pure-R 405",
    "Nameplate_Pmax": "405",
    "I_sc_ref": "10.77",
    "V_oc_ref": "48.60",
    "I_mp_ref": "10.16",
    "V_mp_ref": "39.87",
    "T_PmaxC": "-0.260",
    "NOCT": "44",
    "Bifacial": "0",
    "Bifaciality": "0",
    "PVModTech_name": "HJT"
  },
  {
    "Manufacturer": "Canadian Solar Inc.",
    "Model": "CS3U-370P",
    "Nameplate_Pmax": "370",
    "I_sc_ref": "9.45",
    "V_oc_ref": "48.90",
    "I_mp_ref": "8.88",
    "V_mp_ref": "41.66",
    "T_PmaxC": "-0.390",
    "NOCT": "46",
    "Bifacial": "0",
    "Bifaciality": "0",
    "PVModTech_name": "Multi-c-Si"
  },
  {
    "Manufacturer": "Q CELLS",
    "Model": "Q.PEAK DUO BLK ML-G10+ 405",
    "Nameplate_Pmax": "405",
    "I_sc_ref": "10.57",
    "V_oc_ref": "49.50",
    "I_mp_ref": "9.96",
    "V_mp_ref": "40.68",
    "T_PmaxC": "-0.340",
    "NOCT": "45",
    "Bifacial": "0",
    "Bifaciality": "0",
    "PVModTech_name": "Mono-c-Si"
  },
  {
    "Manufacturer": "Jinko Solar Co. Ltd.",
    "Model": "JKM575N-72HL4-BDV",
    "Nameplate_Pmax": "575",
    "I_sc_ref": "14.24",
    "V_oc_ref": "51.90",
    "I_mp_ref": "13.54",
    "V_mp_ref": "42.46",
    "T_PmaxC": "-0.300",
    "NOCT": "44",
    "Bifacial": "1",
    "Bifaciality": "0.75",
    "PVModTech_name": "Mono-c-Si"
  },
  {
    "Manufacturer": "SunPower Corp",
    "Model": "SPR-X22-370",
    "Nameplate_Pmax": "370",
    "I_sc_ref": "6.46",
    "V_oc_ref": "68.20",
    "I_mp_ref": "6.03",
    "V_mp_ref": "61.30",
    "T_PmaxC": "-0.290",
    "NOCT": "45",
    "Bifacial": "0",
    "Bifaciality": "0",
    "PVModTech_name": "Mono-c-Si"
  }
]
```

**Note:** This is a minimal subset. For full implementation, expand to 30-50 panels covering:
- Power ranges: 300-400W (residential), 450-550W (commercial), >550W (utility)
- Technologies: Mono-Si, Multi-Si, HJT, TOPCon
- Manufacturers: Jinko, LONGi, Trina, REC, Canadian, Q-CELLS, SunPower, JA Solar

#### 2. `server/src/scripts/seed-panels.ts`

Create new script:

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import mongoose from 'mongoose';
import Panel from '../models/panels.model';
import { logger } from '../utils/logger';

// Type mapping from CEC to our schema
function mapPVModTechToType(pvModTech: string): string {
  const mapping: Record<string, string> = {
    'Mono-c-Si': 'monocrystalline',
    'Multi-c-Si': 'polycrystalline',
    'HJT': 'monocrystalline', // Heterojunction is mono-based
    'a-Si': 'thin_film',
    'CdTe': 'thin_film',
    'CIGS': 'thin_film',
  };
  return mapping[pvModTech] || 'monocrystalline';
}

interface CECPanelRecord {
  Manufacturer: string;
  Model: string;
  Nameplate_Pmax: string;
  I_sc_ref: string;
  V_oc_ref: string;
  I_mp_ref: string;
  V_mp_ref: string;
  T_PmaxC: string;
  NOCT: string;
  Bifacial: string;
  Bifaciality: string;
  PVModTech_name: string;
}

async function seedPanels() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/solar-planner';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Load JSON
    const jsonPath = join(__dirname, '../data/cec-panels-subset.json');
    const jsonContent = readFileSync(jsonPath, 'utf-8');
    const records: CECPanelRecord[] = JSON.parse(jsonContent);

    logger.info(`Loaded ${records.length} panels from CEC subset`);

    let insertedCount = 0;
    let updatedCount = 0;

    for (const rec of records) {
      const panelData = {
        brand: rec.Manufacturer,
        model: rec.Model,
        wattPeak: Number(rec.Nameplate_Pmax),
        stcIsc: Number(rec.I_sc_ref),
        stcVoc: Number(rec.V_oc_ref),
        stcImp: Number(rec.I_mp_ref),
        stcVmp: Number(rec.V_mp_ref),
        gammaPmp: Number(rec.T_PmaxC),
        noct: Number(rec.NOCT),
        bifacial: rec.Bifacial === '1',
        bifacialityFactor: Number(rec.Bifaciality) || 0,
        type: mapPVModTechToType(rec.PVModTech_name),
        // Default values for fields not in CEC
        degradationFirstYear: 2.0,
        degradationAnnual: 0.5,
      };

      const result = await Panel.updateOne(
        { brand: rec.Manufacturer, model: rec.Model },
        { $set: panelData },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        insertedCount++;
      } else if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    logger.info(`✅ Seed completed: ${insertedCount} inserted, ${updatedCount} updated`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedPanels();
```

#### 3. Add script to `package.json`

```json
{
  "scripts": {
    "seed:panels": "ts-node server/src/scripts/seed-panels.ts"
  }
}
```

#### 4. Execute

```bash
npm run seed:panels
```

**Validation:**
```bash
# MongoDB shell or Compass
db.panels.countDocuments()  // Should return 8-50
db.panels.find({ bifacial: true }).count()  // Should return 2+
```

---

## Gap #1: Installation Cost + Economic Metrics

### 🎯 Objective
Add `installationCost` field + CAPEX benchmarks + payback/ROI calculations.

### 📁 Files to Create/Modify

#### 1. `server/src/data/capex-benchmarks-eu.ts`

Create new file:

```typescript
/**
 * CAPEX benchmarks for solar installations in Europe (€/kWp)
 * Source: Solar Data Atlas 2025-2026
 * https://www.solardataatlas.com/en/data-solar-capex-europe
 * 
 * Update frequency: Every 12-24 months
 * Last update: March 2025
 */

export type CapexSegment = 'residential' | 'commercial' | 'utility' | 'agrivoltaic';

export interface CountryCapexSegment {
  min: number;  // €/kWp
  max: number;  // €/kWp
  mid: number;  // €/kWp — default value for estimation
}

export type CountryCapexConfig = Record<CapexSegment, CountryCapexSegment>;

export const CAPEX_BENCHMARKS_EU: Record<string, CountryCapexConfig> = {
  ES: {
    utility: { min: 550, max: 750, mid: 650 },
    commercial: { min: 700, max: 1100, mid: 900 },
    residential: { min: 1100, max: 1600, mid: 1350 },
    agrivoltaic: { min: 650, max: 900, mid: 775 }, // Similar to utility + mounting
  },
  PT: {
    utility: { min: 580, max: 720, mid: 650 },
    commercial: { min: 680, max: 880, mid: 780 },
    residential: { min: 1000, max: 1400, mid: 1200 },
    agrivoltaic: { min: 670, max: 850, mid: 760 },
  },
  DE: {
    utility: { min: 650, max: 850, mid: 750 },
    commercial: { min: 850, max: 1150, mid: 1000 },
    residential: { min: 1300, max: 1700, mid: 1500 },
    agrivoltaic: { min: 750, max: 950, mid: 850 },
  },
  FR: {
    utility: { min: 750, max: 950, mid: 850 },
    commercial: { min: 950, max: 1250, mid: 1100 },
    residential: { min: 1650, max: 2050, mid: 1850 },
    agrivoltaic: { min: 850, max: 1050, mid: 950 },
  },
  IT: {
    utility: { min: 675, max: 875, mid: 775 },
    commercial: { min: 900, max: 1200, mid: 1050 },
    residential: { min: 1350, max: 1750, mid: 1550 },
    agrivoltaic: { min: 775, max: 975, mid: 875 },
  },
  GB: {
    utility: { min: 700, max: 900, mid: 800 },
    commercial: { min: 900, max: 1300, mid: 1100 },
    residential: { min: 1400, max: 1900, mid: 1650 },
    agrivoltaic: { min: 800, max: 1000, mid: 900 },
  },
  NL: {
    utility: { min: 675, max: 875, mid: 775 },
    commercial: { min: 850, max: 1150, mid: 1000 },
    residential: { min: 1350, max: 1750, mid: 1550 },
    agrivoltaic: { min: 775, max: 975, mid: 875 },
  },
  BE: {
    utility: { min: 700, max: 900, mid: 800 },
    commercial: { min: 900, max: 1200, mid: 1050 },
    residential: { min: 1400, max: 1800, mid: 1600 },
    agrivoltaic: { min: 800, max: 1000, mid: 900 },
  },
  PL: {
    utility: { min: 500, max: 700, mid: 600 },
    commercial: { min: 650, max: 950, mid: 800 },
    residential: { min: 900, max: 1300, mid: 1100 },
    agrivoltaic: { min: 600, max: 800, mid: 700 },
  },
  AT: {
    utility: { min: 650, max: 850, mid: 750 },
    commercial: { min: 850, max: 1150, mid: 1000 },
    residential: { min: 1300, max: 1700, mid: 1500 },
    agrivoltaic: { min: 750, max: 950, mid: 850 },
  },
};

// Fallback for countries not in table
export const DEFAULT_COUNTRY = 'ES';
```

#### 2. `server/src/services/capex-benchmark.service.ts`

Create new service:

```typescript
import {
  CAPEX_BENCHMARKS_EU,
  CapexSegment,
  DEFAULT_COUNTRY,
} from '../data/capex-benchmarks-eu';

export interface CapexPerKwpResult {
  value: number;        // €/kWp — mid value
  min: number;          // €/kWp
  max: number;          // €/kWp
  source: 'benchmark';
  countryCode: string;
  segment: CapexSegment;
  year: number;         // Data vintage
}

/**
 * Get CAPEX per kWp for a given country and segment
 * @param countryCode ISO 3166-1 alpha-2 (ES, PT, DE, etc.)
 * @param segment Installation type
 * @param defaultCountry Fallback if countryCode not found
 * @returns Benchmark data or null if not available
 */
export function getCapexPerKwp(
  countryCode: string,
  segment: CapexSegment,
  defaultCountry: string = DEFAULT_COUNTRY,
): CapexPerKwpResult | null {
  const upperCountry = (countryCode || defaultCountry).toUpperCase();

  // Try requested country
  let countryData = CAPEX_BENCHMARKS_EU[upperCountry];
  let usedCountry = upperCountry;

  // Fallback to default
  if (!countryData) {
    countryData = CAPEX_BENCHMARKS_EU[defaultCountry];
    usedCountry = defaultCountry;
  }

  if (!countryData) return null;

  // Get segment data (fallback to residential if segment not found)
  const segmentData = countryData[segment] ?? countryData['residential'];

  if (!segmentData) return null;

  return {
    value: segmentData.mid,
    min: segmentData.min,
    max: segmentData.max,
    source: 'benchmark',
    countryCode: usedCountry,
    segment,
    year: 2025, // Update when refreshing benchmarks
  };
}
```

#### 3. `server/src/models/projects.model.ts`

**Add new fields:**

```typescript
// Add to IProject interface
export interface IProject extends Document {
  // ... existing fields

  // NEW: Installation cost
  installationCost?: number;  // € total — user-provided or estimated
  segment?: 'residential' | 'commercial' | 'utility' | 'agrivoltaic';

  // ... rest of fields
}

// Update ProjectSchema
const ProjectSchema = new Schema<IProject>({
  // ... existing fields

  installationCost: {
    type: Number,
    min: 0,
  },
  segment: {
    type: String,
    enum: ['residential', 'commercial', 'utility', 'agrivoltaic'],
    default: 'residential',
  },

  // ... rest of schema
});
```

#### 4. `server/src/schemas/projects.schema.ts`

**Update Zod schemas:**

```typescript
import { z } from 'zod';

// Add to ProjectCreateSchema
export const ProjectCreateSchema = z.object({
  // ... existing fields

  installationCost: z.number().positive().optional(),
  segment: z.enum(['residential', 'commercial', 'utility', 'agrivoltaic']).optional(),

  // ... rest of fields
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();
```

#### 5. `server/src/types/project.types.ts`

**Update analytics interface:**

```typescript
export interface ProjectAnalytics {
  capacityFactor: number | null;
  performanceRatio: number | null;
  annualSavingsEur: number | null;
  paybackYears: number | null;              // NEW
  roi25Years: number | null;                // NEW
  annualSavingsPerYear: number[];           // NEW — length 25
  installationCostUsed: number | null;      // NEW
  installationCostSource: 'user' | 'benchmark' | null;  // NEW
}
```

#### 6. `server/src/services/project.service.ts`

**Modify `getProjectAnalytics()` method:**

```typescript
import { getCapexPerKwp } from './capex-benchmark.service';

async getProjectAnalytics(id: string, caller: UserContext): Promise<ProjectAnalytics> {
  const project = await this.getProjectByIdOrThrow(id, caller);

  const panel = project.panel;
  const panelNumber = project.panelNumber ?? 0;

  // DC power (kWp)
  const dcPowerKw = (panelNumber > 0 && panel?.wattPeak)
    ? (panelNumber * panel.wattPeak) / 1000
    : 0;

  // 1. Capacity Factor
  const yearlyKwh = project.pvgisRef?.yearlyKwh ?? null;
  const capacityFactor = (yearlyKwh && dcPowerKw > 0)
    ? (100 * yearlyKwh) / (dcPowerKw * 8760)
    : null;

  // 2. Performance Ratio
  const yearlyPOA = project.pvgisRef?.yearlyPOAIrradiation ?? null;
  const performanceRatio = (yearlyKwh && yearlyPOA && dcPowerKw > 0)
    ? (100 * yearlyKwh) / (dcPowerKw * yearlyPOA)
    : null;

  // 3. Annual savings
  const price = project.price ?? null;
  const annualSavingsEur = (yearlyKwh && price)
    ? yearlyKwh * price
    : null;

  // 4. Installation cost (user > benchmark)
  let installationCost = project.installationCost ?? null;
  let installationCostSource: 'user' | 'benchmark' | null = null;

  if (installationCost != null) {
    installationCostSource = 'user';
  } else if (dcPowerKw > 0) {
    const segment = project.segment ?? 'residential';
    const countryCode = project.countryCode ?? 'ES';
    const capex = getCapexPerKwp(countryCode, segment);

    if (capex) {
      installationCost = dcPowerKw * capex.value;
      installationCostSource = 'benchmark';
    }
  }

  // 5. Payback
  const paybackYears = (installationCost != null && annualSavingsEur && annualSavingsEur > 0)
    ? installationCost / annualSavingsEur
    : null;

  // 6. ROI 25 years + annual savings projection
  const roiYears = 25;
  const annualSavingsPerYear: number[] = [];
  let roi25Years: number | null = null;

  if (annualSavingsEur && installationCost != null && panel && yearlyKwh) {
    const degradationFirst = panel.degradationFirstYear ?? 2.0;
    const degradationAnnual = panel.degradationAnnual ?? 0.5;

    let cumulativeSavings = 0;

    for (let year = 1; year <= roiYears; year++) {
      // Production degradation
      const prodFactor = (1 - degradationFirst / 100) * Math.pow(1 - degradationAnnual / 100, year - 1);
      const prodYear = yearlyKwh * prodFactor;
      const savingsYear = prodYear * price!;

      annualSavingsPerYear.push(savingsYear);
      cumulativeSavings += savingsYear;
    }

    roi25Years = (100 * (cumulativeSavings - installationCost)) / installationCost;
  }

  return {
    capacityFactor,
    performanceRatio,
    annualSavingsEur,
    paybackYears,
    roi25Years,
    annualSavingsPerYear,
    installationCostUsed: installationCost,
    installationCostSource,
  };
}
```

#### 7. Frontend (Optional — if time allows)

**`client/src/app/core/models/project.model.ts`:**

```typescript
export interface ProjectResponse {
  // ... existing
  installationCost?: number;
  segment?: 'residential' | 'commercial' | 'utility' | 'agrivoltaic';
}

export interface ProjectAnalytics {
  capacityFactor: number | null;
  performanceRatio: number | null;
  annualSavingsEur: number | null;
  paybackYears: number | null;
  roi25Years: number | null;
  annualSavingsPerYear: number[];
  installationCostUsed?: number | null;
  installationCostSource?: 'user' | 'benchmark' | null;
}
```

---

## Gap #3: Inverter Efficiency Curve (PVWatts V5)

### 🎯 Objective
Replace flat inverter efficiency with PVWatts V5 dynamic curve.

### 📁 Files to Modify

#### 1. `server/src/services/production.service.ts`

**Add new function (before `calculateHourlyOutputKwh`):**

```typescript
/**
 * Calculate inverter efficiency using PVWatts V5 model
 * Reference: NREL/TP-6A20-62641, Eq. 10-11
 * https://pvwatts.nrel.gov/downloads/pvwattsv5.pdf
 * 
 * @param pDc DC power input to inverter (W)
 * @param pAcNameplate Inverter AC rating (W)
 * @param etaNom Nominal inverter efficiency at rated power (default 0.96)
 * @param etaRef Reference efficiency for CEC inverters post-2010 (0.9637)
 * @returns Efficiency [0-1]
 */
function calculateInverterEfficiency(
  pDc: number,
  pAcNameplate: number,
  etaNom: number = 0.96,
  etaRef: number = 0.9637,
): number {
  if (pDc <= 0) return 0;

  const pDc0 = pAcNameplate / etaNom;  // DC power at rated AC output
  const zeta = pDc / pDc0;             // Load factor

  // Clipping: if DC power exceeds inverter capacity
  if (zeta >= 1.0) {
    return etaNom;
  }

  // PVWatts V5 efficiency curve (Eq. 10)
  const eta = (etaNom / etaRef) * (
    -0.0162 * zeta - 0.0059 / zeta + 0.9858
  );

  // Clamp to valid range
  return Math.max(0, Math.min(eta, etaNom));
}
```

**Modify `calculateHourlyOutputKwh()` — Step 6:**

```typescript
private calculateHourlyOutputKwh(params: {
  // ... existing params
}): number {
  // ... Steps 1-5 unchanged

  // Step 6: Inverter conversion (MODIFIED)
  const pAcNameplate = (panelNumber * wattPeak) / dcAcRatio;  // W

  // Use PVWatts V5 curve instead of flat efficiency
  const eta = calculateInverterEfficiency(
    pDcLoss,
    pAcNameplate,
    systemLosses.inverterEfficiency / 100,  // Convert % to [0-1]
  );

  let pAc = eta * pDcLoss;  // W

  // Ensure we don't exceed inverter rating (safety check)
  if (pAc > pAcNameplate) {
    pAc = pAcNameplate;
  }

  // Step 7: AC wiring losses (unchanged)
  const pAcFinal = pAc * (1 - systemLosses.acWiring / 100);

  // Step 8: Energy (unchanged)
  return Math.max(0, pAcFinal / 1000);  // kWh
}
```

---

## Gap #7: Bifacial Panel Model

### 🎯 Objective
Add albedo-based rear irradiance gain for bifacial panels.

### 📁 Files to Create/Modify

#### 1. `server/src/data/albedo-presets.ts`

Create new file:

```typescript
/**
 * Albedo coefficients for different ground surfaces
 * Source: IEA-PVPS Task 13 (2021) + NREL PVWatts documentation
 */

export const ALBEDO_PRESETS: Record<string, number> = {
  grass: 0.20,              // Default — lawn, meadow
  asphalt: 0.15,            // Dark pavement
  concrete: 0.25,           // Gray concrete, gravel
  white_roof: 0.60,         // White membrane roofing
  fresh_snow: 0.80,         // Fresh snow (seasonal)
  agricultural: 0.18,       // Bare soil, crops
  water: 0.06,              // Water bodies
  desert_sand: 0.40,        // Light-colored sand
};

export const DEFAULT_ALBEDO = ALBEDO_PRESETS.grass;
```

#### 2. `server/src/models/projects.model.ts`

**Add albedo field:**

```typescript
export interface IProject extends Document {
  // ... existing fields

  albedo?: number;  // Ground reflectance [0-1], default 0.20

  // ... rest
}

const ProjectSchema = new Schema<IProject>({
  // ... existing

  albedo: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.20,  // Grass
  },

  // ... rest
});
```

#### 3. `server/src/schemas/projects.schema.ts`

```typescript
export const ProjectCreateSchema = z.object({
  // ... existing

  albedo: z.number().min(0).max(1).optional(),

  // ... rest
});
```

#### 4. `server/src/services/openmeteo.service.ts`

**Add GHI to requested variables:**

```typescript
async getWeatherData(params: WeatherDataParams): Promise<WeatherPoint[]> {
  // ... existing code

  const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: params.latitude,
      longitude: params.longitude,
      // MODIFIED: Add shortwave_radiation (GHI)
      hourly: 'global_tilted_irradiance,shortwave_radiation,temperature_2m,wind_speed_10m',
      temperature_unit: 'celsius',
      wind_speed_unit: 'ms',
      timeformat: 'unixtime',
      timezone: params.timezone || 'auto',
      tilt: params.tilt || 30,
      azimuth: this.convertAzimuthToOpenMeteo(params.azimuth || 180),
      past_days: params.pastDays || 0,
      forecast_days: params.forecastDays || 7,
    },
  });

  // ... existing validation

  const points: WeatherPoint[] = [];
  for (let i = 0; i < times.length; i++) {
    points.push({
      dateTime: new Date(times[i] * 1000),
      gti: hourly.global_tilted_irradiance[i],
      ghi: hourly.shortwave_radiation[i],  // NEW
      temperature: hourly.temperature_2m[i],
      windSpeed: hourly.wind_speed_10m[i],
    });
  }

  return points;
}
```

**Update `WeatherPoint` type:**

```typescript
export interface WeatherPoint {
  dateTime: Date;
  gti: number;      // W/m² — GTI (plane of array)
  ghi: number;      // W/m² — GHI (horizontal) — NEW
  temperature: number;  // °C
  windSpeed: number;    // m/s
}
```

#### 5. `server/src/services/production.service.ts`

**Add bifacial calculation function:**

```typescript
/**
 * Calculate effective irradiance for bifacial panels
 * Model: Isotropic sky view factor (IEA-PVPS Task 13)
 * 
 * @param gti Global tilted irradiance (front side) [W/m²]
 * @param ghi Global horizontal irradiance [W/m²]
 * @param tilt Panel tilt angle [degrees]
 * @param bifacialityFactor Rear-to-front power ratio [0-1]
 * @param albedo Ground reflectance [0-1]
 * @returns Effective irradiance accounting for rear gain [W/m²]
 */
function calculateEffectiveIrradiance(
  gti: number,
  ghi: number,
  tilt: number,
  bifacialityFactor: number,
  albedo: number,
): number {
  // Monofacial case
  if (bifacialityFactor === 0 || ghi <= 0) {
    return gti;
  }

  // View factor: fraction of sky visible by rear side
  // For isotropic model: F_view = (1 - cos(tilt)) / 2
  const tiltRad = (tilt * Math.PI) / 180;
  const viewFactor = (1 - Math.cos(tiltRad)) / 2;

  // Rear irradiance from ground reflection
  const gRear = albedo * ghi * viewFactor;

  // Effective irradiance
  return gti + bifacialityFactor * gRear;
}
```

**Modify `calculateHourlyOutputKwh()` — Step 4:**

```typescript
private calculateHourlyOutputKwh(params: {
  gti: number;
  ghi: number;          // NEW
  temperature: number;
  windSpeed: number;
  wattPeak: number;
  panelNumber: number;
  tilt: number;         // NEW (should already exist)
  albedo: number;       // NEW
  systemLosses: SystemLosses;
  dcAcRatio: number;
  gammaPmp: number;
  noct: number;
  bifacialityFactor: number;  // NEW
  degradationFirstYear: number;
  degradationAnnual: number;
  year: number;
}): number {
  const {
    gti,
    ghi,
    temperature,
    windSpeed,
    wattPeak,
    panelNumber,
    tilt,
    albedo,
    systemLosses,
    dcAcRatio,
    gammaPmp,
    noct,
    bifacialityFactor,
    degradationFirstYear,
    degradationAnnual,
    year,
  } = params;

  // Steps 1-3: unchanged
  // ...

  // Step 4: Array DC power (MODIFIED for bifacial)
  const gEffective = calculateEffectiveIrradiance(
    gti,
    ghi,
    tilt,
    bifacialityFactor,
    albedo,
  );

  const pArrayDc = pDcPerPanel * degradationFactor * (gEffective / 1000) * panelNumber;

  // Steps 5-8: unchanged
  // ...
}
```

**Update all call sites** to pass new parameters:

In `refreshProductionData()` and `calculateProductionPoints()`:

```typescript
// Extract bifaciality from panel
const bifacialityFactor = panel?.bifacialityFactor ?? PANEL_DEFAULTS.bifacialityFactor;

// Extract albedo from project
const albedo = project.albedo ?? 0.20;

// Extract tilt (should already exist)
const tilt = project.tilt ?? 30;

// In loop over weather points:
for (const wp of weatherPoints) {
  const kwh = this.calculateHourlyOutputKwh({
    gti: wp.gti,
    ghi: wp.ghi,          // NEW
    temperature: wp.temperature,
    windSpeed: wp.windSpeed,
    wattPeak,
    panelNumber,
    tilt,                 // NEW
    albedo,               // NEW
    systemLosses,
    dcAcRatio,
    gammaPmp,
    noct,
    bifacialityFactor,    // NEW
    degradationFirstYear,
    degradationAnnual,
    year: currentYear,
  });

  // ... rest
}
```

---

## Testing & Validation

### Unit Tests

Create `server/src/services/__tests__/production.service.test.ts`:

```typescript
import { calculateInverterEfficiency } from '../production.service';

describe('PVWatts V5 Inverter Efficiency', () => {
  it('should return 0 for zero DC power', () => {
    expect(calculateInverterEfficiency(0, 5000, 0.96)).toBe(0);
  });

  it('should return etaNom for clipping (zeta >= 1)', () => {
    const pDc = 6000;
    const pAcNameplate = 5000;
    const etaNom = 0.96;
    const eta = calculateInverterEfficiency(pDc, pAcNameplate, etaNom);
    expect(eta).toBeCloseTo(0.96, 3);
  });

  it('should have maximum efficiency around 50-70% load', () => {
    const pAcNameplate = 5000;
    const etaNom = 0.96;

    const eta10 = calculateInverterEfficiency(521, pAcNameplate, etaNom); // 10% load
    const eta50 = calculateInverterEfficiency(2604, pAcNameplate, etaNom); // 50% load
    const eta90 = calculateInverterEfficiency(4688, pAcNameplate, etaNom); // 90% load

    expect(eta50).toBeGreaterThan(eta10);
    expect(eta50).toBeGreaterThan(eta90);
  });
});

describe('Bifacial Effective Irradiance', () => {
  it('should equal GTI for monofacial panels', () => {
    const gEff = calculateEffectiveIrradiance(800, 1000, 30, 0, 0.20);
    expect(gEff).toBe(800);
  });

  it('should increase for bifacial panels', () => {
    const gti = 800;
    const ghi = 1000;
    const gEff = calculateEffectiveIrradiance(gti, ghi, 30, 0.70, 0.20);
    expect(gEff).toBeGreaterThan(gti);
    expect(gEff).toBeLessThan(gti + 0.70 * ghi); // Sanity check
  });

  it('should increase with higher albedo', () => {
    const params = { gti: 800, ghi: 1000, tilt: 30, bifaciality: 0.70 };
    const gEffLow = calculateEffectiveIrradiance(params.gti, params.ghi, params.tilt, params.bifaciality, 0.15);
    const gEffHigh = calculateEffectiveIrradiance(params.gti, params.ghi, params.tilt, params.bifaciality, 0.60);
    expect(gEffHigh).toBeGreaterThan(gEffLow);
  });
});
```

### Integration Tests

**Test project creation with new fields:**

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Bifacial Project",
    "latitude": 40.416775,
    "longitude": -3.703790,
    "panelNumber": 20,
    "panel": "PANEL_ID_HERE",
    "tilt": 30,
    "azimuth": 180,
    "segment": "residential",
    "installationCost": 15000,
    "albedo": 0.25
  }'
```

**Test analytics endpoint:**

```bash
curl -X GET http://localhost:3000/api/projects/:projectId/analytics \
  -H "Authorization: Bearer $TOKEN"
```

**Expected response:**

```json
{
  "capacityFactor": 18.5,
  "performanceRatio": 78.3,
  "annualSavingsEur": 890.50,
  "paybackYears": 16.8,
  "roi25Years": 45.2,
  "annualSavingsPerYear": [890.50, 871.98, ...],
  "installationCostUsed": 15000,
  "installationCostSource": "user"
}
```

### Validation Checklist

- [ ] Panels seeded successfully (verify in MongoDB)
- [ ] Bifacial panels have `bifacialityFactor > 0`
- [ ] Projects accept `installationCost` and `segment` fields
- [ ] Analytics endpoint returns payback/ROI
- [ ] Benchmark estimation works when `installationCost` is null
- [ ] Inverter efficiency varies with load (test at 10%, 50%, 90%)
- [ ] Bifacial projects show higher production than monofacial (same GTI)
- [ ] Albedo changes affect bifacial production

---

## Documentation Updates

### Update `solar-planner-backend-spec.md`

Mark as implemented:

```markdown
## 2.1 Installation Cost ✅ IMPLEMENTED

- `installationCost?: number` — total system cost (€)
- CAPEX benchmarks: `server/src/data/capex-benchmarks-eu.ts`
- Source: Solar Data Atlas 2025-2026

## 3.1 Inverter Model ✅ IMPLEMENTED

Using PVWatts V5 dynamic efficiency curve (NREL/TP-6A20-62641).
Typical efficiency: 92-97% depending on load factor.

## 3.2 Bifacial Model ✅ IMPLEMENTED

Isotropic rear irradiance model (IEA-PVPS Task 13):
G_eff = GTI + bifaciality × albedo × GHI × (1-cos(tilt))/2
```

### Update `solar-planner-implementation-status.md`

Move gaps to "Implemented" section:

```markdown
## 1. Implemented completely ✅

### 1.6 Panel Catalog (Gap #6)
✅ Seed script with 8+ representative modules from CEC database
✅ Bifacial panels included (Trina TSM-DEG21C, Jinko JKM575N-72HL4-BDV)

### 1.7 Economic Metrics (Gap #1)
✅ CAPEX benchmarks for 10 European countries
✅ Payback period calculation
✅ ROI 25-year projection with degradation

### 1.8 Inverter Efficiency Curve (Gap #3)
✅ PVWatts V5 model implemented
✅ Dynamic efficiency based on load factor

### 1.9 Bifacial Panel Model (Gap #7)
✅ Rear irradiance from albedo
✅ Configurable ground reflectance per project
```

---

## Troubleshooting

### Issue: Open-Meteo doesn't return GHI

**Solution:** Verify API parameter name is `shortwave_radiation`:

```typescript
hourly: 'global_tilted_irradiance,shortwave_radiation,temperature_2m,wind_speed_10m'
```

### Issue: Bifacial panels show no gain

**Checklist:**
1. `bifacialityFactor > 0` in panel model
2. `albedo > 0` in project
3. `ghi > 0` from Open-Meteo
4. `tilt > 0` (horizontal panels have zero rear gain)

### Issue: Payback is negative or Infinity

**Causes:**
- `annualSavingsEur <= 0` → check `price` and `yearlyKwh`
- `installationCost = 0` → ROI calculation divides by zero

**Fix:** Add guards:

```typescript
const paybackYears = (installationCost && annualSavingsEur && annualSavingsEur > 0)
  ? installationCost / annualSavingsEur
  : null;
```

---

## References

- NREL PVWatts V5 Manual: https://pvwatts.nrel.gov/downloads/pvwattsv5.pdf
- IEA-PVPS Bifacial Report: https://iea-pvps.org/key-topics/bifacial-photovoltaic-modules-and-systems/
- Solar Data Atlas CAPEX: https://www.solardataatlas.com/en/data-solar-capex-europe
- CEC Module Database: https://github.com/NREL/SAM/tree/develop/deploy/libraries

---

## Completion Checklist

- [ ] Gap #6: CEC catalog seeded
- [ ] Gap #1: CAPEX + economic metrics working
- [ ] Gap #3: Inverter curve implemented
- [ ] Gap #7: Bifacial model functional
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Committed to repository

---

**Estimated Implementation Time:** 4-6 hours  
**Ready for production deployment:** ✅ Yes (after tests)
