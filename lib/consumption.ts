import { formatReading, type MeterReading, type MeterSession } from '@/lib/meter-ops';

export const RATE_PER_KWH = 10.5;
export const VAT_RATE = 0.05;

export type ConsumptionRow = {
  ownerName: string;
  oldReading: MeterReading;
  newReading: MeterReading;
  consumption: number;
  cost: number;
};

export type ConsumptionComparison = {
  olderSession: MeterSession;
  newerSession: MeterSession;
  rows: ConsumptionRow[];
  missingFromOlder: string[];
  missingFromNewer: string[];
};

export function buildConsumptionComparison(
  firstSession: MeterSession,
  secondSession: MeterSession,
): ConsumptionComparison {
  const [olderSession, newerSession] = sortSessionsAscending(firstSession, secondSession);
  const olderReadings = createOwnerIndex(olderSession.readings);
  const newerReadings = createOwnerIndex(newerSession.readings);
  const ownerKeys = new Set([...olderReadings.keys(), ...newerReadings.keys()]);
  const rows: ConsumptionRow[] = [];
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

    const consumption = newerReading.reading - olderReading.reading;

    rows.push({
      ownerName: newerReading.ownerName,
      oldReading: olderReading,
      newReading: newerReading,
      consumption,
      cost: calculateCost(consumption),
    });
  }

  rows.sort((left, right) => left.ownerName.localeCompare(right.ownerName));
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
  return consumption * RATE_PER_KWH * (1 + VAT_RATE);
}

export function formatCost(value: number) {
  return new Intl.NumberFormat('en-US', {
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
  return [firstSession, secondSession].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  ) as [MeterSession, MeterSession];
}
