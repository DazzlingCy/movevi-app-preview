import { exerciseDay } from './dailyExercise';

export const COINS_PER_YUAN = 10_000;
const COINS_PER_CENT = COINS_PER_YUAN / 100;
export const MILEAGE_REWARDS = [{ goal: 1, coins: 120 }, { goal: 2, coins: 100 }, { goal: 3, coins: 80 }] as const;
export const ROUTE_REWARDS = [{ goal: 1, coins: 120 }, { goal: 2, coins: 100 }, { goal: 3, coins: 80 }] as const;
export const DAILY_COIN_CAP = [...MILEAGE_REWARDS, ...ROUTE_REWARDS].reduce((total, tier) => total + tier.coins, 0);
export const WITHDRAWAL_TIERS = [1, 3, 5] as const;
export type WithdrawalTier = typeof WITHDRAWAL_TIERS[number];
export type CoinTrack = 'mileage' | 'route';
export const STARTER_COIN_REWARDS = { mileage: MILEAGE_REWARDS[0], route: ROUTE_REWARDS[0] } as const;

export interface CoinExerciseEvidence {
  meters: number;
  activeSeconds: number;
  endedAt: number;
  source?: 'playback';
}

export interface CoinWorkout extends CoinExerciseEvidence {
  id: string;
  cityId: string;
  routeId: string;
  routeName: string;
  plannedMeters: number;
}

export interface CoinReward {
  mileage: number;
  route: number;
}

type ExerciseEntry = {
  kind: 'exercise'; id: string; at: number; routeKey: string; routeName: string;
  meters: number; completed: boolean; reward: CoinReward;
};
type BalanceEntry = { kind: 'withdrawal' | 'demo-credit'; id: string; at: number; coins: number };
type StarterClaimEntry = { kind: 'starter-claim'; id: string; at: number; track: CoinTrack; coins: number };
export type CoinEntry = ExerciseEntry | BalanceEntry | StarterClaimEntry;
export type CoinLedger = CoinEntry[];

export const formatCoinValue = (coins: number) => `¥${(coins / COINS_PER_YUAN).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
export const coinBalance = (ledger: CoinLedger) => ledger.reduce((balance, entry) => balance + (
  entry.kind === 'exercise' ? entry.reward.mileage + entry.reward.route : entry.kind === 'withdrawal' ? -entry.coins : entry.coins
), 0);

export function coinDayProgress(ledger: CoinLedger, at: number) {
  const day = exerciseDay(at);
  const routes = new Set<string>();
  let meters = 0;
  let earned = 0;
  for (const entry of ledger) {
    if (entry.kind !== 'exercise' && entry.kind !== 'starter-claim') continue;
    if (exerciseDay(entry.at) !== day) continue;
    if (entry.kind === 'starter-claim') {
      earned += entry.coins;
      continue;
    }
    meters += entry.meters;
    earned += entry.reward.mileage + entry.reward.route;
    if (entry.completed) routes.add(entry.routeKey);
  }
  return { meters, routes, earned };
}

function starterClaimId(track: CoinTrack, at: number) {
  return `starter-claim:${exerciseDay(at)}:${track}`;
}

function hasStarterClaim(ledger: CoinLedger, track: CoinTrack, at: number) {
  const id = starterClaimId(track, at);
  return ledger.some(entry => entry.kind === 'starter-claim' && entry.id === id);
}

export function recordStarterClaim(ledger: CoinLedger, track: CoinTrack, at: number): CoinLedger {
  if (!validTimestamp(at) || hasStarterClaim(ledger, track, at)) return ledger;
  const progress = coinDayProgress(ledger, at);
  const goal = STARTER_COIN_REWARDS[track].goal;
  const reached = track === 'mileage' ? progress.meters >= goal * 1000 : progress.routes.size >= goal;
  if (reached) return ledger;
  return [...ledger, { kind: 'starter-claim', id: starterClaimId(track, at), at, track, coins: STARTER_COIN_REWARDS[track].coins }];
}

function validTimestamp(value: number) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 8.64e15;
}

export function isCoinRouteComplete(workout: Pick<CoinWorkout, 'meters' | 'plannedMeters' | 'activeSeconds'>) {
  return workout.plannedMeters > 0 && workout.meters >= workout.plannedMeters * 0.9 && workout.activeSeconds >= 15 * 60;
}

export function settleCoinWorkout(ledger: CoinLedger, workout: CoinWorkout): ExerciseEntry | null {
  if (!workout.id || !workout.routeId || !workout.cityId || ledger.some(entry => entry.id === workout.id)) return null;
  const { meters, activeSeconds, endedAt } = workout;
  if (!Number.isSafeInteger(meters) || meters <= 0 || !Number.isSafeInteger(activeSeconds) || activeSeconds <= 0 || !validTimestamp(endedAt)) return null;

  const before = coinDayProgress(ledger, endedAt);
  const routeKey = `${workout.cityId}:${workout.routeId}`;
  const completed = isCoinRouteComplete(workout);
  const routeTier = ROUTE_REWARDS[before.routes.size];
  const routeAlreadyPaid = routeTier === STARTER_COIN_REWARDS.route && hasStarterClaim(ledger, 'route', endedAt);
  const route = completed && !before.routes.has(routeKey) && !routeAlreadyPaid ? routeTier?.coins ?? 0 : 0;
  const mileage = MILEAGE_REWARDS.reduce((coins, tier) => {
    if (tier === STARTER_COIN_REWARDS.mileage && hasStarterClaim(ledger, 'mileage', endedAt)) return coins;
    const goal = tier.goal * 1000;
    return before.meters < goal && before.meters + meters >= goal ? coins + tier.coins : coins;
  }, 0);
  return { kind: 'exercise', id: workout.id, at: endedAt, routeKey, routeName: workout.routeName, meters, completed, reward: { mileage, route } };
}

export function coinWorkoutProgress(ledger: CoinLedger, workout: CoinWorkout) {
  const { meters, routes, earned } = coinDayProgress(ledger, workout.endedAt);
  const mileageGoals = MILEAGE_REWARDS.filter(tier => meters < tier.goal * 1000
    && (tier.goal !== 1 || !hasStarterClaim(ledger, 'mileage', workout.endedAt)));
  const totalMeters = meters + workout.meters;
  const nextMileageIndex = mileageGoals.findIndex(tier => totalMeters < tier.goal * 1000);
  const previousMileage = (mileageGoals[nextMileageIndex - 1]?.goal ?? 0) * 1000;
  const mileage = nextMileageIndex < 0 ? Number(mileageGoals.length > 0)
    : (totalMeters - previousMileage) / (mileageGoals[nextMileageIndex].goal * 1000 - previousMileage);
  const routeTier = ROUTE_REWARDS[routes.size];
  const route = routeTier && workout.plannedMeters > 0 && !routes.has(`${workout.cityId}:${workout.routeId}`)
    && (routeTier.goal !== 1 || !hasStarterClaim(ledger, 'route', workout.endedAt))
    ? Math.min(workout.meters / (workout.plannedMeters * .9), workout.activeSeconds / 900)
    : 0;
  const reward = settleCoinWorkout(ledger, workout)?.reward;
  return {
    fraction: earned >= DAILY_COIN_CAP ? 1 : Math.min(1, Math.max(mileage, route)),
    coins: reward ? reward.mileage + reward.route : 0,
  };
}

export function coinMileageCounter(meters: number) {
  let coins = 0;
  let previousMeters = 0;
  for (const tier of MILEAGE_REWARDS) {
    const goalMeters = tier.goal * 1000;
    const fraction = Math.max(0, Math.min(1, (meters - previousMeters) / (goalMeters - previousMeters)));
    coins += Math.floor(fraction * tier.coins);
    if (meters <= goalMeters) return { coins, fraction };
    previousMeters = goalMeters;
  }
  return { coins, fraction: 1 };
}

function isWithdrawalCoinAmount(coins: number) {
  return Number.isSafeInteger(coins) && coins > 0 && coins % COINS_PER_CENT === 0;
}

export function parseWithdrawalCoins(amount: string | number): number | null {
  const value = String(amount).trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value)) return null;
  const [yuan, fraction = ''] = value.split('.');
  const coins = Number(yuan) * COINS_PER_YUAN + Number(fraction.padEnd(2, '0')) * COINS_PER_CENT;
  return isWithdrawalCoinAmount(coins) ? coins : null;
}

export function recordCoinWithdrawal(ledger: CoinLedger, amount: string | number, id: string, at: number): CoinLedger {
  const coins = parseWithdrawalCoins(amount);
  if (coins === null || !id || !validTimestamp(at) || coinBalance(ledger) < coins || ledger.some(entry => entry.id === id)) return ledger;
  return [...ledger, { kind: 'withdrawal', id, at, coins }];
}

export function readCoinLedger(raw: string | null): CoinLedger {
  try {
    const data: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(data)) return [];
    const ids = new Set<string>();
    return data.filter((entry): entry is CoinEntry => {
      if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) || !validTimestamp(entry.at)) return false;
      const valid = entry.kind === 'exercise'
        ? typeof entry.routeKey === 'string' && typeof entry.routeName === 'string' && typeof entry.completed === 'boolean'
          && Number.isSafeInteger(entry.meters) && entry.meters > 0 && Number.isSafeInteger(entry.reward?.mileage)
          && entry.reward.mileage >= 0 && entry.reward.mileage <= 380 && [0, 80, 100, 120].includes(entry.reward.route)
        : entry.kind === 'starter-claim'
          ? (entry.track === 'mileage' || entry.track === 'route')
            && entry.id === starterClaimId(entry.track, entry.at) && entry.coins === STARTER_COIN_REWARDS[entry.track as CoinTrack].coins
        : entry.kind === 'demo-credit' ? entry.id === 'demo-credit' && entry.coins === COINS_PER_YUAN
          : entry.kind === 'withdrawal' && isWithdrawalCoinAmount(entry.coins);
      if (valid) ids.add(entry.id);
      return valid;
    });
  } catch { return []; }
}
