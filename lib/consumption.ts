import { formatReading, type MeterReading, type MeterSession } from "@/lib/meter-ops";

export const RATE_PER_KWH = 12.5;
export const VAT_RATE = 0.05;
export const TRANSFORMER_LOSS_RATE = 0.15;

/**
 * Lifeline tariff: when total consumption is within this many units, every unit
 * is charged at the lifeline rate instead of the progressive step rates.
 */
export const LIFELINE_LIMIT = 50;
export const LIFELINE_RATE = 4.63;

/**
 * Progressive (marginal) residential tariff steps. Each band charges its rate
 * only for the units that fall between the previous cumulative limit and its own
 * cumulative `limit`. Applies to all meters except the mother meter.
 */
export const TARIFF_SLABS: { limit: number; rate: number }[] = [
  { limit: 75, rate: 5.26 }, // first step: 0–75 units
  { limit: 200, rate: 8.5 }, // second step: 76–200 units
  { limit: 300, rate: 9.1 }, // third step: 201–300 units
  { limit: 400, rate: 9.62 }, // fourth step: 301–400 units
  { limit: 600, rate: 15.01 }, // fifth step: 401–600 units
  { limit: Number.POSITIVE_INFINITY, rate: 17.25 }, // sixth step: 601+ units
];

// old slab
// export const TARIFF_SLABS: { limit: number; rate: number }[] = [
//   { limit: 75, rate: 5.26 }, // first step: 0–75 units
//   { limit: 200, rate: 7.2 }, // second step: 76–200 units
//   { limit: 300, rate: 7.59 }, // third step: 201–300 units
//   { limit: 400, rate: 8.02 }, // fourth step: 301–400 units
//   { limit: 600, rate: 12.67 }, // fifth step: 401–600 units
//   { limit: Number.POSITIVE_INFINITY, rate: 14.61 }, // sixth step: 601+ units
// ];

/**
 * Tariff chart used by {@link calculateCost} for the mother meter's net
 * consumption. Each slab charges its rate only for the units between the
 * previous cumulative limit and its own `limit`; `fixedCharge` is added on top.
 */
export const TARIFF_CHART: {
  slabs: { limit: number; rate: number }[];
  fixedCharge: number;
} = {
  slabs: [
    { limit: 75, rate: 5.26 }, // first step: 0–75 units
    { limit: 200, rate: 7.2 }, // second step: 76–200 units
    { limit: 300, rate: 7.59 }, // third step: 201–300 units
    { limit: 400, rate: 8.02 }, // fourth step: 301–400 units
    { limit: 600, rate: 12.67 }, // fifth step: 401–600 units
    { limit: Number.POSITIVE_INFINITY, rate: 14.61 }, // sixth step: 601+ units
  ],
  fixedCharge: 378,
};

export type ConsumptionRow = {
  ownerName: string;
  oldReading: MeterReading;
  newReading: MeterReading;
  consumption: number;
  cost: number;
  isMotherMeter?: boolean;
  /** Raw reading diff before subtracting normal meter consumptions. Only set for mother meter rows. */
  rawConsumption?: number;
};

export type ConsumptionComparison = {
  olderSession: MeterSession;
  newerSession: MeterSession;
  rows: ConsumptionRow[];
  missingFromOlder: string[];
  missingFromNewer: string[];
};

export function buildConsumptionComparison(firstSession: MeterSession, secondSession: MeterSession): ConsumptionComparison {
  const [olderSession, newerSession] = sortSessionsAscending(firstSession, secondSession);
  const olderReadings = createOwnerIndex(olderSession.readings);
  const newerReadings = createOwnerIndex(newerSession.readings);
  const ownerKeys = new Set([...olderReadings.keys(), ...newerReadings.keys()]);
  const normalRows: ConsumptionRow[] = [];
  let motherRow: ConsumptionRow | null = null;
  const missingFromOlder: string[] = [];
  const missingFromNewer: string[] = [];

  for (const ownerKey of ownerKeys) {
    const olderReading = olderReadings.get(ownerKey);
    const newerReading = newerReadings.get(ownerKey);

    if (!olderReading || !newerReading) {
      const ownerName = olderReading?.ownerName ?? newerReading?.ownerName ?? ownerKey;

      if (!olderReading) {
        missingFromOlder.push(ownerName);
      }

      if (!newerReading) {
        missingFromNewer.push(ownerName);
      }

      continue;
    }

    const rawConsumption = newerReading.reading - olderReading.reading;

    if (newerReading.isMotherMeter || olderReading.isMotherMeter) {
      // Placeholder — net consumption computed after normal meters are summed
      motherRow = {
        ownerName: newerReading.ownerName,
        oldReading: olderReading,
        newReading: newerReading,
        consumption: rawConsumption,
        cost: 0,
        isMotherMeter: true,
        rawConsumption,
      };
    } else {
      const slabCost = calculateSlabCost(rawConsumption);
      const demandCharge = 378;
      const subtotal = slabCost + demandCharge;
      const vat = subtotal * VAT_RATE;

      normalRows.push({
        ownerName: newerReading.ownerName,
        oldReading: olderReading,
        newReading: newerReading,
        consumption: rawConsumption,
        cost: subtotal + vat,
      });
    }
  }

  if (motherRow) {
    const normalTotal = normalRows.reduce((sum, row) => sum + row.consumption, 0);
    const netConsumption = motherRow.rawConsumption! - normalTotal;
    const demandCharge = 1440;
    const subtotal = netConsumption * 12.5 + demandCharge;
    const vat = subtotal * VAT_RATE;

    motherRow.consumption = netConsumption;
    motherRow.cost = subtotal + vat;
  }

  const rows: ConsumptionRow[] = [...normalRows.sort((left, right) => left.ownerName.localeCompare(right.ownerName)), ...(motherRow ? [motherRow] : [])];

  missingFromOlder.sort((left, right) => left.localeCompare(right));
  missingFromNewer.sort((left, right) => left.localeCompare(right));

  return {
    olderSession,
    newerSession,
    rows,
    missingFromOlder,
    missingFromNewer,
  };
}

export function calculateCost(consumption: number) {
  let remaining = consumption;
  let previousLimit = 0;
  let cost = 0;

  for (const slab of TARIFF_CHART.slabs) {
    const band = Math.min(remaining, slab.limit - previousLimit);
    cost += band * slab.rate;
    remaining -= band;
    previousLimit = slab.limit;

    if (remaining <= 0) {
      break;
    }
  }

  return cost + TARIFF_CHART.fixedCharge;
}

/**
 * Energy charge for a normal (non-mother) meter using the progressive slab
 * tariff. If total consumption is within the lifeline limit, the whole amount is
 * billed at the lifeline rate; otherwise each step bills only the units in its
 * band. VAT is not included here — see {@link calculateSlabCost}.
 */
export function calculateSlabEnergyCharge(consumption: number) {
  if (consumption <= 0) {
    return 0;
  }

  if (consumption <= LIFELINE_LIMIT) {
    return consumption * LIFELINE_RATE;
  }

  let remaining = consumption;
  let previousLimit = 0;
  let total = 0;

  for (const slab of TARIFF_SLABS) {
    const band = Math.min(remaining, slab.limit - previousLimit);
    total += band * slab.rate;
    remaining -= band;
    previousLimit = slab.limit;

    if (remaining <= 0) {
      break;
    }
  }

  return total;
}

export function calculateSlabCost(consumption: number) {
  return calculateSlabEnergyCharge(consumption);
}

export function formatCost(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatReadingWithUnit(value: number) {
  return `${formatReading(value)} kWh`;
}

function createOwnerIndex(readings: MeterReading[]) {
  const index = new Map<string, MeterReading>();

  for (const reading of readings) {
    index.set(normalizeOwnerName(reading.ownerName), reading);
  }

  return index;
}

function normalizeOwnerName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function sortSessionsAscending(firstSession: MeterSession, secondSession: MeterSession) {
  return [firstSession, secondSession].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) as [MeterSession, MeterSession];
}
