import { periodOpen, weekendPeriod } from './weekendRelay';
import { canRunPuzzleRoute, duoGoalComplete, puzzleAllPieces, sharedPuzzleRoute, type PuzzleMember, type PuzzleRoute, type PuzzleTeam } from './puzzleTeam';
import { isPuzzleScene } from './puzzleScenes';

export type SharedRouteAction = 'create' | 'join' | 'choose' | 'choose-scene-route' | 'run' | 'claim' | 'claimed' | 'waiting-member' | 'waiting-partner' | 'closed' | 'unavailable' | 'participated';
export interface SharedRouteTask {
  action: SharedRouteAction;
  route?: PuzzleRoute;
  members: { member?: PuzzleMember; complete: boolean }[];
}

/** One next action shared by the UI, assistive technology and automation. */
export function getSharedRouteTask(team: PuzzleTeam | undefined, now: number, claimed: boolean, routesAvailable: boolean, canEnroll = true, memberId = 'self'): SharedRouteTask {
  const pieces = team ? puzzleAllPieces(team) : [];
  const shared = team && sharedPuzzleRoute(team);
  const duoComplete = team?.mode === 'duo' && duoGoalComplete(team);
  const scene = team?.mode === 'duo' && isPuzzleScene(team.city.id);
  const route = scene ? undefined : shared ?? team?.sharedRoute ?? team?.pieces.find(piece => piece.memberId !== memberId
    && !pieces.some(own => own.memberId === memberId && own.route.id === piece.route.id && own.route.routeId === piece.route.routeId))?.route
    ?? team?.pieces[0]?.route;
  const members = team ? [team.members.find(member => member.id === memberId), team.members.find(member => member.id !== memberId)]
    .map(member => ({member, complete: !!member && pieces.some(piece => piece.memberId === member.id
      && (scene || (route && piece.route.id === route.id && piece.route.routeId === route.routeId)))})) : [];
  const task = (action: SharedRouteAction): SharedRouteTask => ({action, route, members});

  if (team && claimed && (team.mode !== 'duo' || duoComplete)) return task('claimed');
  if (shared || duoComplete) return task('claim');
  if (!periodOpen(team?.period ?? weekendPeriod(now), now)) return task('closed');
  if (!team && !canEnroll) return task('participated');
  if (!team) return task(routesAvailable ? 'create' : 'unavailable');
  if (team.mode === 'duo' && !members[0].member && team.members.length === 1) return task('join');
  if (team.members.length < 2) return task('waiting-member');
  if (members[0].complete) return task('waiting-partner');
  if (!routesAvailable) return task('unavailable');
  if (scene) return task('choose-scene-route');
  if (route && canRunPuzzleRoute(team, route, now, memberId)) return task('run');
  if (route && team.sharedRoute) return task('waiting-partner');
  return task(routesAvailable ? 'choose' : 'unavailable');
}
