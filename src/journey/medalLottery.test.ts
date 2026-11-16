import assert from 'node:assert/strict';
import test from 'node:test';
import { coinBalance, coinDayProgress, getAvailableMedals, getExchangedMedals, getMedalDraws, readCoinLedger, recordMedalDraw, recordMedalExchange, settleCoinWorkout, type CoinWorkout } from './coinRewards';
import { getJourneyCity } from './data';
import { getMedalLotteryStock, getRunMedals, MEDAL_LOTTERY_POOL_SIZE, PREVIEW_AVAILABLE_MEDALS, PREVIEW_EXCHANGED_MEDALS } from './medalLottery';

const now = Date.UTC(2026, 10, 16, 2);

test('five preview medals are available and ten exchanged medals credit 5,000 coins', () => {
  const seed = recordMedalExchange([], PREVIEW_EXCHANGED_MEDALS, now);
  assert.ok(seed);
  assert.equal(getAvailableMedals([seed], PREVIEW_AVAILABLE_MEDALS).length, 5);
  assert.equal(getExchangedMedals([seed]).length, 10);
  assert.equal(coinBalance([seed]), 5_000);
});

test('two medals fund one draw, repeated redemption does not add coins or affect daily rewards', () => {
  const [firstMedal, secondMedal] = PREVIEW_AVAILABLE_MEDALS;
  const first = recordMedalExchange([], [firstMedal], now);
  assert.ok(first);
  assert.equal(coinBalance([first]), 500);
  assert.equal(recordMedalDraw([first], 'draw-1', now), null);
  const second = recordMedalExchange([first], [firstMedal, secondMedal, secondMedal], now);
  assert.ok(second);
  assert.equal(second.coins, 500);
  const ledger = [first, second];
  assert.equal(coinBalance(ledger), 1_000);
  assert.equal(coinDayProgress(ledger, now).earned, 0);
  assert.equal(recordMedalExchange(ledger, [firstMedal, secondMedal], now), null);
  assert.deepEqual(getAvailableMedals(ledger, PREVIEW_AVAILABLE_MEDALS), PREVIEW_AVAILABLE_MEDALS.slice(2));
  const draw = recordMedalDraw(ledger, 'draw-1', now, 0);
  assert.ok(draw);
  assert.equal(draw.coins, 1_000);
  assert.equal(coinBalance([...ledger, draw]), 0);
  assert.deepEqual(readCoinLedger(JSON.stringify([...ledger, draw])), [...ledger, draw]);
});

test('previous medal exchange and draw amounts survive a reload', () => {
  const exchange = recordMedalExchange([], PREVIEW_EXCHANGED_MEDALS, now);
  assert.ok(exchange);
  const draw = recordMedalDraw([exchange], 'draw-before-price-change', now, 0);
  assert.ok(draw);
  const history = [{ ...exchange, coins: 10_000 }, { ...draw, coins: 5_000 }];
  const ledger = readCoinLedger(JSON.stringify(history));
  assert.deepEqual(ledger, history);
  assert.equal(coinBalance(ledger), 5_000);
  assert.equal(recordMedalExchange(ledger, PREVIEW_EXCHANGED_MEDALS, now), null);
  assert.deepEqual(getMedalDraws(ledger), [draw.prizeIndex]);
});

test('settlement credits only valid route runs and uses one medal per configured landmark', () => {
  const route = getJourneyCity('tokyo')!.routes[0];
  const names = route.landmarks.slice(0, 2);
  assert.deepEqual(getRunMedals({ ...route, medalLandmarks: [...names, names[0]] }, 'run-a').map(medal => medal.name), names);

  const workout: CoinWorkout = {
    id: 'run-a', cityId: route.cityId, routeId: route.id, routeName: route.name,
    plannedMeters: route.distanceKm * 1000, meters: route.distanceKm * 1000, activeSeconds: 1800, endedAt: now,
  };
  const shortRun = settleCoinWorkout([], { ...workout, meters: 5, activeSeconds: 2 });
  assert.ok(shortRun);
  assert.deepEqual(getAvailableMedals([shortRun]), []);
  const finished = settleCoinWorkout([], workout);
  assert.ok(finished);
  assert.deepEqual(getAvailableMedals([finished]).map(medal => medal.name), route.landmarks);
  assert.equal(settleCoinWorkout([finished], workout), null);
  const redo = settleCoinWorkout([finished], { ...workout, id: 'run-b' });
  assert.ok(redo);
  assert.equal(getAvailableMedals([finished, redo]).length, route.landmarks.length * 2);
});

test('draws debit the same wallet and avoid replayed IDs and depleted prize tiers', () => {
  const seed = recordMedalExchange([], PREVIEW_EXCHANGED_MEDALS.slice(0, 4), now);
  assert.ok(seed);
  const first = recordMedalDraw([seed], 'draw-1', now, 0);
  assert.ok(first);
  assert.equal(first.prizeIndex, 0);
  assert.equal(coinBalance([seed, first]), 1_000);
  assert.equal(recordMedalDraw([seed, first], 'draw-1', now, 0), null);
  const second = recordMedalDraw([seed, first], 'draw-2', now, 0);
  assert.ok(second);
  const ledger = [seed, first, second];
  assert.equal(second.prizeIndex, 1);
  assert.equal(coinBalance(ledger), 0);
  assert.equal(getMedalLotteryStock(getMedalDraws(ledger)).reduce((sum, count) => sum + count, 0), MEDAL_LOTTERY_POOL_SIZE - 2);
  assert.equal(recordMedalDraw(ledger, 'draw-3', now), null);
});

