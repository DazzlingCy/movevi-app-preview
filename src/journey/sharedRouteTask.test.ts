import test from 'node:test';
import assert from 'node:assert/strict';
import { getSharedRouteTask } from './sharedRouteTask';
import { createPuzzle, emptyPuzzleState, finishPuzzle, joinPuzzle, type PuzzlePiece, type PuzzleTeam } from './puzzleTeam';

const now = Date.parse('2026-11-20T10:00:00+08:00');
const city = {id:'tokyo',name:'东京',image:'/tokyo.webp'};
const waiting = () => createPuzzle(emptyPuzzleState(),city,'team',now);
const paired = () => joinPuzzle(waiting(),'team',{id:'partner',name:'小林',joinedAt:now});
const run = (id:string,memberId='self',routeId='a'): PuzzlePiece => ({id,memberId,slot:0,startedAt:now,finishedAt:now,distanceKm:3,
  route:{...city,routeId,routeIndex:1,title:routeId,distanceKm:3,minutes:20}});
const task = (team?:PuzzleTeam,claimed=false,at=now,available=true) => getSharedRouteTask(team,at,claimed,available);

test('an unjoined account has one create action only while enrollment is open and routes exist',()=>{
  assert.equal(task().action,'create');
  assert.equal(task(undefined,false,now,false).action,'unavailable');
  assert.equal(task(undefined,false,now+3*86400000).action,'closed');
  assert.deepEqual(task().members,[]);
  assert.equal(getSharedRouteTask(undefined,now,false,true,false).action,'participated');
});
test('joining a team moves directly from member waiting to choosing a route',()=>{
  const state=waiting();
  assert.equal(task(state.teams[0]).action,'waiting-member');
  assert.equal(task(paired().teams[0]).action,'choose');
  assert.equal(task(paired().teams[0],false,now,false).action,'unavailable');
});
test('a completed own route waits for the partner without allowing a premature claim',()=>{
  const state=finishPuzzle(paired(),'team',run('self-a'),now);
  const next=task(state.teams[0]);
  assert.equal(next.action,'waiting-partner');
  assert.equal(next.route?.routeId,'a');
  assert.deepEqual(next.members.map(item=>item.complete),[true,false]);
});
test('the partner route is the next runnable task even when another own route exists',()=>{
  let state=finishPuzzle(paired(),'team',run('self-a'),now);
  state=finishPuzzle(state,'team',run('partner-b','partner','b'),now);
  const next=task(state.teams[0]);
  assert.equal(next.action,'run');
  assert.equal(next.route?.routeId,'b');
  assert.deepEqual(next.members.map(item=>item.complete),[false,true]);
});
test('both completions unlock one claim, including after expiry, then show claimed',()=>{
  let state=finishPuzzle(paired(),'team',run('self-a'),now);
  state=finishPuzzle(state,'team',run('partner-a','partner'),now);
  const team=state.teams[0];
  assert.equal(task(team).action,'claim');
  assert.equal(task(team,false,team.period.endsAt+1).action,'claim');
  assert.equal(task(team,true).action,'claimed');
  assert.deepEqual(task(team).members.map(item=>item.complete),[true,true]);
});
test('unfinished expired work cannot run or claim, and selecting the next action does not mutate progress',()=>{
  const team=paired().teams[0],before=JSON.stringify(team);
  assert.equal(task(team,false,team.period.endsAt).action,'closed');
  task(team);
  assert.equal(JSON.stringify(team),before);
});
