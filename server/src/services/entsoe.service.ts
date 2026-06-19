/**
 * ENTSO-E Transparency Platform API client
 * Fetches day-ahead electricity market prices (€/MWh).
 * Requires ENTSOE_API_KEY env var (free registration at transparency.entsoe.eu).
 *
 * Docs: https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html
 */

const ENTSOE_BASE = 'https://web-api.tp.entsoe.eu/api';

// EIC bidding-zone domain codes for day-ahead prices
// Source: ENTSO-E Area EIC codes list
const COUNTRY_TO_EIC: Record<string, string> = {
  ES: '10YES-REE------0',  // Spain (REE)
  PT: '10YPT-REN------W',  // Portugal (REN)
  DE: '10Y1001A1001A83F',  // Germany (DE-LU)
  FR: '10YFR-RTE------C',  // France (RTE)
  IT: '10YIT-GRTN-----B',  // Italy (Terna)
  GB: '10YGB----------A',  // Great Britain (National Grid)
  NL: '10YNL----------L',  // Netherlands (TenneT NL)
  BE: '10YBE----------2',  // Belgium (Elia)
  PL: '10YPL-AREA-----S',  // Poland (PSE)
  AT: '10YAT-APG------L',  // Austria (APG)
};

const COUNTRY_CURRENCY: Record<string, string> = {
  ES: 'EUR', PT: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR',
  NL: 'EUR', BE: 'EUR', PL: 'PLN', AT: 'EUR', GB: 'GBP',
};

export interface ElectricityPrice {
  price: number;    // €/kWh (or local currency/kWh)
  currency: string; // ISO 4217 code
}

class EntsoeService {
  /**
   * Fetch yesterday's average day-ahead price for the given country.
   * Returns null if the API key is missing or the country is unsupported.
   * Price is returned in local currency per kWh (converted from €/MWh).
   */
  async fetchElectricityPrice(countryCode: string): Promise<ElectricityPrice | null> {
    const apiKey = process.env.ENTSOE_API_KEY!;

    const eic = COUNTRY_TO_EIC[countryCode.toUpperCase()];
    if (!eic) {
      console.info(`[ENTSO-E] No EIC code for country "${countryCode}", skipping price lookup`);
      return null;
    }

    const currency = COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? 'EUR';

    // Fetch yesterday's full day (prices are known for past days)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const periodStart = this.formatEntsoeDate(yesterday, 0);
    const periodEnd = this.formatEntsoeDate(yesterday, 23);

    const params = new URLSearchParams({
      securityToken: apiKey,
      documentType: 'A44',   // Price document
      in_Domain: eic,
      out_Domain: eic,
      periodStart,
      periodEnd,
    });

    const url = `${ENTSOE_BASE}?${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[ENTSO-E] Request failed:', err);
      return null;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[ENTSO-E] API returned HTTP ${response.status}`);
      return null;
    }

    const xml = await response.text();
    const avgPricePerMwh = this.parseAveragePriceFromXml(xml);

    if (avgPricePerMwh === null) {
      console.warn('[ENTSO-E] Could not parse price data from response');
      return null;
    }

    // Convert from €/MWh to €/kWh
    return { price: avgPricePerMwh / 1000, currency };
  }

  // ENTSOE date format: YYYYMMDDHHmm (UTC)
  private formatEntsoeDate(date: Date, hour: number): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(hour).padStart(2, '0');
    return `${y}${m}${d}${h}00`;
  }

  // Extract all <price.amount> values and return their average
  private parseAveragePriceFromXml(xml: string): number | null {
    const matches = xml.match(/<price\.amount>([\d.]+)<\/price\.amount>/g);
    if (!matches || matches.length === 0) return null;

    const prices = matches.map((m) => {
      const inner = m.replace('<price.amount>', '').replace('</price.amount>', '');
      return parseFloat(inner);
    });

    const valid = prices.filter((p) => !isNaN(p));
    if (valid.length === 0) return null;

    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }
}

export const entsoeService = new EntsoeService();
