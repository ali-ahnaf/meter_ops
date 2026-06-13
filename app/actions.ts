'use server';

import fs from 'fs/promises';
import path from 'path';

function getDbPath() {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'db.json');
  }
  return '/var/www/meter-ops/db.json';
}

export async function getSessionsAction() {
  try {
    const dbPath = getDbPath();
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('Failed to read db.json:', error);
    return [];
  }
}

export async function saveSessionsAction(sessions: any) {
  try {
    const dbPath = getDbPath();
    const dir = path.dirname(dbPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(sessions, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to write db.json:', error);
    return { success: false };
  }
}
