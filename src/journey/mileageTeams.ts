export const MILEAGE_TEAM_NAME = '跑步搭子';
export const MILEAGE_MEMBER_GOAL = 1000;
export const MILEAGE_METERS_PER_SECOND = 3;
export const MILEAGE_TEAM_TIERS = [
  { goalMeters: 2000, rewardCoins: 100 },
  { goalMeters: 4000, rewardCoins: 200 },
  { goalMeters: 6000, rewardCoins: 300 },
] as const;
export const LEGACY_MILEAGE_TEAM_PLAN = { goalMeters: 6000, rewardCoins: 180 };
export type MileageTeamPlan = { goalMeters: number; rewardCoins: number };
export type MileageGoal = typeof MILEAGE_TEAM_TIERS[number]['goalMeters'];
export const mileageTeamPlan = (team: { plan?: MileageTeamPlan }) => team.plan ?? LEGACY_MILEAGE_TEAM_PLAN;
export const isMileageTeamReward = (coins: unknown) => coins === LEGACY_MILEAGE_TEAM_PLAN.rewardCoins
  || MILEAGE_TEAM_TIERS.some(tier => tier.rewardCoins === coins);
export const MILEAGE_PREVIEW_PARTNER = { name: '林小满', avatarUrl: 'https://i.pravatar.cc/100?img=11' };
export const isPreviewMileageMember = (id: string) => id.startsWith('preview-');

export type MileageTarget = { kind: 'mode' | 'city'; id: string; name: string };
export type MileageRunRoute = { cityId: string; routeId: string; modeId?: string };
export type MileageMember = { id: string; name: string; avatarUrl?: string; meters: number; claimedAt?: number };
export type MileageTeam = {
  id: string; target: MileageTarget; members: MileageMember[]; status: 'waiting' | 'active' | 'complete' | 'closed';
  createdAt: number; startedAt?: number; plan?: MileageTeamPlan;
};
export type MileageLobbyTeam = { id: string; target: MileageTarget; captain: string; plan: MileageTeamPlan };
export type MileageGrant = { teamId: string; at: number; targetName: string; coins?: number };
export type MileageSnapshot = {
  self: string; current?: MileageTeam; lobby: MileageLobbyTeam[]; previewLobby: MileageLobbyTeam[];
  history: MileageTeam[]; grants: MileageGrant[];
};
export type MileageCommand =
  | { action: 'create'; target: Pick<MileageTarget, 'kind' | 'id'>; goalMeters: MileageGoal }
  | { action: 'join' | 'simulatePartner' | 'leave' | 'claim'; teamId: string }
  | { action: 'simulateMileage'; teamId: string; member?: 'self' | 'partner' }
  | { action: 'start'; teamId: string; runId: string; route: MileageRunRoute }
  | { action: 'finish'; runId: string; meters: number };

export const totalTeamMeters = (team: MileageTeam) => team.members.reduce((sum, member) => sum + member.meters, 0);
export const isMileageGoalMet = (team: MileageTeam) => team.members.length === 2
  && totalTeamMeters(team) >= mileageTeamPlan(team).goalMeters
  && team.members.every(member => member.meters >= MILEAGE_MEMBER_GOAL);

export const matchesMileageTarget = (target: MileageTarget, route: MileageRunRoute) =>
  target.kind === 'city' ? target.id === route.cityId : target.id === route.modeId;

export function formatTeamKm(meters: number) {
  return (meters / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

export function mileageMemberShortfall(team: MileageTeam, self: string) {
  if (totalTeamMeters(team) < mileageTeamPlan(team).goalMeters) return;
  const member = team.members.find(person => person.meters < MILEAGE_MEMBER_GOAL);
  if (member) return `${member.id === self ? '你' : '队友'}还差 ${formatTeamKm(MILEAGE_MEMBER_GOAL - member.meters)} km`;
}

export const mileageGrantId = (teamId: string) => `mileage-team-reward:${teamId}`;
