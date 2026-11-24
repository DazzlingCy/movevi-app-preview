import assert from 'node:assert/strict';
import test from 'node:test';
import {
  availableCityRelayRewards, cityRelayCompleted, CITY_RELAY_PARTNER, createCityRelayAttempt, finishCityRelayAttempt,
  isCityRelayRunComplete, readCityRelayAttempts,
} from './cityRelay';
import { coinBalance, readCoinLedger, recordCityRelayReward } from './coinRewards';

const start = Date.parse('2026-11-23T10:00:00+08:00');
const route = { id: 'forest-auckland', name: '奥克兰林径' };
const joined = createCityRelayAttempt('788b3837-5bb5-4d75-b70a-09a691838377', start);

test('a team can join on a weekday and the partner can finish first', () => {
  assert.equal(cityRelayCompleted(joined, start), 0);
  assert.equal(cityRelayCompleted(joined, start + CITY_RELAY_PARTNER.delay), 1);
  assert.deepEqual(availableCityRelayRewards(joined, start + 45_000, new Set()), []);
  assert.deepEqual(recordCityRelayReward([], joined, start + 45_000), []);
  const finished = finishCityRelayAttempt(joined, route, start + 45_000);
  assert.equal(cityRelayCompleted(finished, start + 45_000), 2);
  assert.equal(coinBalance(recordCityRelayReward([], finished, start + 45_000)), 300);
});

test('one runner can claim 120 first and claim 180 only after the partner finishes', () => {
  const finished = finishCityRelayAttempt(joined, route, start + 12_000);
  assert.equal(finishCityRelayAttempt(finished, {id:'another',name:'另一条路线'}, start + 13_000), finished);
  const personal = recordCityRelayReward([], finished, start + 12_000);
  assert.equal(coinBalance(personal), 120);
  assert.equal(recordCityRelayReward(personal, finished, start + 20_000), personal);
  const both = recordCityRelayReward(personal, finished, start + 22_000);
  assert.equal(coinBalance(both), 300);
  assert.deepEqual(readCoinLedger(JSON.stringify(both)), both);
  assert.equal(recordCityRelayReward(both, finished, start + 45_000), both);
  assert.deepEqual(readCityRelayAttempts(JSON.stringify([finished, joined])), [finished]);
});

test('running mode counts full playback regardless of the route chosen and skips partial runs', () => {
  const run = { meters: 3600, activeSeconds: 1680, endedAt: start + 1680000, source: 'playback' as const };
  assert.equal(isCityRelayRunComplete(run, 28, 3.6, false), true);
  assert.equal(isCityRelayRunComplete({...run, activeSeconds: 600}, 28, 3.6, false), false);
  assert.equal(isCityRelayRunComplete({...run, source: undefined}, 28, 3.6, false), false);
  assert.equal(isCityRelayRunComplete({...run, source: undefined, meters: 1000}, 28, 3.6, true), false);
  assert.equal(isCityRelayRunComplete({...run, source: undefined}, 28, 3.6, true), true);
});

test('old four-runner records retain their original progress and claim IDs', () => {
  const [legacy] = readCityRelayAttempts(JSON.stringify([{
    periodId: '2026-11-27', routeId: 'leg-one', routeName: '浅草寺', joinedAt: start, finishedAt: start + 12_000,
  }]));
  assert.equal(legacy.teamSize, 4);
  assert.equal(cityRelayCompleted(legacy, start + 22_000), 3);
  const [personal] = recordCityRelayReward([], legacy, start + 12_000);
  assert.equal(personal.id, 'city-relay:2026-11-27:personal');
  const both = recordCityRelayReward([personal], legacy, start + 22_000);
  assert.deepEqual(readCoinLedger(JSON.stringify(both)), both);
  assert.equal(coinBalance(both), 300);
});
