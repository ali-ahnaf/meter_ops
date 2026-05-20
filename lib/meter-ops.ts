export type MeterReading = {
  id: string;
  flatNumber: string;
  reading: number;
  ocrText: string;
  capturedAt: string;
  imageName?: string;
};

export type MeterSession = {
  id: string;
  createdAt: string;
  readings: MeterReading[];
};

export type ConsumptionRow = {
  flatNumber: string;
  startReading: number;
  endReading: number;
  consumption: number;
  bill: number;
  status: 'ok' | 'reset';
};

export type ConsumptionReport = {
  from: MeterSession;
  to: MeterSession;
  rows: ConsumptionRow[];
  totalConsumption: number;
  totalBill: number;
};

export type ImmediateConsumptionPoint = {
  id: string;
  label: string;
  fromSessionId: string;
  toSessionId: string;
  totalsByFlat: Record<string, number>;
};

export const DEFAULT_TARIFF = 12.5;
export const STORAGE_KEY = 'meter_ops_sessions_v1';

export const seedSessions: MeterSession[] = [
  {
    id: 'session-2026-04-04',
    createdAt: '2026-04-04T19:10:00.000Z',
    readings: [
      reading('A-01', 10234, 'A-01 | 10234'),
      reading('A-02', 9411, 'A-02 | 9411'),
      reading('B-03', 11290, 'B-03 | 11290'),
    ],
  },
  {
    id: 'session-2026-04-12',
    createdAt: '2026-04-12T19:40:00.000Z',
    readings: [
      reading('A-01', 10398, 'A-01 | 10398'),
      reading('A-02', 9568, 'A-02 | 9568'),
      reading('B-03', 11472, 'B-03 | 11472'),
    ],
  },
  {
    id: 'session-2026-04-21',
    createdAt: '2026-04-21T20:15:00.000Z',
    readings: [
      reading('A-01', 10541, 'A-01 | 10541'),
      reading('A-02', 9710, 'A-02 | 9710'),
      reading('B-03', 11605, 'B-03 | 11605'),
    ],
  },
  {
    id: 'session-2026-05-03',
    createdAt: '2026-05-03T18:55:00.000Z',
    readings: [
      reading('A-01', 10726, 'A-01 | 10726'),
      reading('A-02', 9894, 'A-02 | 9894'),
      reading('B-03', 11844, 'B-03 | 11844'),
    ],
  },
];

function reading(flatNumber: string, value: number, ocrText: string): MeterReading {
  return {
    id: `reading-${flatNumber}-${value}`,
    flatNumber,
    reading: value,
    ocrText,
    capturedAt: new Date().toISOString(),
    imageName: `${flatNumber.toLowerCase()}-${value}.jpg`,
  };
}

export function sortSessions(sessions: MeterSession[]) {
  return [...sessions].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatChartDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function cleanOcrText(text: string) {
  return text
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractReadingValue(text: string) {
  const matches = text.match(/\d+(?:\.\d+)?/g);

  if (!matches?.length) {
    return null;
  }

  const [candidate] = [...matches].sort((left, right) => {
    if (right.length === left.length) {
      return Number(right) - Number(left);
    }

    return right.length - left.length;
  });

  const value = Number(candidate);
  return Number.isFinite(value) ? value : null;
}

export function buildConsumptionReport(
  sessions: MeterSession[],
  firstSessionId: string,
  secondSessionId: string,
  tariff: number,
): ConsumptionReport | null {
  const selected = sessions.filter(
    (session) => session.id === firstSessionId || session.id === secondSessionId,
  );

  if (selected.length !== 2) {
    return null;
  }

  const [from, to] = [...selected].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  const startReadings = new Map(
    from.readings.map((reading) => [reading.flatNumber, reading.reading]),
  );
  const endReadings = new Map(
    to.readings.map((reading) => [reading.flatNumber, reading.reading]),
  );

  const flats = [...new Set([...startReadings.keys(), ...endReadings.keys()])].sort();
  const rows = flats
    .map((flatNumber) => {
      const startReading = startReadings.get(flatNumber);
      const endReading = endReadings.get(flatNumber);

      if (startReading === undefined || endReading === undefined) {
        return null;
      }

      const consumption = endReading - startReading;

      return {
        flatNumber,
        startReading,
        endReading,
        consumption,
        bill: Math.max(consumption, 0) * tariff,
        status: consumption >= 0 ? 'ok' : 'reset',
      } satisfies ConsumptionRow;
    })
    .filter((row): row is ConsumptionRow => Boolean(row));

  return {
    from,
    to,
    rows,
    totalConsumption: rows.reduce(
      (total, row) => total + Math.max(row.consumption, 0),
      0,
    ),
    totalBill: rows.reduce((total, row) => total + row.bill, 0),
  };
}

export function buildImmediateConsumptionSeries(sessions: MeterSession[]) {
  const ordered = [...sessions].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  return ordered.slice(1).map((session, index) => {
    const previous = ordered[index];
    const previousReadings = new Map(
      previous.readings.map((reading) => [reading.flatNumber, reading.reading]),
    );
    const totalsByFlat = session.readings.reduce<Record<string, number>>(
      (carry, reading) => {
        const start = previousReadings.get(reading.flatNumber);

        if (start !== undefined) {
          carry[reading.flatNumber] = Math.max(reading.reading - start, 0);
        }

        return carry;
      },
      {},
    );

    return {
      id: `${previous.id}-${session.id}`,
      label: `${formatChartDate(previous.createdAt)} -> ${formatChartDate(session.createdAt)}`,
      fromSessionId: previous.id,
      toSessionId: session.id,
      totalsByFlat,
    } satisfies ImmediateConsumptionPoint;
  });
}

export function getUniqueFlats(sessions: MeterSession[]) {
  return [...new Set(sessions.flatMap((session) => session.readings.map((reading) => reading.flatNumber)))].sort();
}
