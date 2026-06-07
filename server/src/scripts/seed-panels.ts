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