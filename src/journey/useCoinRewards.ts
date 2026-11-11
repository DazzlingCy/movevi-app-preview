import { useEffect, useRef, useState } from 'react';
import { exerciseDay } from './dailyExercise';
import { COINS_PER_YUAN, coinBalance, coinDayProgress, coinWorkoutProgress, readCoinLedger, recordCoinWithdrawal, recordStarterClaim, settleCoinWorkout, type CoinLedger, type CoinTrack, type CoinWorkout } from './coinRewards';

declare const __APP_VERSION__: string;

export function useCoinRewards(demo: boolean) {
  // Vite preview serves a production build, including over the local network.
  const localPreview = __APP_VERSION__.startsWith('local-');
  const trackWorkouts = localPreview || demo;
  const key = demo ? 'movevi-coins-demo-v1' : 'movevi-coins-v1';
  const read = () => readCoinLedger(localStorage.getItem(key));
  const [ledger, setLedger] = useState<CoinLedger>(() => {
    if (localPreview) return [];
    try { return read(); } catch { return []; }
  });
  const latest = useRef(ledger);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const refreshDay = () => setNow(Date.now());
    const sync = (event: StorageEvent) => {
      if (localPreview || event.key !== key) return;
      latest.current = readCoinLedger(event.newValue);
      setLedger(latest.current);
      refreshDay();
    };
    const timer = window.setInterval(refreshDay, 15_000);
    window.addEventListener('focus', refreshDay);
    window.addEventListener('storage', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshDay);
      window.removeEventListener('storage', sync);
    };
  }, [key, localPreview]);

  const currentLedger = () => {
    if (localPreview) return latest.current;
    try { return read(); } catch { return latest.current; }
  };
  const update = (apply: (previous: CoinLedger) => CoinLedger) => {
    const previous = currentLedger();
    const next = apply(previous);
    if (next === previous) return false;
    if (!localPreview) {
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { return false; }
    }
    latest.current = next;
    setLedger(next);
    setNow(Date.now());
    return true;
  };

  const day = exerciseDay(now);
  const starterClaims = new Set(ledger.flatMap(entry =>
    entry.kind === 'starter-claim' && exerciseDay(entry.at) === day ? [entry.track] : [],
  ));

  return {
    demo,
    localPreview,
    trackWorkouts,
    ledger,
    balance: coinBalance(ledger),
    today: coinDayProgress(ledger, now),
    starterClaims,
    async claimStarter(track: CoinTrack) {
      const claim = () => update(previous => recordStarterClaim(previous, track, Date.now()));
      return !localPreview && navigator.locks ? navigator.locks.request(key, claim) : claim();
    },
    preview: (workout: CoinWorkout) => trackWorkouts ? settleCoinWorkout(ledger, workout)?.reward : undefined,
    progress: (workout: CoinWorkout) => trackWorkouts ? coinWorkoutProgress(ledger, workout) : undefined,
    record(workout: CoinWorkout): ReturnType<typeof settleCoinWorkout> | undefined {
      if (!trackWorkouts) return;
      let entry: ReturnType<typeof settleCoinWorkout> = null;
      const saved = update(previous => {
        const settled = settleCoinWorkout(previous, workout);
        entry = settled;
        return settled ? [...previous, settled] : previous;
      });
      return saved ? entry ?? undefined : undefined;
    },
    loadDemoBalance() {
      return demo && update(previous => previous.some(entry => entry.id === 'demo-credit') ? previous : [
        ...previous, { kind: 'demo-credit', id: 'demo-credit', at: Date.now(), coins: COINS_PER_YUAN },
      ]);
    },
    withdraw(amount: string | number, id: string) {
      return demo && update(previous => recordCoinWithdrawal(previous, amount, id, Date.now()));
    },
  };
}
