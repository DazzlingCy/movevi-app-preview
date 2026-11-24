import { randomUUID } from 'node:crypto';
import {
  isMileageGoalMet, isPreviewMileageMember, matchesMileageTarget, mileageTeamPlan, MILEAGE_MEMBER_GOAL,
  MILEAGE_METERS_PER_SECOND, MILEAGE_TEAM_TIERS, MILEAGE_PREVIEW_PARTNER,
  type MileageCommand, type MileageMember, type MileageSnapshot, type MileageTeam, type MileageTeamPlan,
} from '../journey/mileageTeams';
import { resolveMileageRun, resolveMileageTarget } from '../journey/mileageTeamTargets';

type TeamRecord = MileageTeam & { previewOfferId?: string };
type MemberIdentity = Pick<MileageMember, 'id' | 'name' | 'avatarUrl'>;
type Workout = { teamId: string; userId: string; startedAt: number; limit: number; finished?: boolean };
export type MileageDatabase = { teams: TeamRecord[]; workouts: Record<string, Workout> };
export const emptyMileageDatabase = (): MileageDatabase => ({ teams: [], workouts: {} });

export class MileageError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

const label = (user: string) => `跑友 ${user.slice(0, 4).toUpperCase()}`;
const member = (id: string) => ({ id, name: label(id), meters: 0 });
const includes = (team: MileageTeam, user: string) => team.members.some(item => item.id === user);
const openTeam = (data: MileageDatabase, user: string) =>
  data.teams.find(team => (team.status === 'waiting' || team.status === 'active') && includes(team, user));

const previewLobby = [
  { modeId: 'forest', captain: MILEAGE_PREVIEW_PARTNER, plan: MILEAGE_TEAM_TIERS[0] },
  { modeId: 'beach', captain: { name: '许景行', avatarUrl: 'https://i.pravatar.cc/100?img=13' }, plan: MILEAGE_TEAM_TIERS[1] },
  { modeId: 'tag:travel:建筑巡礼', captain: { name: '陈子航', avatarUrl: 'https://i.pravatar.cc/100?img=12' }, plan: MILEAGE_TEAM_TIERS[2] },
  { modeId: 'midday', captain: { name: '周念' }, plan: MILEAGE_TEAM_TIERS[0] },
  { modeId: 'tag:time:30 分钟', captain: { name: '江一帆' }, plan: MILEAGE_TEAM_TIERS[1] },
].flatMap(({ modeId, captain, plan }) => {
  const target = resolveMileageTarget('mode', modeId);
  return target ? [{ id: `preview-lobby-${modeId}`, target, captain, plan }] : [];
});

function startTeam(team: MileageTeam, partner: MileageTeam['members'][number], now: number) {
  team.members.push(partner);
  team.status = 'active';
  team.startedAt = now;
}

export function mileageSnapshot(data: MileageDatabase, user: string): MileageSnapshot {
  const history = data.teams.filter(team => !!team.startedAt && includes(team, user) && (team.status === 'complete' || team.status === 'closed')).reverse();
  return {
    self: user,
    current: openTeam(data, user) ?? history.find(team => team.status === 'complete'),
    lobby: data.teams.filter(team => team.status === 'waiting' && !includes(team, user))
      .map(team => ({ id: team.id, target: team.target, captain: team.members[0].name, plan: mileageTeamPlan(team) })),
    previewLobby: previewLobby.map(({ id, target, captain, plan }) => ({ id, target, captain: captain.name, plan })),
    history,
    grants: history.flatMap(team => {
      const at = team.members.find(item => item.id === user)?.claimedAt;
      return at === undefined ? [] : [{ teamId: team.id, at, targetName: team.target.name, coins: mileageTeamPlan(team).rewardCoins }];
    }),
  };
}

function newTeam(data: MileageDatabase, target: MileageTeam['target'], plan: MileageTeamPlan, members: MemberIdentity[], now: number) {
  const joined = members.length === 2;
  const team: TeamRecord = {
    id: randomUUID(), target, plan,
    members: members.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl, meters: 0 })),
    status: joined ? 'active' : 'waiting',
    createdAt: now, ...(joined ? { startedAt: now } : {}),
  };
  data.teams.push(team);
  return team;
}

export function applyMileageCommand(data: MileageDatabase, user: string, command: MileageCommand, now: number) {
  if (command.action === 'create') {
    if (openTeam(data, user)) throw new MileageError('你已有一支小队');
    const target = resolveMileageTarget(command.target?.kind, command.target?.id);
    if (!target) throw new MileageError('请选择有可跑路线的目标', 400);
    const plan = MILEAGE_TEAM_TIERS.find(tier => tier.goalMeters === command.goalMeters);
    if (!plan) throw new MileageError('请选择 2、4 或 6 公里', 400);
    newTeam(data, target, plan, [member(user)], now);
    return;
  }

  const team = 'teamId' in command ? data.teams.find(item => item.id === command.teamId) : undefined;
  if (command.action === 'join') {
    if (team && includes(team, user) && team.status === 'active') return;
    const offer = !team && previewLobby.find(item => item.id === command.teamId);
    if (offer) {
      const current = openTeam(data, user);
      if (current?.previewOfferId === offer.id) return;
      if (current) throw new MileageError('你已有一支小队');
      const captain = { id: `preview-${randomUUID()}`, ...offer.captain };
      newTeam(data, offer.target, offer.plan, [captain, member(user)], now).previewOfferId = offer.id;
      return;
    }
    if (!team || team.status === 'closed') throw new MileageError('小队已取消');
    if (team.status !== 'waiting') throw new MileageError('小队已满');
    if (openTeam(data, user)) throw new MileageError('你已有一支小队');
    startTeam(team, member(user), now);
    return;
  }

  if (command.action === 'finish') {
    if (typeof command.runId !== 'string' || !Object.hasOwn(data.workouts, command.runId)) throw new MileageError('这次运动未加入小队');
    const run = data.workouts[command.runId];
    if (run.userId !== user) throw new MileageError('这次运动未加入小队');
    if (run.finished) return;
    const current = data.teams.find(item => item.id === run.teamId);
    if (!current || current.status !== 'active') throw new MileageError('这轮活动已结束');
    const elapsedLimit = Math.floor((now - run.startedAt + 1500) / 1000) * MILEAGE_METERS_PER_SECOND;
    if (!Number.isSafeInteger(command.meters) || command.meters <= 0 || command.meters > Math.min(run.limit, elapsedLimit)) {
      throw new MileageError('有效里程无法核验', 400);
    }
    const runner = current.members.find(item => item.id === user)!;
    runner.meters += command.meters;
    run.finished = true;
    if (isMileageGoalMet(current)) current.status = 'complete';
    return;
  }

  const runner = team?.members.find(item => item.id === user);
  if (!team || !runner) throw new MileageError('小队不存在或你尚未加入');

  switch (command.action) {
    case 'simulatePartner': {
      if (team.members[0].id !== user) throw new MileageError('只有队长可以模拟队友加入', 403);
      if (team.status === 'active' && team.members.some(item => isPreviewMileageMember(item.id))) return;
      if (team.status !== 'waiting' || team.members.length !== 1) throw new MileageError('小队已满或已结束');
      startTeam(team, { id: `preview-${team.id}`, ...MILEAGE_PREVIEW_PARTNER, meters: 0 }, now);
      return;
    }
    case 'simulateMileage': {
      const partner = team.members.find(item => item.id !== user && isPreviewMileageMember(item.id));
      if (!partner) throw new MileageError('当前小队不支持模拟贡献', 403);
      const ownContribution = command.member === 'self';
      const contributor = ownContribution ? runner : partner;
      const contribution = ownContribution ? MILEAGE_MEMBER_GOAL : mileageTeamPlan(team).goalMeters - MILEAGE_MEMBER_GOAL;
      if (contributor.meters >= contribution && team.status !== 'closed') return;
      if (team.status !== 'active') throw new MileageError('当前小队未在进行中');
      contributor.meters = contribution;
      if (isMileageGoalMet(team)) team.status = 'complete';
      return;
    }
    case 'leave':
      if (team.status === 'closed') return;
      if (team.status !== 'waiting' && team.status !== 'active') throw new MileageError('本轮已达标，可在组队记录领取奖励');
      team.status = 'closed';
      return;
    case 'claim':
      if (team.status !== 'complete') throw new MileageError('小队尚未达标');
      runner.claimedAt ??= now;
      return;
    case 'start': {
      if (team.status !== 'active') throw new MileageError('等小队满员后再开跑');
      const route = command.route;
      if (!route || typeof route.routeId !== 'string' || typeof route.cityId !== 'string'
        || (route.modeId !== undefined && typeof route.modeId !== 'string') || !matchesMileageTarget(team.target, route)) {
        throw new MileageError('这条路线不在小队目标内', 400);
      }
      const known = resolveMileageRun(team.target.kind === 'city' ? { cityId:route.cityId, routeId:route.routeId } : route);
      if (!known) throw new MileageError('这条路线暂不可参加', 400);
      if (typeof command.runId !== 'string' || !/^[a-f0-9-]{36}$/i.test(command.runId)) throw new MileageError('运动记录无效', 400);
      const previous = data.workouts[command.runId];
      if (previous) {
        if (previous.teamId !== team.id || previous.userId !== user) throw new MileageError('此运动已计入其他小队');
        return;
      }
      data.workouts[command.runId] = { teamId: team.id, userId: user, startedAt: now, limit: Math.round(known.distanceKm * 1000) };
      return;
    }
    default: throw new MileageError('活动操作无效', 400);
  }
}
