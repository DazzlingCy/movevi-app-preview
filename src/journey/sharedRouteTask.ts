import { periodOpen, weekendPeriod } from './weekendRelay';
import { canRunPuzzleRoute, puzzleAllPieces, sharedPuzzleRoute, type PuzzleMember, type PuzzleRoute, type PuzzleTeam } from './puzzleTeam';

export type SharedRouteAction = 'create' | 'choose' | 'run' | 'claim' | 'claimed' | 'waiting-member' | 'waiting-partner' | 'closed' | 'unavailable' | 'participated';
export interface SharedRouteTask {
  action: SharedRouteAction;
  route?: PuzzleRoute;
  members: { member?: PuzzleMember; complete: boolean }[];
}

/** One next action shared by the UI, assistive technology and automation. */
export function getSharedRouteTask(team: PuzzleTeam | undefined, now: number, claimed: boolean, routesAvailable: boolean, canEnroll = true): SharedRouteTask {
  const pieces = team ? puzzleAllPieces(team) : [];
  const shared = team && sharedPuzzleRoute(team);
  const route = shared ?? team?.sharedRoute ?? team?.pieces.find(piece => piece.memberId !== 'self'
    && !pieces.some(own => own.memberId === 'self' && own.route.id === piece.route.id && own.route.routeId === piece.route.routeId))?.route
    ?? team?.pieces[0]?.route;
  const members = team ? [team.members.find(member => member.id === 'self'), team.members.find(member => member.id !== 'self')]
    .map(member => ({member, complete: !!member && !!route && pieces.some(piece => piece.memberId === member.id
      && piece.route.id === route.id && piece.route.routeId === route.routeId)})) : [];
  const task = (action: SharedRouteAction): SharedRouteTask => ({action, route, members});

  if (team && claimed) return task('claimed');
  if (shared) return task('claim');
  if (!periodOpen(team?.period ?? weekendPeriod(now), now)) return task('closed');
  if (!team && !canEnroll) return task('participated');
  if (!team) return task(routesAvailable ? 'create' : 'unavailable');
  if (team.members.length < 2) return task('waiting-member');
  if (members[0].complete) return task('waiting-partner');
  if (!routesAvailable) return task('unavailable');
  if (route && canRunPuzzleRoute(team, route, now)) return task('run');
  if (route && team.sharedRoute) return task('waiting-partner');
  return task(routesAvailable ? 'choose' : 'unavailable');
}
