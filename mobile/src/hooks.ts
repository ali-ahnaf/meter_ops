import { useCallback, useEffect, useState } from 'react';
import { sortSessions, type LastUsage, type MeterSession } from '@lib/meter-ops';
import { sortWaterSessions, type WaterSession } from '@lib/water-ops';
import {
  getLastUsage,
  getSessions,
  getWaterLastUsage,
  getWaterSessions,
  KEYS,
  saveSessions,
  saveWaterSessions,
  subscribe,
} from '@/storage';

/** Loads a stored value, and reloads it whenever any screen writes to storage. */
function useStoredValue<T>(key: string, read: () => Promise<T>, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const next = await read();
      if (active) {
        setValue(next);
        setLoaded(true);
      }
    };
    load();
    const unsubscribe = subscribe(key, load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [key, read]);

  return { value, setValue, loaded };
}

const readSortedSessions = async () => sortSessions(await getSessions());
const readSortedWaterSessions = async () => sortWaterSessions(await getWaterSessions());

export function useSessions() {
  const { value, setValue, loaded } = useStoredValue<MeterSession[]>(KEYS.sessions, readSortedSessions, []);

  const save = useCallback(
    async (next: MeterSession[]) => {
      const sorted = sortSessions(next);
      setValue(sorted);
      await saveSessions(sorted);
    },
    [setValue],
  );

  return { sessions: value, loaded, save };
}

export function useWaterSessions() {
  const { value, setValue, loaded } = useStoredValue<WaterSession[]>(KEYS.waterSessions, readSortedWaterSessions, []);

  const save = useCallback(
    async (next: WaterSession[]) => {
      const sorted = sortWaterSessions(next);
      setValue(sorted);
      await saveWaterSessions(sorted);
    },
    [setValue],
  );

  return { sessions: value, loaded, save };
}

export function useLastUsage() {
  return useStoredValue<LastUsage | null>(KEYS.lastUsage, getLastUsage, null).value;
}

export function useWaterLastUsage() {
  return useStoredValue<LastUsage | null>(KEYS.waterLastUsage, getWaterLastUsage, null).value;
}
