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

export type ExtractedReading = {
  value: number;
  normalizedText: string;
  score: number;
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
    .replace(/[OoDQ]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[B]/g, '8')
    .replace(/[Z]/g, '2')
    .replace(/[;,]/g, '.')
    .replace(/[•·]/g, ':')
    .replace(/[^\d.:\s\r\n]+/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/ *\n+ */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeReadingInput(value: string) {
  const normalized = value.replace(/[:,;]/g, '.').replace(/[^\d.]+/g, '');
  const decimalIndex = normalized.indexOf('.');

  if (decimalIndex === -1) {
    return normalized;
  }

  return `${normalized.slice(0, decimalIndex + 1)}${normalized
    .slice(decimalIndex + 1)
    .replace(/\./g, '')}`;
}

export function extractReadingCandidate(text: string): ExtractedReading | null {
  const cleanedText = cleanOcrText(text);

  if (!cleanedText) {
    return null;
  }

  const candidates: ExtractedReading[] = [];
  const explicitMatches = cleanedText.match(/\d+(?:[.:]\d+)+/g) ?? [];
  const spacedMatches = cleanedText.match(/(?:\d+\s+)+\d+/g) ?? [];
  const integerMatches = cleanedText.match(/\d+/g) ?? [];

  for (const match of explicitMatches) {
    const normalizedText = normalizeExplicitReading(match);
    const value = normalizedText ? Number(normalizedText) : Number.NaN;

    if (normalizedText && Number.isFinite(value)) {
      candidates.push({
        value,
        normalizedText,
        score: 300 + countDigits(normalizedText),
      });
    }
  }

  for (const match of spacedMatches) {
    const normalizedText = normalizeSpacedReading(match);
    const value = normalizedText ? Number(normalizedText) : Number.NaN;

    if (normalizedText && Number.isFinite(value)) {
      candidates.push({
        value,
        normalizedText,
        score: 220 + countDigits(normalizedText),
      });
    }
  }

  for (const match of integerMatches) {
    const normalizedText = sanitizeReadingInput(match);
    const value = normalizedText ? Number(normalizedText) : Number.NaN;

    if (normalizedText && Number.isFinite(value)) {
      candidates.push({
        value,
        normalizedText,
        score: 100 + countDigits(normalizedText),
      });
    }
  }

  if (!candidates.length) {
    return null;
  }

  return candidates.sort((left, right) => {
    if (right.score === left.score) {
      return right.value - left.value;
    }

    return right.score - left.score;
  })[0];
}

export function extractReadingValue(text: string) {
  return extractReadingCandidate(text)?.value ?? null;
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

function normalizeExplicitReading(value: string) {
  const groups = value
    .replace(/[:]/g, '.')
    .split('.')
    .filter(Boolean);

  if (!groups.length) {
    return null;
  }

  if (groups.length >= 2 && groups.at(-1)?.length && groups.at(-1)!.length <= 2) {
    return sanitizeReadingInput(`${groups.slice(0, -1).join('')}.${groups.at(-1)}`);
  }

  return sanitizeReadingInput(groups.join('.'));
}

function normalizeSpacedReading(value: string) {
  const groups = value.split(/\s+/).filter(Boolean);

  if (groups.length < 2 || !groups.every((group) => /^\d+$/.test(group))) {
    return null;
  }

  const decimalPart = groups.at(-1) ?? '';

  if (decimalPart.length > 2) {
    return sanitizeReadingInput(groups.join(''));
  }

  return sanitizeReadingInput(`${groups.slice(0, -1).join('')}.${decimalPart}`);
}

function countDigits(value: string) {
  return (value.match(/\d/g) ?? []).length;
}
