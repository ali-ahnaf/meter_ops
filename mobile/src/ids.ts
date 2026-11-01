import { randomUUID } from 'expo-crypto';

/** Hermes has no global `crypto.randomUUID`, so all ids come from expo-crypto. */
export const createId = () => randomUUID();
