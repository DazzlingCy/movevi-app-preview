import test from 'node:test';
import assert from 'node:assert/strict';
import { coinBalance, coinDayProgress, getTeamCoinReward, readCoinLedger, recordTeamRouteReward, TEAM_DUO_COINS } from './coinRewards';
import { finishPuzzleDemoPartner, joinPuzzleDemoPartner, PUZZLE_PREVIEW_PARTNER_ID, startDuoPreview } from './puzzleDemo';
import {
  canChooseSharedRoute, choosePuzzleSharedRoute, createPuzzle, drawsLeft, duoGoalComplete,
  emptyPuzzleState, finishPuzzle, joinPuzzle, openPuzzleTeams, periodParticipation, PUZZLE_DEMO_STORAGE, readPuzzle,
  type PuzzleCity, type PuzzlePiece, type PuzzleRoute,
} from './puzzleTeam';
import { getPuzzleSceneRoute } from './puzzleScenes';
import { getSharedRouteTask } from './sharedRouteTask';
import { weekendPeriod } from './weekendRelay';

const start = Date.parse('2026-11-20T10:00:00+08:00');
const later = start + 3_600_000;
const tokyo = { id: 'tokyo', name: '东京', image: '/tokyo.webp' };
const forest = { id: 'scene:forest', name: '森林', image: '/forest.webp' };
const cityRoute = (routeId: string): PuzzleRoute => ({ ...tokyo, routeId, title: routeId, routeIndex: 1, distanceKm: 3, minutes: 20 });
const sceneRoute = (routeId: string): PuzzleRoute => {
  const { route } = getPuzzleSceneRoute({ id: forest.id, routeId })!;
  return { ...forest, routeId, title: route.name, routeIndex: route.order, distanceKm: route.distanceKm, minutes: route.durationMinutes };
};
const joined = (city: PuzzleCity) => joinPuzzle(
  createPuzzle(emptyPuzzleState(), city, 'team', start, undefined, 'duo'),
  'team',
  { id: 'partner', name: '搭子', joinedAt: start },
);
const finish = (memberId: string, route: PuzzleRoute, finishedAt: number): PuzzlePiece => ({
  id: `${memberId}:${route.routeId}`, memberId, slot: 0, route, startedAt: finishedAt - 600_000,
  finishedAt, distanceKm: route.distanceKm,
});

test('route teammates can run in either order and must match the selected route', () => {
  const selected = cityRoute('隅田川');
  const other = cityRoute('皇居');
  const initial = joined(tokyo);
  assert.equal(finishPuzzle(initial, 'team', finish('self', selected, later)), initial);
  const ready = choosePuzzleSharedRoute(initial, 'team', selected, start);

  for (const member of ['self', 'partner']) {
    const second = member === 'self' ? 'partner' : 'self';
    const firstDone = finishPuzzle(ready, 'team', finish(member, selected, later));
    assert.equal(duoGoalComplete(firstDone.teams[0]), false);
    assert.equal(canChooseSharedRoute(firstDone.teams[0], later), false);
    assert.equal(finishPuzzle(firstDone, 'team', finish(second, other, later + 3_600_000)), firstDone);
    const bothDone = finishPuzzle(firstDone, 'team', finish(second, selected, later + 3_600_000));
    assert.equal(duoGoalComplete(bothDone.teams[0]), true);
    assert.equal(getSharedRouteTask(bothDone.teams[0], later + 3_600_000, false, true).action, 'claim');
    assert.equal(drawsLeft(bothDone.teams[0]), 0);
  }
});

test('two different routes in the same scene unlock the coins once; incomplete or unrelated runs do not', () => {
  const one = sceneRoute('forest-auckland');
  const two = sceneRoute('forest-podgorica');
  const initial = joined(forest);
  assert.equal(getSharedRouteTask(initial.teams[0], later, false, true).action, 'choose-scene-route');
  const ownRun = finish('self', one, later);
  assert.equal(finishPuzzle(initial, 'team', { ...ownRun, distanceKm: 1 }), initial);
  assert.equal(finishPuzzle(initial, 'team', { ...ownRun, route: { ...one, id: 'scene:beach' } }), initial);
  assert.equal(finishPuzzle(initial, 'team', { ...ownRun, route: { ...one, distanceKm: 1 } }), initial);
  const firstDone = finishPuzzle(initial, 'team', ownRun);
  assert.equal(getSharedRouteTask(firstDone.teams[0], later, false, true).action, 'waiting-partner');
  assert.equal(getSharedRouteTask(firstDone.teams[0], later, false, true).route, undefined);
  assert.equal(finishPuzzle(firstDone, 'team', finish('self', two, later + 1)), firstDone);
  assert.equal(getTeamCoinReward(firstDone.teams[0]), undefined);
  const expired = firstDone.teams[0].period.endsAt;
  assert.equal(finishPuzzle(firstDone, 'team', finish('partner', two, expired)), firstDone);

  const complete = finishPuzzleDemoPartner(firstDone, later + 1, two);
  const team = complete.teams[0];
  assert.equal(getTeamCoinReward(team)?.routeName, '森林场景');
  assert.equal(getTeamCoinReward(team)?.coins, 1_000);
  assert.deepEqual(readPuzzle({ getItem: () => JSON.stringify(complete) }), complete);
  assert.deepEqual(recordTeamRouteReward([], team, later), []);
  const ledger = readCoinLedger(JSON.stringify(recordTeamRouteReward([], team, expired)));
  assert.equal(coinBalance(ledger), TEAM_DUO_COINS);
  assert.equal(coinDayProgress(ledger, expired).earned, 0);
  assert.equal(recordTeamRouteReward(ledger, team, expired + 1), ledger);
});

test('refreshing the preview discards an unfinished task and reopens the same period for signup', () => {
  const firstDone = finishPuzzle(joined(forest), 'team', finish('self', sceneRoute('forest-auckland'), later));
  const restarted = startDuoPreview([forest], later, { getItem: key => key === PUZZLE_DEMO_STORAGE ? JSON.stringify(firstDone) : null });
  assert.equal(restarted.now, later);
  assert.equal(periodParticipation(restarted.state, weekendPeriod(restarted.now).id), undefined);
  assert.equal(restarted.state.teams.some(team => team.pieces.length > 0), false);
  assert.ok(openPuzzleTeams(restarted.state, restarted.now).length);
});

test('refreshing after both runners finish retains the old reward and starts an unjoined period', () => {
  const firstDone = finishPuzzle(joined(forest), 'team', finish('self', sceneRoute('forest-auckland'), later));
  const completed = finishPuzzleDemoPartner(firstDone, later + 1, sceneRoute('forest-philadelphia'));
  const restarted = startDuoPreview([forest], later + 1, { getItem: () => JSON.stringify(completed) });
  assert.notEqual(weekendPeriod(restarted.now).id, completed.teams[0].period.id);
  assert.equal(periodParticipation(restarted.state, weekendPeriod(restarted.now).id), undefined);
  assert.deepEqual(restarted.state.teams.find(team => team.id === 'team'), completed.teams[0]);
  assert.equal(getTeamCoinReward(restarted.state.teams[0])?.coins, TEAM_DUO_COINS);
});

test('both preview views can run and claim independently', () => {
  const partner = PUZZLE_PREVIEW_PARTNER_ID;
  const route = cityRoute('隅田川');
  let state = createPuzzle(emptyPuzzleState(), tokyo, 'team', start, undefined, 'duo');
  assert.equal(getSharedRouteTask(state.teams[0], start, false, true, true, partner).action, 'join');
  state = joinPuzzleDemoPartner(state, start);
  state = choosePuzzleSharedRoute(state, 'team', route, start, partner);
  assert.equal(getSharedRouteTask(state.teams[0], start, false, true, true, partner).action, 'run');
  assert.equal(getSharedRouteTask(state.teams[0], start, true, true, true, partner).action, 'run');

  state = finishPuzzle(state, 'team', finish(partner, route, later));
  assert.equal(getSharedRouteTask(state.teams[0], later, false, true, true, partner).action, 'waiting-partner');
  assert.equal(getSharedRouteTask(state.teams[0], later, false, true).action, 'run');
  assert.deepEqual(recordTeamRouteReward([], state.teams[0], later, partner), []);

  state = finishPuzzle(state, 'team', finish('self', route, later + 1));
  const team = state.teams[0];
  assert.equal(getSharedRouteTask(team, later + 2, true, true, true, partner).action, 'claimed');
  const partnerLedger = recordTeamRouteReward([], team, later + 2, partner);
  const ownerLedger = recordTeamRouteReward([], team, later + 2);
  assert.equal(coinBalance(partnerLedger), TEAM_DUO_COINS);
  assert.equal(coinBalance(ownerLedger), TEAM_DUO_COINS);
  assert.equal(recordTeamRouteReward(partnerLedger, team, later + 3, partner), partnerLedger);
  assert.deepEqual(recordTeamRouteReward([], team, later + 2, 'unrelated-runner'), []);
});
