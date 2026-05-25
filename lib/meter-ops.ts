export type MeterReading = {
  id: string;
  ownerName: string;
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

export const STORAGE_KEY = 'meter_ops_sessions_v2';

export type OcrRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const OCR_REGION: OcrRegion = {
  x: 0.18,
  y: 0.34,
  width: 0.64,
  height: 0.24,
};

export function sortSessions(sessions: MeterSession[]) {
  return [...sessions].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
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

export function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatReading(reading: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(reading);
}
