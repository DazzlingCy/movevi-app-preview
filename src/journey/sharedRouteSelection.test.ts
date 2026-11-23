import test from 'node:test';
import assert from 'node:assert/strict';
import { canChooseSharedRoute, canRunPuzzleRoute, choosePuzzleSharedRoute, createPuzzle, drawsLeft, emptyPuzzleState, finishPuzzle, joinPuzzle, readPuzzle, sharedPuzzleRoute, type PuzzlePiece, type PuzzleRoute } from './puzzleTeam';
import { getSharedRouteTask } from './sharedRouteTask';
import { coinBalance, recordTeamRouteReward } from './coinRewards';

const now=Date.parse('2026-11-20T10:00:00+08:00');
const city={id:'tokyo',name:'东京',image:'/tokyo.webp'};
const route=(id:string):PuzzleRoute=>({...city,routeId:id,routeIndex:1,title:`路线${id}`,distanceKm:3,minutes:20});
const waiting=()=>createPuzzle(emptyPuzzleState(),city,'team',now);
const paired=()=>joinPuzzle(waiting(),'team',{id:'partner',name:'小林',joinedAt:now});
const piece=(id:string,memberId='self'):PuzzlePiece=>({id:`${memberId}-${id}`,memberId,slot:0,startedAt:now,finishedAt:now,route:route(id),distanceKm:3});

test('a creator may preselect a route while waiting and both members inherit it after joining',()=>{
  const before=waiting(),copy=JSON.stringify(before);
  const selected=choosePuzzleSharedRoute(before,'team',route('b'),now);
  assert.equal(JSON.stringify(before),copy);
  assert.equal(selected.teams[0].sharedRoute?.routeId,'b');
  assert.equal(getSharedRouteTask(selected.teams[0],now,false,true).action,'waiting-member');
  assert.equal(canRunPuzzleRoute(selected.teams[0],route('b'),now),false);
  const restored=readPuzzle({getItem:()=>JSON.stringify(selected)});
  assert.deepEqual(restored,selected);
  const joined=joinPuzzle(restored,'team',{id:'partner',name:'小林',joinedAt:now});
  const task=getSharedRouteTask(joined.teams[0],now,false,true);
  assert.equal(task.action,'run');
  assert.equal(task.route?.routeId,'b');
  assert.equal(getSharedRouteTask(joined.teams[0],now,false,false).action,'unavailable','an unavailable shared route must not offer a dead start button');
});

test('the chosen goal stays stable when unrelated relay routes are completed',()=>{
  let state=choosePuzzleSharedRoute(paired(),'team',route('b'),now);
  state=finishPuzzle(state,'team',piece('a'),now);
  state=finishPuzzle(state,'team',piece('c','partner'),now);
  assert.equal(getSharedRouteTask(state.teams[0],now,false,true).route?.routeId,'b');
  assert.equal(getSharedRouteTask(state.teams[0],now,false,true).action,'run');
  assert.equal(canChooseSharedRoute(state.teams[0],now),false);
  assert.equal(choosePuzzleSharedRoute(state,'team',route('c'),now),state);
  assert.equal(finishPuzzle(state,'team',{...piece('a','partner'),id:'wrong-shared-goal'},now),state);
});

test('only the designated route unlocks the shared reward, with no extra relay draw',()=>{
  let state=choosePuzzleSharedRoute(paired(),'team',route('b'),now);
  state=finishPuzzle(state,'team',piece('b'),now);
  assert.equal(getSharedRouteTask(state.teams[0],now,false,true).action,'waiting-partner');
  state=finishPuzzle(state,'team',piece('b','partner'),now);
  assert.equal(sharedPuzzleRoute(state.teams[0])?.routeId,'b');
  assert.equal(getSharedRouteTask(state.teams[0],now,false,true).action,'claim');
  assert.equal(coinBalance(recordTeamRouteReward([],state.teams[0],now)),500);
  assert.equal(state.teams[0].pieces.length,1);
  assert.equal(drawsLeft(state.teams[0]),0);
  const tampered={...state.teams[0],sharedRoute:route('c')};
  assert.equal(sharedPuzzleRoute(tampered),undefined);
  assert.deepEqual(recordTeamRouteReward([],tampered,now),[]);
});

test('members who used their relay quota can still follow the partner onto the chosen route',()=>{
  let state=choosePuzzleSharedRoute(paired(),'team',route('b'),now);
  for(const id of ['a','c'])state=finishPuzzle(state,'team',piece(id),now);
  assert.equal(getSharedRouteTask(state.teams[0],now,false,true).action,'waiting-partner');
  state=finishPuzzle(state,'team',piece('b','partner'),now);
  assert.equal(getSharedRouteTask(state.teams[0],now,false,true).action,'run');
  state=finishPuzzle(state,'team',{...piece('b'),slot:3},now);
  assert.equal(getSharedRouteTask(state.teams[0],now,false,true).action,'claim');
  assert.equal(drawsLeft(state.teams[0]),2);
  assert.equal(drawsLeft(state.teams[0],'partner'),1);
});

test('invalid, expired, archived and post-completion goal changes are rejected',()=>{
  const state=paired();
  for(const invalid of [{...route('a'),id:'paris'},{...route('a'),distanceKm:0},{...route('a'),minutes:NaN}]){
    assert.equal(choosePuzzleSharedRoute(state,'team',invalid,now),state);
  }
  assert.equal(choosePuzzleSharedRoute(state,'team',route('a'),state.teams[0].period.endsAt),state);
  const selected=choosePuzzleSharedRoute(state,'team',route('a'),now);
  assert.equal(choosePuzzleSharedRoute(selected,'team',route('a'),now),selected);
  const changed=choosePuzzleSharedRoute(selected,'team',route('b'),now);
  assert.equal(changed.teams[0].sharedRoute?.routeId,'b');
  const archived={...state,teams:[{...state.teams[0],archived:true}]};
  assert.equal(choosePuzzleSharedRoute(archived,'team',route('a'),now),archived);
  const invalid={...selected,teams:[{...selected.teams[0],sharedRoute:{...route('a'),id:'paris'}}]};
  assert.deepEqual(readPuzzle({getItem:()=>JSON.stringify(invalid)}),emptyPuzzleState());
});
