import type { CoinExerciseEvidence } from './coinRewards';

export const CITY_RELAY_STORAGE = 'movevi-city-relay-preview-v1';
export const CITY_RELAY_NAME = '双人搭子跑';
export const CITY_RELAY_TEAM_SIZE = 2;
export const CITY_RELAY_COINS = { personal: 120, team: 180 } as const;
export const CITY_RELAY_PARTNER = { name: '阿禾', delay: 22_000 };
export type CityRelayReward = keyof typeof CITY_RELAY_COINS;

export interface CityRelayRoute {
  id: string;
  name: string;
  image?: string;
}

export interface CityRelayAttempt {
  id: string;
  teamSize: 2 | 4;
  joinedAt: number;
  finishedAt?: number;
  route?: CityRelayRoute;
}

export function createCityRelayAttempt(id: string, joinedAt: number): CityRelayAttempt {
  return { id, joinedAt, teamSize: CITY_RELAY_TEAM_SIZE };
}

export function finishCityRelayAttempt(attempt: CityRelayAttempt, route: CityRelayRoute, at: number): CityRelayAttempt {
  if (attempt.finishedAt !== undefined || !route.id || !route.name || !Number.isFinite(at) || at <= attempt.joinedAt) return attempt;
  return { ...attempt, finishedAt: at, route };
}

export function isCityRelayRunComplete(evidence: CoinExerciseEvidence | undefined, plannedMinutes: number, plannedKm: number, previewWorkout: boolean) {
  return !!evidence && Number.isFinite(plannedMinutes) && plannedMinutes > 0
    && Number.isFinite(evidence.activeSeconds) && evidence.activeSeconds >= plannedMinutes * 60
    && (evidence.source === 'playback' || previewWorkout && plannedKm > 0 && evidence.meters >= Math.round(plannedKm * 1000));
}

export function cityRelayCompleted(attempt: CityRelayAttempt, now: number) {
  const mine = attempt.finishedAt !== undefined && attempt.finishedAt <= now;
  const delays = attempt.teamSize === 4 ? [6000, 22_000, 36_000] : [CITY_RELAY_PARTNER.delay];
  return delays.filter(delay => attempt.joinedAt + delay <= now).length + Number(mine);
}

export const cityRelayRewardId = (teamId: string, reward: CityRelayReward) => `city-relay:${teamId}:${reward}`;

export function availableCityRelayRewards(attempt: CityRelayAttempt, now: number, claimed: ReadonlySet<string>): CityRelayReward[] {
  if (!attempt.route || attempt.finishedAt === undefined || attempt.finishedAt > now) return [];
  const target = attempt.teamSize === 4 ? 3 : CITY_RELAY_TEAM_SIZE;
  const rewards: CityRelayReward[] = cityRelayCompleted(attempt, now) >= target ? ['personal', 'team'] : ['personal'];
  return rewards.filter(reward => !claimed.has(cityRelayRewardId(attempt.id, reward)));
}

export function isCityRelayId(value: unknown): value is string {
  return typeof value === 'string' && /^(?:\d{4}-\d{2}-\d{2}|[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/i.test(value);
}

export function readCityRelayAttempts(value: string | null): CityRelayAttempt[] {
  try {
    const data: unknown = JSON.parse(value ?? '[]');
    if (!Array.isArray(data)) return [];
    const attempts: CityRelayAttempt[] = [];
    const seen = new Set<string>();
    for (const entry of data) {
      if (!entry || !Number.isSafeInteger(entry.joinedAt) || entry.joinedAt <= 0) continue;
      const id = entry.id ?? entry.periodId;
      const teamSize = entry.id === undefined ? 4 : entry.teamSize;
      if (!isCityRelayId(id) || seen.has(id) || (teamSize !== 2 && teamSize !== 4)) continue;
      const { joinedAt, finishedAt } = entry;
      if (!Number.isSafeInteger(finishedAt) || finishedAt <= joinedAt) continue;
      const route = entry.route ?? { id: entry.routeId, name: entry.routeName };
      if (typeof route.id !== 'string' || !route.id || typeof route.name !== 'string' || !route.name) continue;
      const image = typeof route.image === 'string' ? route.image : undefined;
      attempts.push({ id, teamSize, joinedAt, finishedAt, route: { id: route.id, name: route.name, ...(image && { image }) } });
      seen.add(id);
    }
    return attempts;
  } catch { return []; }
}
