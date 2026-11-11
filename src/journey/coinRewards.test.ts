import test from 'node:test';
import assert from 'node:assert/strict';
import { coinBalance, coinDayProgress, coinMileageCounter, coinWorkoutProgress, formatCoinValue, readCoinLedger, recordCoinWithdrawal, recordStarterClaim, settleCoinWorkout, type CoinLedger, type CoinWorkout } from './coinRewards';

const beforeMidnight = Date.parse('2026-11-11T15:59:59Z');
const afterMidnight = beforeMidnight + 1000;
const workout = (id: string, routeId: string, meters: number, extra: Partial<CoinWorkout> = {}): CoinWorkout => ({
  id, routeId, meters, cityId: 'tokyo', routeName: routeId, activeSeconds: 900, endedAt: beforeMidnight, plannedMeters: meters, ...extra,
});

function record(ledger: CoinLedger, session: CoinWorkout) {
  const entry = settleCoinWorkout(ledger, session);
  assert.ok(entry);
  return [...ledger, entry];
}

test('both coin tracks stack and stop at the confirmed daily cap', () => {
  let ledger = record([], workout('1', 'route-a', 1000));
  ledger = record(ledger, workout('2', 'route-b', 2000));
  ledger = record(ledger, workout('3', 'route-c', 2000));
  assert.equal(coinBalance(ledger), 560);
  assert.equal(formatCoinValue(coinBalance(ledger)), '¥0.056');
  ledger = record(ledger, workout('4', 'route-d', 5000));
  assert.equal(coinBalance(ledger), 680);
  assert.equal(formatCoinValue(coinBalance(ledger)), '¥0.068');
  assert.deepEqual(settleCoinWorkout(ledger, workout('5', 'route-e', 5000))?.reward, { mileage: 0, route: 0 });
});

test('partial workouts cross multiple mileage milestones without crediting a route', () => {
  const partial = workout('1', 'route-a', 5000, { plannedMeters: 5500, activeSeconds: 899 });
  assert.deepEqual(settleCoinWorkout([], partial)?.reward, { mileage: 260, route: 0 });
  assert.deepEqual(settleCoinWorkout([], workout('2', 'route-a', 900, { plannedMeters: 1000 }))?.reward, { mileage: 0, route: 80 });
  assert.equal(settleCoinWorkout([], workout('3', 'route-a', 0)), null);
  assert.equal(settleCoinWorkout([], workout('4', 'route-a', 1000, { activeSeconds: 0 })), null);
});

test('live coin feedback follows mileage and route eligibility without recording a payout', () => {
  const shortRun = workout('live', 'route-a', 500, { plannedMeters: 5000, activeSeconds: 150 });
  assert.deepEqual(coinWorkoutProgress([], shortRun), { fraction: 0.5, coins: 0 });
  assert.equal(coinWorkoutProgress([], { ...shortRun, meters: 1000 }).coins, 80);
  assert.equal(coinWorkoutProgress([], { ...shortRun, meters: 4500, activeSeconds: 899 }).coins, 160);
  const fullRun = { ...shortRun, meters: 4500, activeSeconds: 900 };
  assert.equal(coinWorkoutProgress([], fullRun).coins, 240);
  const claimed = recordStarterClaim([], 'mileage', beforeMidnight);
  assert.equal(coinWorkoutProgress(claimed, fullRun).coins, 160);
  const settled = record(claimed, fullRun);
  assert.equal(coinWorkoutProgress(settled, fullRun).coins, 0);
  assert.equal(coinWorkoutProgress(settled, { ...fullRun, id: 'replay', meters: 450 }).coins, 0);
});

test('running counter advances in single coins at 80 per kilometer', () => {
  assert.deepEqual(coinMileageCounter(0), { coins: 0, fraction: 0 });
  assert.equal(coinMileageCounter(12).coins, 0);
  assert.equal(coinMileageCounter(13).coins, 1);
  assert.equal(coinMileageCounter(25).coins, 2);
  assert.equal(coinMileageCounter(999).coins, 79);
  assert.deepEqual(coinMileageCounter(1000), { coins: 80, fraction: 1 });
  assert.deepEqual(coinMileageCounter(1001), { coins: 80, fraction: 0.001 });
  assert.deepEqual(coinMileageCounter(2000), { coins: 160, fraction: 1 });
});

test('duplicates cannot pay twice and replaying a route after Shanghai midnight can earn again', () => {
  const first = workout('1', 'route-a', 1000);
  let ledger = record([], first);
  assert.equal(settleCoinWorkout(ledger, first), null);
  const sameDay = workout('2', 'route-a', 2000);
  assert.deepEqual(settleCoinWorkout(ledger, sameDay)?.reward, { mileage: 80, route: 0 });
  ledger = record(ledger, sameDay);
  const newDay = workout('3', 'route-a', 1000, { endedAt: afterMidnight });
  assert.deepEqual(settleCoinWorkout(ledger, newDay)?.reward, { mileage: 80, route: 80 });
  assert.deepEqual(coinDayProgress(ledger, afterMidnight), { meters: 0, routes: new Set(), earned: 0 });
  assert.equal(coinBalance(ledger), 240);
});

test('withdrawals validate amount and balance and the ledger survives reload', () => {
  const ledger: CoinLedger = [{ kind: 'demo-credit', id: 'demo-credit', at: beforeMidnight, coins: 10_000 }];
  assert.equal(recordCoinWithdrawal(ledger, 3, 'withdraw-1', beforeMidnight), ledger);
  const withdrawn = recordCoinWithdrawal(ledger, 1, 'withdraw-1', beforeMidnight);
  assert.equal(coinBalance(withdrawn), 0);
  assert.equal(recordCoinWithdrawal(withdrawn, 1, 'withdraw-1', beforeMidnight), withdrawn);
  assert.deepEqual(readCoinLedger(JSON.stringify(withdrawn)), withdrawn);
  assert.deepEqual(readCoinLedger('{bad'), []);
});

test('custom withdrawals accept exact cents, persist, and cannot overdraw or repeat', () => {
  const ledger: CoinLedger = [{ kind: 'demo-credit', id: 'demo-credit', at: beforeMidnight, coins: 10_000 }];
  const withdrawn = recordCoinWithdrawal(ledger, '0.29', 'custom-1', beforeMidnight);
  assert.equal(coinBalance(withdrawn), 7100);
  assert.deepEqual(readCoinLedger(JSON.stringify(withdrawn)), withdrawn);
  assert.equal(recordCoinWithdrawal(withdrawn, '0.29', 'custom-1', beforeMidnight), withdrawn);
  for (const invalid of ['0', '-0.01', '0.001', '1e-2', '0.72', '9007199254740992']) {
    assert.equal(recordCoinWithdrawal(withdrawn, invalid, 'custom-2', beforeMidnight), withdrawn);
  }
  assert.equal(coinBalance(recordCoinWithdrawal(withdrawn, '0.71', 'custom-2', beforeMidnight)), 0);
});

test('starter rewards can be claimed once per track per day and do not duplicate workout rewards', () => {
  let ledger = recordStarterClaim([], 'mileage', beforeMidnight);
  ledger = recordStarterClaim(ledger, 'route', beforeMidnight);
  assert.equal(coinBalance(ledger), 160);
  assert.deepEqual(coinDayProgress(ledger, beforeMidnight), { meters: 0, routes: new Set(), earned: 160 });
  assert.equal(recordStarterClaim(ledger, 'mileage', beforeMidnight), ledger);
  assert.equal(recordStarterClaim(ledger, 'route', beforeMidnight), ledger);
  assert.deepEqual(readCoinLedger(JSON.stringify(ledger)), ledger);
  assert.equal(coinBalance(recordStarterClaim(ledger, 'route', afterMidnight)), 240);

  ledger = record(ledger, workout('1', 'route-a', 1000));
  assert.equal(coinBalance(ledger), 160);
  ledger = record(ledger, workout('2', 'route-b', 2000));
  ledger = record(ledger, workout('3', 'route-c', 7000));
  assert.equal(coinDayProgress(ledger, beforeMidnight).earned, 680);

  const alreadyPaid = record([], workout('4', 'route-a', 1000));
  assert.equal(recordStarterClaim(alreadyPaid, 'mileage', beforeMidnight), alreadyPaid);
  assert.equal(recordStarterClaim(alreadyPaid, 'route', beforeMidnight), alreadyPaid);
});
