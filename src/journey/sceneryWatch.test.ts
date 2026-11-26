import assert from 'node:assert/strict';
import test from 'node:test';
import { observeScenery, sceneryStallTimeoutMs, startSceneryWatch } from './sceneryWatch';

test('a video reporting play but remaining on its first frame is detected as stalled', () => {
  const watch = startSceneryWatch(0, 0);
  assert.equal(observeScenery(watch, { now: 500, position: 0, playing: true }).status, 'pending');
  assert.equal(observeScenery(watch, { now: sceneryStallTimeoutMs, position: 0, playing: true }).status, 'stalled');
});

test('actual progress, including looping back to the beginning, restarts the stall window', () => {
  const watch = startSceneryWatch(0, 114.5);
  const loop = observeScenery(watch, { now: 1000, position: 0.5, playing: true });
  assert.equal(loop.status, 'advanced');
  assert.equal(observeScenery(loop.watch, { now: sceneryStallTimeoutMs, position: 0.5, playing: true }).status, 'pending');
  assert.equal(observeScenery(loop.watch, { now: 1000 + sceneryStallTimeoutMs, position: 0.5, playing: true }).status, 'stalled');
});

test('a paused or seeking video does not count as advancing, and reload starts a fresh window', () => {
  const watch = startSceneryWatch(0, 0);
  assert.equal(observeScenery(watch, { now: sceneryStallTimeoutMs, position: 15, playing: false }).status, 'stalled');
  const reloaded = startSceneryWatch(9000, 0);
  assert.equal(observeScenery(reloaded, { now: 9500, position: 0, playing: true }).status, 'pending');
  assert.equal(observeScenery(reloaded, { now: 10000, position: 1, playing: true }).status, 'advanced');
});
