import test from 'node:test';
import assert from 'node:assert/strict';
import { coinBalance, cashBalance, coinDayProgress, readCoinLedger, recordTeamRouteReward, TEAM_SHARED_ROUTE_COINS } from './coinRewards';
import { canRunPuzzleRoute, createPuzzle, drawsLeft, emptyPuzzleState, finishPuzzle, joinPuzzle, ownPieces, puzzleComplete, readPuzzle, sharedPuzzleRoute, type PuzzlePiece, type PuzzleRoute, type PuzzleState } from './puzzleTeam';
import { finishPuzzleDemoPartner } from './puzzleDemo';
import { puzzleProgressFeedback } from './puzzleFeedback';

const NOW = Date.parse('2026-11-20T10:00:00+08:00');
const city = {id:'tokyo',name:'东京',image:'/tokyo.webp'};
const route = (id='a'): PuzzleRoute => ({...city,routeId:id,routeIndex:1,title:`路线 ${id}`,distanceKm:3,minutes:20});
const paired = () => joinPuzzle(createPuzzle(emptyPuzzleState(),city,'team',NOW),'team',{id:'partner',name:'小林',joinedAt:NOW});
const piece = (id:string,memberId='self',routeId='a',at=NOW): PuzzlePiece => ({id,memberId,route:route(routeId),slot:0,startedAt:at,finishedAt:at,distanceKm:3});
const shared = () => {
  let state=finishPuzzle(paired(),'team',piece('self-a'),NOW);
  return finishPuzzle(state,'team',piece('partner-a','partner'),NOW);
};

test('only both members completing the same full route unlocks the extra coins',()=>{
  let state=finishPuzzle(paired(),'team',piece('self-a'),NOW);
  assert.equal(sharedPuzzleRoute(state.teams[0]),undefined);
  const empty: []=[];
  assert.equal(recordTeamRouteReward(empty,state.teams[0],NOW),empty);
  const different=finishPuzzle(state,'team',piece('partner-b','partner','b'),NOW);
  assert.equal(recordTeamRouteReward(empty,different.teams[0],NOW),empty);
  state=finishPuzzle(state,'team',piece('partner-a','partner'),NOW);
  assert.equal(sharedPuzzleRoute(state.teams[0])?.routeId,'a');
  assert.equal(state.teams[0].pieces.length,1);
  assert.equal(state.teams[0].duoPieces?.length,1);
  assert.equal(drawsLeft(state.teams[0]),0);
  const ledger=recordTeamRouteReward([],state.teams[0],NOW);
  assert.equal(coinBalance(ledger),TEAM_SHARED_ROUTE_COINS);
  assert.equal(cashBalance(ledger),0);
  assert.equal(coinDayProgress(ledger,NOW).earned,0,'team bonus does not consume daily exercise tiers');
});

test('claim is once per account per period and survives reload or a changed team id',()=>{
  const team=shared().teams[0];
  const ledger=recordTeamRouteReward([],team,NOW);
  const restored=readCoinLedger(JSON.stringify(ledger));
  assert.deepEqual(restored,ledger);
  assert.equal(recordTeamRouteReward(restored,team,NOW+1),restored);
  assert.equal(recordTeamRouteReward(restored,{...team,id:'another-team'},NOW+1),restored);
  assert.equal(coinBalance(restored),500);
  assert.deepEqual(readCoinLedger(JSON.stringify([{...ledger[0],coins:999999} ])),[]);
});

test('same-route run remains available after relay completion and personal relay quota',()=>{
  let state=paired();
  for(const p of [piece('a','self','a'),piece('b','self','b'),piece('c','partner','c')])state=finishPuzzle(state,'team',p,NOW);
  assert.equal(puzzleComplete(state.teams[0]),true);
  assert.equal(canRunPuzzleRoute(state.teams[0],route('c'),NOW),true);
  assert.equal(canRunPuzzleRoute(state.teams[0],route('d'),NOW),false);
  const before=state.teams[0];
  state=finishPuzzle(state,'team',{...piece('shared-c','self','c'),slot:3},NOW);
  assert.equal(ownPieces(state.teams[0]).length,2);
  assert.equal(state.teams[0].pieces.length,3);
  assert.equal(drawsLeft(state.teams[0]),2);
  assert.equal(drawsLeft(state.teams[0],'partner'),1);
  assert.equal(sharedPuzzleRoute(state.teams[0])?.routeId,'c');
  assert.match(puzzleProgressFeedback(before,state.teams[0])??'',/同路挑战完成/);
  assert.equal(canRunPuzzleRoute(state.teams[0],route('a'),NOW,'partner'),false,'one shared bonus per period');
  assert.deepEqual(readPuzzle({getItem:()=>JSON.stringify(state)}),state);
});

test('a shared run does not block the remaining three distinct relay routes',()=>{
  let state=shared();
  state=finishPuzzle(state,'team',piece('self-b','self','b'),NOW);
  state=finishPuzzle(state,'team',piece('partner-c','partner','c'),NOW);
  assert.equal(puzzleComplete(state.teams[0]),true);
  assert.equal(drawsLeft(state.teams[0]),2);
  assert.equal(drawsLeft(state.teams[0],'partner'),1);
  assert.equal(state.teams[0].pieces.length,3);
  assert.equal(state.teams[0].duoPieces?.length,1);
});

test('partial, repeated, mismatched-plan, outsider and expired shared runs are rejected',()=>{
  const state=finishPuzzle(paired(),'team',piece('self-a'),NOW);
  for(const invalid of [
    {...piece('partial','partner'),distanceKm:2.9},
    {...piece('short-plan','partner'),route:{...route(),distanceKm:1},distanceKm:1},
    piece('outsider','outsider'),piece('self-repeat'),
  ])assert.equal(finishPuzzle(state,'team',invalid,NOW),state);
  const ended=state.teams[0].period.endsAt;
  assert.equal(canRunPuzzleRoute(state.teams[0],route(),ended,'partner'),false);
  assert.equal(finishPuzzle(state,'team',piece('late','partner','a',ended),ended),state);
  const valid=finishPuzzle(state,'team',piece('partner-a','partner'),NOW);
  assert.equal(finishPuzzle(valid,'team',piece('repeated-partner-a','partner'),NOW),valid);
});

test('earned claims remain available after expiry but cannot be paid before completion',()=>{
  const team=shared().teams[0];
  assert.deepEqual(recordTeamRouteReward([],team,NOW-1),[]);
  assert.equal(coinBalance(recordTeamRouteReward([],team,team.period.endsAt+1)),500);
  assert.deepEqual(recordTeamRouteReward([],{...team,archived:true},NOW),[]);
  assert.deepEqual(recordTeamRouteReward([],{...team,members:[team.members[0],team.members[0]]},NOW),[]);
});

test('malformed shared proof cannot survive storage or become a reward',()=>{
  const state=shared();
  for(const patch of [{memberId:'self'},{distanceKm:0},{finishedAt:NOW-1},{route:{...route(),id:'paris'}}]){
    const invalid: PuzzleState={...state,teams:[{...state.teams[0],duoPieces:[{...state.teams[0].duoPieces![0],...patch}]}]};
    assert.deepEqual(readPuzzle({getItem:()=>JSON.stringify(invalid)}),emptyPuzzleState());
    assert.deepEqual(recordTeamRouteReward([],invalid.teams[0],NOW),[]);
  }
});

test('preview partner can complete the same route without taking a relay slot',()=>{
  let state=finishPuzzle(paired(),'team',piece('own-a'),NOW);
  state=finishPuzzleDemoPartner(state,NOW,route());
  assert.equal(sharedPuzzleRoute(state.teams[0])?.routeId,'a');
  assert.equal(state.teams[0].pieces.length,1);
  assert.equal(coinBalance(recordTeamRouteReward([],state.teams[0],NOW)),500);
  assert.equal(finishPuzzleDemoPartner(state,NOW,route()),state);
});
