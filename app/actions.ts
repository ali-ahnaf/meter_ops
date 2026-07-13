'use server';

import fs from 'fs/promises';
import path from 'path';

function getDbPath(fileName = 'db.json') {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), fileName);
  }
  return `/var/www/meter-ops/${fileName}`;
}

async function readDb(fileName: string) {
  try {
    const data = await fs.readFile(getDbPath(fileName), 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error(`Failed to read ${fileName}:`, error);
    return [];
  }
}

async function readObj(fileName: string) {
  try {
    const data = await fs.readFile(getDbPath(fileName), 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.error(`Failed to read ${fileName}:`, error);
    return null;
  }
}

async function writeDb(fileName: string, sessions: any) {
  try {
    const dbPath = getDbPath(fileName);
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(sessions, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error(`Failed to write ${fileName}:`, error);
    return { success: false };
  }
}

export async function getSessionsAction() {
  return readDb('db.json');
}

export async function saveSessionsAction(sessions: any) {
  return writeDb('db.json', sessions);
}

export async function getWaterSessionsAction() {
  return readDb('water-db.json');
}

export async function saveWaterSessionsAction(sessions: any) {
  return writeDb('water-db.json', sessions);
}

export async function getLastUsageAction() {
  return readObj('last-usage.json');
}

export async function saveLastUsageAction(usage: any) {
  return writeDb('last-usage.json', usage);
}

export async function getWaterLastUsageAction() {
  return readObj('water-last-usage.json');
}

export async function saveWaterLastUsageAction(usage: any) {
  return writeDb('water-last-usage.json', usage);
}
