export const sceneryStallTimeoutMs = 8000;

type SceneryWatch = { position: number; lastProgressAt: number };

export function startSceneryWatch(now: number, position: number): SceneryWatch {
  return { position, lastProgressAt: now };
}

export function observeScenery(watch: SceneryWatch, { now, position, playing, timeoutMs = sceneryStallTimeoutMs }: {
  now: number;
  position: number;
  playing: boolean;
  timeoutMs?: number;
}): { watch: SceneryWatch; status: 'advanced' | 'pending' | 'stalled' } {
  if (playing && position !== watch.position) {
    return { watch: startSceneryWatch(now, position), status: 'advanced' };
  }
  return { watch, status: now - watch.lastProgressAt >= timeoutMs ? 'stalled' : 'pending' };
}
