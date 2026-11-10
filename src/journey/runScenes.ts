import { getRouteCategory } from '../data/routeCategories';
import { getJourneyCity, hasPublishedCityRoutes } from './data';
import { getRouteStatus } from './state';
import type { DailyRouteRecommendation } from './routeRecommendations';
import type { JourneyState } from './types';

type RouteProfile = keyof typeof profiles;

export interface RunScene {
  label: string;
  profile: RouteProfile;
}

const profiles = {
  short: { distance: 3, minutes: 25 },
  easy: { distance: 4, nature: true },
  steady: { distance: 5.5 },
  brisk: { distance: 4.5 },
  five: { distance: 5 },
  ten: { distance: 10 },
  long: { distance: 8 },
  river: { distance: 5, landmarks: /江|河|滨水|水岸|运河|溪/ },
  park: { distance: 4, nature: true, landmarks: /公园|花园|林|绿地|植物园/ },
  lake: { distance: 5, nature: true, landmarks: /湖|池|水库/ },
  trail: { distance: 5, nature: true, landmarks: /山|步道|林|森林/ },
  coast: { distance: 5, nature: true, landmarks: /海|湾|滩|港/ },
  track: { distance: 4, landmarks: /操场|体育|运动场|校园|大学/ },
  street: { distance: 5, landmarks: /街|大道|巷|市集|广场/ },
  heritage: { distance: 4, landmarks: /古镇|老城|寺|宫|城墙|旧城|古城/ },
} satisfies Record<string, { distance: number; minutes?: number; nature?: boolean; landmarks?: RegExp }>;

const group = <Id extends string, Symbol extends string>(id: Id, title: string, entries: [string, RouteProfile, Symbol][]) => ({
  id, title, scenes: entries.map(([label, profile, symbol]) => ({ label, profile, symbol })),
});

export const RUN_SCENE_GROUPS = [
  group('time', '时段场景', [
    ['清晨空腹慢跑', 'easy', 'morning'], ['日出追光跑', 'river', 'sunrise'], ['晨间唤醒短跑', 'short', 'alarm'],
    ['午休抽空跑', 'short', 'sun'], ['黄昏落日慢跑', 'coast', 'sunset'], ['放松夜跑', 'easy', 'moon'],
    ['深夜安静慢跑', 'easy', 'night'], ['早起燃脂跑', 'easy', 'flame'], ['周末晨间长跑', 'long', 'weekend'],
  ]),
  group('outdoors', '户外环境', [
    ['城市滨江跑', 'river', 'river'], ['公园林荫慢跑', 'park', 'trees'], ['环湖慢跑', 'lake', 'lake'],
    ['林间轻越野', 'trail', 'mountain'], ['海边迎风慢跑', 'coast', 'wind'], ['校园操场圈跑', 'track', 'track'],
    ['城市街头跑', 'street', 'city'], ['雨后清新慢跑', 'park', 'rain'], ['微风草坪慢跑', 'park', 'leaf'],
    ['江边晚风慢跑', 'river', 'wind'], ['山间步道慢跑', 'trail', 'trail'], ['古镇漫游跑', 'heritage', 'heritage'],
  ]),
  group('indoors', '室内与器械', [
    ['居家跑步机', 'easy', 'home'], ['健身房间歇跑', 'brisk', 'interval'], ['雨天跑步机', 'easy', 'rain'],
    ['阳台原地慢跑', 'short', 'steps'], ['健身房有氧跑', 'steady', 'pulse'], ['冬季室内长跑', 'long', 'snow'],
  ]),
  group('training', '配速与训练', [
    ['间歇冲刺跑', 'brisk', 'speed'], ['耐力长跑', 'long', 'distance'], ['稳速节奏跑', 'steady', 'pace'],
    ['低强度恢复跑', 'easy', 'pulse'], ['赛前热身慢跑', 'short', 'flame'], ['赛后放松慢跑', 'short', 'wind'],
    ['5公里冲刺', 'five', 'target'], ['10公里匀速', 'ten', 'finish'], ['马拉松备跑', 'long', 'trophy'],
  ]),
  group('mood', '情绪与心态', [
    ['放空治愈跑', 'park', 'clear'], ['开心畅快嗨跑', 'brisk', 'smile'], ['疲惫充电慢跑', 'short', 'battery'],
    ['独处静心慢跑', 'park', 'leaf'], ['解压暴汗跑', 'brisk', 'flame'], ['甩掉坏心情', 'easy', 'clear'],
    ['自我对话慢跑', 'easy', 'dialogue'], ['庆祝成就跑', 'steady', 'celebrate'],
  ]),
  group('company', '陪伴与玩法', [
    ['独自耳机跑', 'steady', 'audio'], ['好友结伴慢跑', 'easy', 'friends'], ['遛狗伴跑', 'park', 'pet'],
    ['听播客慢跑', 'long', 'podcast'],
  ]),
];

export const QUICK_RUN_SCENES: { hint: string; scene: RunScene }[] = [
  { hint: '按自己的节奏跑', scene: { label: '轻松慢跑', profile: 'easy' } },
  { hint: '跑一段，换换心情', scene: { label: '下班解压', profile: 'easy' } },
];

export function getSceneRoutes(scene: RunScene, state: JourneyState): DailyRouteRecommendation[] {
  const profile: { distance: number; minutes?: number; nature?: boolean; landmarks?: RegExp } = profiles[scene.profile];
  const cities = [...new Set([state.currentCityId, ...state.completedCityIds])];
  const ranked = cities.filter(hasPublishedCityRoutes).flatMap(cityId => {
    const city = getJourneyCity(cityId);
    if (!city) return [];
    return city.routes.filter(route => getRouteStatus(state, cityId, route.id) !== 'locked').map(route => {
      let score = -Math.abs(route.distanceKm - profile.distance);
      if (profile.minutes) score -= Math.abs(route.durationMinutes - profile.minutes) / 12;
      if (profile.nature && getRouteCategory(city.name, route.order) === '自然类') score += 1;
      if (profile.landmarks?.test(`${route.name} ${route.landmarks.join(' ')}`)) score += 6;
      if (cityId === state.currentCityId) score += .4;
      return { city, route, score };
    });
  }).sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const picks: DailyRouteRecommendation[] = [];
  for (const { city, route } of ranked) {
    if (seen.has(city.id)) continue;
    seen.add(city.id);
    picks.push({ city, route });
    if (picks.length === 5) break;
  }
  return picks;
}
