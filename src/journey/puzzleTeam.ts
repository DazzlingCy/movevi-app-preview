import { weekendPeriod, periodOpen, WEEKEND_PRIZES, type WeekendPeriod } from './weekendRelay';
import { getPuzzleSceneRoute, isPuzzleScene } from './puzzleScenes';
export interface PuzzleCity { id: string; name: string; image: string }
export interface PuzzleRoute extends PuzzleCity { routeId: string; routeIndex: number; title: string; distanceKm: number; minutes: number }
export interface PuzzleMember { id: string; name: string; joinedAt: number; avatarUrl?: string }
export interface PuzzlePiece {
  id: string; memberId: string; slot: number; startedAt: number; finishedAt: number;
  route: PuzzleRoute; distanceKm: number;
}
export interface PuzzleTeam {
  id: string; city: PuzzleCity; createdAt: number; members: PuzzleMember[]; pieces: PuzzlePiece[];
  period: WeekendPeriod; draws: RelayDraw[]; archived?: boolean; duoPieces?: PuzzlePiece[]; sharedRoute?: PuzzleRoute;
  mode?: 'duo';
}
export interface RelayDraw { id: string; memberId: string; cents: number; createdAt: number }
export interface PuzzleState { version: 4; teams: PuzzleTeam[] }
export const PUZZLE_STORAGE = 'movevi-weekend-relay-v4';
export const PUZZLE_DEMO_STORAGE = 'movevi-weekend-relay-demo-account-v1';
export const emptyPuzzleState = (): PuzzleState => ({ version: 4, teams: [] });
export const currentPuzzle = (state: PuzzleState) => state.teams.slice().reverse().find(t => !t.archived && t.members.some(m=>m.id==='self'));
export const periodParticipation = (state: PuzzleState, periodId: string, memberId='self') => state.teams.find(t=>t.period.id===periodId && t.members.some(m=>m.id===memberId));
export const puzzleComplete = (team: PuzzleTeam) => team.mode !== 'duo' && team.pieces.length === 3 && (team.archived || team.members.length === 2) && new Set(team.pieces.map(p => p.memberId)).size >= 2;
export const ownPieces = (team: PuzzleTeam, memberId = 'self') => team.pieces.filter(p => p.memberId === memberId);
export const puzzleAllPieces = (team: PuzzleTeam) => [...team.pieces, ...(team.duoPieces ?? [])];
const sameRoute = (a: PuzzleRoute, b: Pick<PuzzleRoute, 'id' | 'routeId'>) => a.id === b.id && a.routeId === b.routeId;

function matchesDuoGoal(team: PuzzleTeam, route: Pick<PuzzleRoute, 'id' | 'routeId'>) {
  return route.id === team.city.id && (isPuzzleScene(team.city.id)
    ? !!getPuzzleSceneRoute(route)
    : !!team.sharedRoute && sameRoute(team.sharedRoute, route));
}

function validDuoRun(team: PuzzleTeam, piece: PuzzlePiece) {
  if (!matchesDuoGoal(team, piece.route)) return false;
  const distance = isPuzzleScene(team.city.id)
    ? getPuzzleSceneRoute(piece.route)?.route.distanceKm : team.sharedRoute?.distanceKm;
  return !!distance && piece.route.distanceKm === distance
    && Number.isFinite(piece.distanceKm) && piece.distanceKm >= distance
    && team.members.some(member => member.id === piece.memberId)
    && piece.startedAt >= Math.max(...team.members.map(member => member.joinedAt))
    && piece.finishedAt >= piece.startedAt && periodOpen(team.period, piece.startedAt) && periodOpen(team.period, piece.finishedAt);
}

export function duoGoalComplete(team: PuzzleTeam) {
  return team.mode === 'duo' && !team.archived && team.members.length === 2
    && new Set(team.members.map(member => member.id)).size === 2 && team.pieces.length === 2
    && team.members.every(member => team.pieces.some(piece => piece.memberId === member.id && validDuoRun(team, piece)));
}

/** The extra shared run does not consume a relay slot or award another draw. */
export function sharedPuzzleRoute(team: PuzzleTeam): PuzzleRoute | undefined {
  if (team.mode === 'duo' || team.archived || team.members.length !== 2 || new Set(team.members.map(member => member.id)).size !== 2) return;
  const pieces = puzzleAllPieces(team);
  return pieces.find(piece => (!team.sharedRoute || sameRoute(piece.route,team.sharedRoute)) && team.members.every(member => pieces.some(other =>
    other.memberId === member.id && sameRoute(other.route, piece.route)
    && other.route.id === team.city.id && Number.isFinite(other.distanceKm) && Number.isFinite(other.route.distanceKm)
    && other.route.distanceKm > 0 && other.distanceKm >= other.route.distanceKm && other.route.distanceKm === piece.route.distanceKm
    && other.startedAt >= Math.max(...team.members.map(item => item.joinedAt)) && other.finishedAt >= other.startedAt
    && periodOpen(team.period, other.startedAt) && periodOpen(team.period, other.finishedAt)
  )))?.route;
}

export function canRunPuzzleRoute(team: PuzzleTeam, route: Pick<PuzzleRoute, 'id' | 'routeId'>, now: number, memberId = 'self') {
  if (team.archived || team.members.length !== 2 || !periodOpen(team.period, now) || route.id !== team.city.id
    || !team.members.some(member => member.id === memberId)
    || puzzleAllPieces(team).some(piece => piece.memberId === memberId && sameRoute(piece.route, route))) return false;
  if (team.mode === 'duo') return matchesDuoGoal(team, route) && !ownPieces(team, memberId).length;
  const partnerFinished = team.pieces.some(piece => piece.memberId !== memberId && sameRoute(piece.route, route));
  if (partnerFinished) return (!team.sharedRoute || sameRoute(team.sharedRoute,route)) && !sharedPuzzleRoute(team) && !team.duoPieces?.length;
  return !puzzleComplete(team) && ownPieces(team, memberId).length < 2;
}

export function canChooseSharedRoute(team: PuzzleTeam, now: number, memberId = 'self') {
  return !team.archived && !isPuzzleScene(team.city.id) && periodOpen(team.period,now) && team.members.some(member=>member.id===memberId)
    && team.members.length <= 2 && puzzleAllPieces(team).length === 0;
}

export function choosePuzzleSharedRoute(state: PuzzleState, teamId: string, route: PuzzleRoute, now: number, memberId = 'self'): PuzzleState {
  const team=state.teams.find(item=>item.id===teamId);
  if(!team||!canChooseSharedRoute(team,now,memberId)||route.id!==team.city.id||!validSharedRoute(route)
    ||team.sharedRoute?.routeId===route.routeId)return state;
  return {...state,teams:state.teams.map(item=>item.id===teamId?{...item,sharedRoute:{...route}}:item)};
}

function validSharedRoute(route: PuzzleRoute) {
  return typeof route.routeId==='string'&&!!route.routeId&&typeof route.name==='string'&&typeof route.image==='string'
    &&typeof route.title==='string'&&!!route.title&&Number.isInteger(route.routeIndex)&&route.routeIndex>0
    &&Number.isFinite(route.distanceKm)&&route.distanceKm>0&&Number.isFinite(route.minutes)&&route.minutes>0;
}
export function openPuzzleTeams(state:PuzzleState,now:number):PuzzleTeam[] {
  const period=weekendPeriod(now);
  return state.teams.filter(t=>!t.archived&&t.period.id===period.id&&periodOpen(t.period,now)&&t.members.length===1&&!t.members.some(m=>m.id==='self')&&!puzzleComplete(t));
}
export function puzzleRouteChoices(team: PuzzleTeam | undefined, routes: PuzzleRoute[], cityId?: string): PuzzleRoute[] {
  const completed = team?.pieces ?? [];
  const selectedCityId = team?.city.id ?? cityId;
  return routes.filter(r => (!selectedCityId || r.id === selectedCityId) && Number.isFinite(r.minutes) && r.minutes > 0 && Number.isFinite(r.distanceKm) && r.distanceKm > 0
    && !completed.some(p => p.route.id === r.id && p.route.routeId === r.routeId))
    .sort((a,b) => a.minutes - b.minutes || a.routeIndex - b.routeIndex);
}
export function createPuzzle(state: PuzzleState, city: PuzzleCity, id: string, now: number, creator:Pick<PuzzleMember,'id'|'name'|'avatarUrl'>={id:'self',name:'你'}, mode?: PuzzleTeam['mode']): PuzzleState {
  const period=weekendPeriod(now);
  if(!id||!city.id||!creator.id||!creator.name||!Number.isFinite(now)||state.teams.some(t=>t.id===id)
    ||!periodOpen(period,now)||periodParticipation(state,period.id,creator.id))return state;
  return {...state,teams:[...state.teams,{id,city,createdAt:now,members:[{...creator,joinedAt:now}],pieces:[],period,draws:[],...(mode ? {mode} : {})}]};
}
export function joinPuzzle(state: PuzzleState, teamId: string, member: PuzzleMember): PuzzleState {
  const team=state.teams.find(t=>t.id===teamId);
  if(!team||team.archived||team.members.length!==1||!member.id||!member.name||!Number.isFinite(member.joinedAt)
    ||member.joinedAt<team.createdAt||!periodOpen(team.period,member.joinedAt)||puzzleComplete(team)
    ||periodParticipation(state,team.period.id,member.id))return state;
  return {...state,teams:state.teams.map(t=>t.id===teamId?{...t,members:[...t.members,member]}:t)};
}
export function finishPuzzle(state: PuzzleState, teamId: string, piece: PuzzlePiece, receivedAt = piece.finishedAt): PuzzleState {
  const team=state.teams.find(t=>t.id===teamId);
  if(!team||!canRunPuzzleRoute(team,piece.route,receivedAt,piece.memberId)||!periodOpen(team.period,piece.startedAt)||!periodOpen(team.period,piece.finishedAt)
    ||piece.startedAt<Math.max(...team.members.map(m=>m.joinedAt))||piece.finishedAt>receivedAt||!piece.id||!piece.route.routeId
    ||![piece.startedAt,piece.finishedAt,piece.distanceKm,piece.route.distanceKm].every(Number.isFinite)
    ||piece.finishedAt<piece.startedAt||piece.route.distanceKm<=0||piece.distanceKm<piece.route.distanceKm
    ||!Number.isInteger(piece.slot)||piece.slot<0||piece.slot>3
    ||state.teams.some(t=>puzzleAllPieces(t).some(p=>p.id===piece.id)))return state;
  if (team.mode === 'duo' && !validDuoRun(team, piece)) return state;
  if (team.mode !== 'duo' && team.pieces.some(p => sameRoute(p.route, piece.route))) {
    if (team.pieces.some(p => sameRoute(p.route, piece.route) && p.route.distanceKm !== piece.route.distanceKm)) return state;
    return {...state, teams: state.teams.map(t => t.id === teamId ? {...t, duoPieces: [{...piece, slot: 0}]} : t)};
  }
  return {...state,teams:state.teams.map(t=>t.id===teamId?{...t,pieces:[...t.pieces,{...piece,slot:t.pieces.length}]}:t)};
}
export function drawsLeft(team:PuzzleTeam,memberId='self'):number {
  return puzzleComplete(team)?Math.max(0,ownPieces(team,memberId).length-team.draws.filter(d=>d.memberId===memberId).length):0;
}
export function drawPuzzle(state:PuzzleState,teamId:string,memberId:string,id:string,now:number,random:number):PuzzleState {
  const team=state.teams.find(t=>t.id===teamId);
  if(!team||!drawsLeft(team,memberId)||!id||!Number.isFinite(now)||now<Math.max(...team.pieces.map(p=>p.finishedAt))
    ||!Number.isFinite(random)||random<0||random>=1||state.teams.some(t=>t.draws.some(d=>d.id===id)))return state;
  const periodDraws=state.teams.filter(t=>t.period.id===team.period.id).flatMap(t=>t.draws);
  const pool=WEEKEND_PRIZES.flatMap(p=>Array(Math.max(0,p.count-periodDraws.filter(d=>d.cents===p.cents).length)).fill(p.cents));
  if(!pool.length)return state;
  const draw={id,memberId,cents:pool[Math.floor(random*pool.length)],createdAt:now};
  return {...state,teams:state.teams.map(t=>t.id===teamId?{...t,draws:[...t.draws,draw]}:t)};
}
export function readPuzzle(storage?:Pick<Storage,'getItem'>, key=PUZZLE_STORAGE):PuzzleState {
  try {
    const state=JSON.parse((storage??localStorage).getItem(key)||'null');
    if(state?.version===4&&Array.isArray(state.teams)&&state.teams.every((t:PuzzleTeam)=>
      typeof t.id==='string'&&typeof t.city?.name==='string'&&typeof t.city.id==='string'&&typeof t.city.image==='string'
      &&Number.isFinite(t.createdAt)&&Array.isArray(t.members)&&t.members.length<=4
      &&(t.sharedRoute===undefined||(t.sharedRoute&&t.sharedRoute.id===t.city.id&&validSharedRoute(t.sharedRoute)))
      &&t.members.every(m=>typeof m.id==='string'&&typeof m.name==='string'&&Number.isFinite(m.joinedAt))
      &&Array.isArray(t.pieces)&&t.pieces.length<=3&&new Set(t.pieces.map(p=>p.slot)).size===t.pieces.length
      &&t.pieces.every(p=>typeof p.id==='string'&&typeof p.memberId==='string'&&Number.isInteger(p.slot)&&p.slot>=0&&p.slot<=2
        &&typeof p.route?.title==='string'&&typeof p.route.name==='string'&&typeof p.route.routeId==='string'
        &&Number.isFinite(p.finishedAt)&&Number.isFinite(p.startedAt)&&Number.isFinite(p.distanceKm))
      &&(t.duoPieces===undefined||(Array.isArray(t.duoPieces)&&t.duoPieces.length<=1&&t.duoPieces.every(p=>
        typeof p.id==='string'&&!!p.id&&typeof p.memberId==='string'&&p.slot===0
        &&typeof p.route?.title==='string'&&typeof p.route.routeId==='string'&&p.route.id===t.city.id
        &&Number.isFinite(p.route.distanceKm)&&p.route.distanceKm>0&&Number.isFinite(p.distanceKm)&&p.distanceKm>=p.route.distanceKm
        &&Number.isFinite(p.startedAt)&&Number.isFinite(p.finishedAt)&&p.finishedAt>=p.startedAt
        &&p.startedAt>=Math.max(...t.members.map(m=>m.joinedAt))&&periodOpen(t.period,p.startedAt)&&periodOpen(t.period,p.finishedAt)
        &&t.members.some(m=>m.id===p.memberId)&&t.pieces.some(other=>other.memberId!==p.memberId&&sameRoute(other.route,p.route))
        &&!t.pieces.some(other=>other.id===p.id||other.memberId===p.memberId&&sameRoute(other.route,p.route)))))
      &&typeof t.period?.id==='string'&&Number.isFinite(t.period.startsAt)&&Number.isFinite(t.period.endsAt)
      &&(t.mode===undefined||(t.mode==='duo'&&t.members.length<=2&&t.pieces.length<=2&&!t.duoPieces?.length
        &&(!isPuzzleScene(t.city.id)||!t.sharedRoute)&&new Set(t.pieces.map(p=>p.memberId)).size===t.pieces.length
        &&t.pieces.every(p=>validDuoRun(t,p))))
      &&Array.isArray(t.draws)&&t.draws.every(d=>typeof d.id==='string'&&typeof d.memberId==='string'&&Number.isFinite(d.createdAt)&&WEEKEND_PRIZES.some(p=>p.cents===d.cents))))
      return {...state,teams:state.teams.map((t:PuzzleTeam)=>t.members.length>2?{...t,archived:true}:t)};
  } catch { /* Keep the app usable if browser storage is unavailable. */ }
  return emptyPuzzleState();
}
