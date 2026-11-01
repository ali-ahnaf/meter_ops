import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LastUsage, MeterSession } from '@lib/meter-ops';
import type { WaterSession } from '@lib/water-ops';

export const KEYS = {
  sessions: 'meterops:sessions',
  waterSessions: 'meterops:waterSessions',
  lastUsage: 'meterops:lastUsage',
  waterLastUsage: 'meterops:waterLastUsage',
} as const;

export type StoredData = {
  sessions: MeterSession[];
  waterSessions: WaterSession[];
  lastUsage: LastUsage | null;
  waterLastUsage: LastUsage | null;
};

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

/** Notifies hooks on other screens that the value stored under `key` changed. */
export function subscribe(key: string, listener: Listener) {
  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    set.delete(listener);
  };
}

function notify(keys: string[]) {
  keys.forEach((key) => listeners.get(key)?.forEach((listener) => listener()));
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error(`Failed to read ${key}:`, error);
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.multiSet([[key, JSON.stringify(value)]]);
  notify([key]);
}

async function readList<T>(key: string): Promise<T[]> {
  const value = await readJson<unknown>(key, []);
  return Array.isArray(value) ? (value as T[]) : [];
}

export const getSessions = () => readList<MeterSession>(KEYS.sessions);
export const saveSessions = (sessions: MeterSession[]) => writeJson(KEYS.sessions, sessions);

export const getWaterSessions = () => readList<WaterSession>(KEYS.waterSessions);
export const saveWaterSessions = (sessions: WaterSession[]) => writeJson(KEYS.waterSessions, sessions);

export const getLastUsage = () => readJson<LastUsage | null>(KEYS.lastUsage, null);
export const saveLastUsage = (usage: LastUsage) => writeJson(KEYS.lastUsage, usage);

export const getWaterLastUsage = () => readJson<LastUsage | null>(KEYS.waterLastUsage, null);
export const saveWaterLastUsage = (usage: LastUsage) => writeJson(KEYS.waterLastUsage, usage);

export async function readAll(): Promise<StoredData> {
  const [sessions, waterSessions, lastUsage, waterLastUsage] = await Promise.all([
    getSessions(),
    getWaterSessions(),
    getLastUsage(),
    getWaterLastUsage(),
  ]);
  return { sessions, waterSessions, lastUsage, waterLastUsage };
}

/** Writes the given datasets in one multiSet. `null` last-usage removes the key. Omitted keys are untouched. */
export async function writeAll(data: Partial<StoredData>) {
  const sets: [string, string][] = [];
  const removes: string[] = [];

  if (data.sessions) sets.push([KEYS.sessions, JSON.stringify(data.sessions)]);
  if (data.waterSessions) sets.push([KEYS.waterSessions, JSON.stringify(data.waterSessions)]);
  if (data.lastUsage !== undefined) {
    if (data.lastUsage) sets.push([KEYS.lastUsage, JSON.stringify(data.lastUsage)]);
    else removes.push(KEYS.lastUsage);
  }
  if (data.waterLastUsage !== undefined) {
    if (data.waterLastUsage) sets.push([KEYS.waterLastUsage, JSON.stringify(data.waterLastUsage)]);
    else removes.push(KEYS.waterLastUsage);
  }

  if (sets.length) await AsyncStorage.multiSet(sets);
  if (removes.length) await AsyncStorage.multiRemove(removes);
  notify([...sets.map(([key]) => key), ...removes]);
}
