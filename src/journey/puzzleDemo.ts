import { createPuzzle, duoGoalComplete, emptyPuzzleState, finishPuzzle, joinPuzzle, openPuzzleTeams, ownPieces, periodParticipation, canRunPuzzleRoute, puzzleComplete, readPuzzle, sharedPuzzleRoute, PUZZLE_DEMO_STORAGE, type PuzzleCity, type PuzzleRoute, type PuzzleState, type PuzzleTeam } from './puzzleTeam';
import { weekendPeriod, periodOpen } from './weekendRelay';

export const PUZZLE_LOBBY_LIMIT=10;
export const PUZZLE_PREVIEW_PARTNER_ID='runner-0';

/** The prototype previews an open activity by default, without changing its landing page. */
export function getPuzzlePreviewMode(search:string):{enabled:boolean;openOnLoad:boolean} {
  const params=new URLSearchParams(search),keys=['puzzleDemo','relayDemo'];
  const enabled=!keys.some(key=>params.get(key)==='0');
  return {enabled,openOnLoad:enabled&&keys.some(key=>params.get(key)==='1')};
}

export function joinPuzzleDemoPartner(state:PuzzleState,now:number):PuzzleState {
  const team=periodParticipation(state,weekendPeriod(now).id);
  return team&&team.members.length===1?joinPuzzle(state,team.id,{
    id:PUZZLE_PREVIEW_PARTNER_ID,name:'小林',avatarUrl:'https://i.pravatar.cc/100?img=11',joinedAt:now,
  }):state;
}

/** Builds a finished partner run for relay test fixtures. */
export function finishPuzzleDemoPartner(state:PuzzleState,now:number,selectedRoute?:PuzzleRoute):PuzzleState {
  const team=periodParticipation(state,weekendPeriod(now).id);
  if(!team||team.archived||team.members.length!==2||!periodOpen(team.period,now))return state;
  const partner=team.members.find(member=>member.id!=='self');
  if(!partner)return state;
  const route=selectedRoute;
  if(!route||!canRunPuzzleRoute(team,route,now,partner.id))return state;
  if(ownPieces(team,partner.id).length&&!team.pieces.some(piece=>piece.memberId!==partner.id&&piece.route.routeId===route.routeId))return state;
  return finishPuzzle(state,team.id,{
    id:'demo-partner-finish-'+team.id+'-'+route.routeId,memberId:partner.id,slot:team.pieces.length,route,
    startedAt:now,finishedAt:now,distanceKm:route.distanceKm,
  },now);
}

/** Each new preview entry starts a fresh local flow in an open weekend. */
export function createPuzzlePreviewSession(cities:PuzzleCity[],realNow:number,mode?:PuzzleTeam['mode']):{state:PuzzleState;now:number} {
  const period=weekendPeriod(realNow),now=periodOpen(period,realNow)?realNow:period.startsAt+3600000;
  return {state:seedPuzzleDemoLobby(emptyPuzzleState(),cities,now,mode),now};
}

/** Discard unfinished preview attempts on load and keep completed teams available in history. */
export function startDuoPreview(cities: PuzzleCity[], realNow: number, storage?: Pick<Storage, 'getItem'>) {
  const saved = readPuzzle(storage, PUZZLE_DEMO_STORAGE);
  const teams = saved.teams.filter(team => team.members.some(member => member.id === 'self')
    && (team.archived || duoGoalComplete(team) || puzzleComplete(team) || sharedPuzzleRoute(team)));
  const history = { ...saved, teams };
  const now = unjoinedPuzzleWeekend(history, realNow);
  return { state: seedPuzzleDemoLobby(history, cities, now, 'duo'), now };
}

/** Explicit preview accounts get joinable, persisted teams without enrolling the viewer. */
export function seedPuzzleDemoLobby(state:PuzzleState,cities:PuzzleCity[],now:number,mode?:PuzzleTeam['mode']):PuzzleState {
  const period=weekendPeriod(now);
  if(!cities.length||!periodOpen(period,now))return state;
  const cityIds=new Set(cities.map(city=>city.id));
  let missing=PUZZLE_LOBBY_LIMIT-openPuzzleTeams(state,now).filter(t=>cityIds.has(t.city.id)).length,next=state;
  const names=['小林','阿禾','小川','小岚','阿杰','南风','柚子','木木','小满','可乐'];
  for(let index=0;missing>0;index++) {
    const hostId='demo-host-'+index,id='demo-lobby-'+period.id+'-'+index;
    if(next.teams.some(t=>t.id===id)||periodParticipation(next,period.id,hostId))continue;
    next=createPuzzle(next,cities[index%cities.length],id,now,{id:hostId,name:names[index%names.length],avatarUrl:'https://i.pravatar.cc/100?img='+(11+index%3)},mode);
    missing--;
  }
  return next;
}

/** Move only the preview clock, preserving participation history and once-per-period rules. */
export function unjoinedPuzzleWeekend(state:PuzzleState,now:number):number {
  let period=weekendPeriod(now);
  while(periodParticipation(state,period.id))period=weekendPeriod(period.startsAt+7*86400000);
  return periodOpen(period,now)?now:period.startsAt+3600000;
}

/** Period controls follow the selected preview weekend, never an older team's period. */
export function puzzleDemoPeriodTime(state:PuzzleState,now:number,open:boolean):number {
  const upcoming=weekendPeriod(now),previous=weekendPeriod(now-3*86400000);
  const period=!periodOpen(upcoming,now)&&now>=previous.endsAt&&now<previous.endsAt+86400000?previous:upcoming;
  if(!open)return period.endsAt+1000;
  const recordedTimes=state.teams.filter(t=>t.period.id===period.id).flatMap(t=>[t.createdAt,...t.members.map(m=>m.joinedAt),...t.pieces.map(p=>p.finishedAt),...t.draws.map(d=>d.createdAt)]).filter(time=>periodOpen(period,time));
  return Math.max(period.startsAt+3600000,...recordedTimes.map(time=>time+1));
}
