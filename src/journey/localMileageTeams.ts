import type { MileageCommand, MileageSnapshot } from './mileageTeams';
import {
  applyMileageCommand,
  emptyMileageDatabase,
  mileageSnapshot,
  type MileageDatabase,
} from '../server/mileageTeamsStore';

const stateKey = 'movevi-mileage-preview-state-v1';
const userKey = 'movevi-mileage-preview-user-v1';

type LocalStorage = Pick<Storage, 'getItem' | 'setItem'>;

function readDatabase(storage?: LocalStorage): MileageDatabase {
  try {
    const parsed = JSON.parse(storage?.getItem(stateKey) ?? 'null');
    if (Array.isArray(parsed?.teams) && parsed?.workouts && typeof parsed.workouts === 'object') return parsed;
  } catch { /* Start a fresh preview when local data is unavailable or damaged. */ }
  return emptyMileageDatabase();
}

function readUser(storage?: LocalStorage) {
  try {
    const stored = storage?.getItem(userKey);
    if (stored?.startsWith('local-')) return stored;
  } catch { /* Fall through to an in-memory preview identity. */ }
  const user = `local-${globalThis.crypto.randomUUID()}`;
  try { storage?.setItem(userKey, user); } catch { /* The current tab can still use the preview. */ }
  return user;
}

export function createLocalMileageService(storage?: LocalStorage) {
  let data = readDatabase(storage);
  const user = readUser(storage);

  const request = (command?: MileageCommand): MileageSnapshot => {
    if (command) {
      const next = JSON.parse(JSON.stringify(data)) as MileageDatabase;
      applyMileageCommand(next, user, command, Date.now());
      data = next;
      try { storage?.setItem(stateKey, JSON.stringify(data)); } catch { /* Keep the current tab interactive. */ }
    }
    return mileageSnapshot(data, user);
  };

  return { request };
}
