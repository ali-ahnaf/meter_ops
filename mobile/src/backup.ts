import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { LastUsage, MeterSession } from '@lib/meter-ops';
import type { WaterSession } from '@lib/water-ops';
import { readAll, writeAll, type StoredData } from '@/storage';

export type MeterOpsBackup = {
  app: 'meter-ops';
  version: 1;
  exportedAt: string;
  sessions: MeterSession[];
  waterSessions: WaterSession[];
  lastUsage: LastUsage | null;
  waterLastUsage: LastUsage | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isIsoDate = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

function isReading(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.ownerName === 'string' &&
    typeof value.reading === 'number' &&
    Number.isFinite(value.reading) &&
    isIsoDate(value.capturedAt)
  );
}

const isMeterSession = (value: unknown): value is MeterSession =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  isIsoDate(value.createdAt) &&
  Array.isArray(value.readings) &&
  value.readings.every(isReading);

const isWaterSession = (value: unknown): value is WaterSession =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  isIsoDate(value.createdAt) &&
  typeof value.amount === 'number' &&
  Number.isFinite(value.amount) &&
  !('readings' in value);

const isLastUsage = (value: unknown): value is LastUsage =>
  isRecord(value) &&
  typeof value.amount === 'number' &&
  Number.isFinite(value.amount) &&
  isIsoDate(value.calculatedAt);

function requireList<T>(value: unknown, label: string, guard: (item: unknown) => item is T): T[] {
  if (!Array.isArray(value) || !value.every(guard)) {
    throw new Error(`The ${label} in this file are not in the expected format.`);
  }
  return value;
}

function requireLastUsage(value: unknown, label: string): LastUsage | null {
  if (value === null || value === undefined) return null;
  if (!isLastUsage(value)) {
    throw new Error(`The ${label} in this file is not in the expected format.`);
  }
  return value;
}

/**
 * Accepts a MeterOpsBackup, or a bare web `db.json` (MeterSession[]) /
 * `water-db.json` (WaterSession[]). Returns only the datasets the file holds.
 */
export function parseBackup(text: string): Partial<StoredData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new Error('This file has no sessions in it.');
    }
    if (parsed.every((item) => isRecord(item) && 'readings' in item)) {
      return { sessions: requireList(parsed, 'meter sessions', isMeterSession) };
    }
    return { waterSessions: requireList(parsed, 'water sessions', isWaterSession) };
  }

  if (isRecord(parsed) && parsed.app === 'meter-ops' && parsed.version === 1) {
    return {
      sessions: requireList(parsed.sessions, 'meter sessions', isMeterSession),
      waterSessions: requireList(parsed.waterSessions, 'water sessions', isWaterSession),
      lastUsage: requireLastUsage(parsed.lastUsage, 'meter last usage'),
      waterLastUsage: requireLastUsage(parsed.waterLastUsage, 'water last usage'),
    };
  }

  throw new Error('This is not a Meter Ops backup or a db.json / water-db.json file.');
}

function backupFileName() {
  return `meter-ops-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function exportBackup(): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  const data = await readAll();
  const backup: MeterOpsBackup = {
    app: 'meter-ops',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };

  const file = new File(Paths.cache, backupFileName());
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup, null, 2));

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save Meter Ops backup',
  });
}

function describe(data: Partial<StoredData>) {
  const parts: string[] = [];
  if (data.sessions) parts.push(`${data.sessions.length} meter session(s)`);
  if (data.waterSessions) parts.push(`${data.waterSessions.length} water entr${data.waterSessions.length === 1 ? 'y' : 'ies'}`);
  return parts.join(' and ');
}

function confirmReplace(data: Partial<StoredData>) {
  const isFullBackup = data.sessions !== undefined && data.waterSessions !== undefined;
  const scope = isFullBackup
    ? 'all data on this phone'
    : data.sessions
      ? 'the meter sessions on this phone (water data is kept)'
      : 'the water entries on this phone (meter data is kept)';

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Replace data?',
      `This file contains ${describe(data)}. Importing replaces ${scope}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Throws on an invalid file, before anything is written. */
export async function importBackup(): Promise<'imported' | 'cancelled'> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return 'cancelled';
  }

  const text = await new File(result.assets[0].uri).text();
  const data = parseBackup(text);

  if (!(await confirmReplace(data))) {
    return 'cancelled';
  }

  await writeAll(data);
  return 'imported';
}
