import { getRouteCategory } from '../data/routeCategories';
import { getJourneyCity, hasPublishedCityRoutes } from './data';
import { getRouteStatus } from './state';
import type { DailyRouteRecommendation } from './routeRecommendations';
import type { JourneyState } from './types';

type RouteProfile = keyof typeof profiles;
type SceneBackdrop = readonly [city: string, routeOrder: number] | 'treadmill';

export interface RunScene {
  label: string;
  backdrop: SceneBackdrop;
  backdropHue: number;
  profile: RouteProfile;
  targetMinutes: number;
  speedPlan: string;
  music: string;
  scenery: string;
}

const profiles = {
  short: { distance: 3, landmarks: /公园|绿道|街区|步道/ },
  easy: { distance: 4, nature: true },
  steady: { distance: 5.5 },
  steadyStreet: { distance: 5.5, landmarks: /大道|校园|大学|滨江|河岸|绿道/ },
  longWater: { distance: 8, landmarks: /绿道|江|河|海|湾|湖|滨水|水岸/ },
  water: { distance: 4, nature: true, landmarks: /江|河|海|湾|湖|滨水|水岸/ },
  river: { distance: 5, landmarks: /江|河|滨水|水岸|运河|溪/ },
  park: { distance: 4, nature: true, landmarks: /公园|花园|林|绿地|植物园/ },
  lake: { distance: 5, nature: true, landmarks: /湖|池|水库/ },
  trail: { distance: 5, nature: true, landmarks: /山|步道|林|森林/ },
  coast: { distance: 5, nature: true, landmarks: /海|湾|滩|港/ },
  track: { distance: 4, landmarks: /操场|体育|运动场|校园|大学/ },
  street: { distance: 5, landmarks: /街|大道|巷|市集|广场/ },
  landmark: { distance: 5, landmarks: /广场|地标|大道|塔|天际|大桥/ },
  heritage: { distance: 4, landmarks: /古镇|老城|寺|宫|城墙|旧城|古城/ },
} satisfies Record<string, { distance: number; nature?: boolean; landmarks?: RegExp }>;

type SceneEntry<Symbol extends string> = [
  label: string, profile: RouteProfile, symbol: Symbol, targetMinutes: number, speedPlan: string, music: string, scenery: string, backdrop: SceneBackdrop, backdropHue: number,
];

const group = <Id extends string, Symbol extends string>(id: Id, title: string, entries: SceneEntry<Symbol>[]) => ({
  id, title, scenes: entries.map(([label, profile, symbol, targetMinutes, speedPlan, music, scenery, backdrop, backdropHue]) => ({
    label, profile, symbol, targetMinutes, speedPlan, music, scenery, backdrop, backdropHue,
  })),
});

export const CITY_CARD_MODE_LABEL = '城市卡片';

export const QUICK_RUN_SCENES = group('quick', '常用场景', [
    ['轻松慢跑', 'easy', 'steps', 10, '慢速（4–6 km/h）', '原声吉他、轻器乐', '公园、绿道、湖岸', ['上海', 4], 165],
    ['燃脂快跑', 'coast', 'flame', 15, '快速（6–8 km/h）', '动感电子、轻摇滚（选曲参考120–140 BPM）', '滨江、海岸、开阔城市景观', ['洛杉矶', 10], 15],
]).scenes;

export const RUN_SCENE_GROUPS = [
  group('time', '时段场景', [
    ['清晨轻松跑', 'park', 'morning', 10, '慢速（4–6 km/h）', '轻钢琴、清新原声', '明亮街区、公园晨景', ['伦敦', 3], 142],
    ['日出追光跑', 'water', 'sunrise', 10, '慢速（4–6 km/h）', '明亮器乐、轻电子', '日出海岸、滨江或湖岸（AI制作）', ['曼谷', 10], 39],
    ['晨间唤醒短跑', 'short', 'alarm', 10, '慢速（4–6 km/h）', '轻快原声、清新器乐', '晨光公园、街区短路线', ['东京', 4], 49],
    ['午休抽空跑', 'short', 'sun', 10, '稳速（4–7 km/h）', '简洁节奏器乐', '景点集中的短街区、公园路线', ['巴黎', 4], 53],
    ['黄昏落日慢跑', 'coast', 'sunset', 10, '慢速（4–6 km/h）', 'Chill、柔和电子', '落日海岸、黄昏滨江（AI制作）', ['悉尼', 8], 25],
    ['放松夜跑', 'water', 'moon', 10, '慢速（4–6 km/h）', '夜间Lo-fi、柔和器乐', '城市灯光、夜间滨水路线（AI制作）', ['孟买', 10], 226],
    ['深夜安静慢跑', 'street', 'night', 10, '慢速（3–5 km/h）', '无音乐默认；可选氛围音乐', '曝光清晰、闪烁较少的深夜街区（AI制作）', ['罗马', 6], 249],
    ['早起活力跑', 'street', 'flame', 10, '中速（5–7 km/h）', '明亮流行器乐、轻电子', '晨间城市大道、滨水街区', ['上海', 2], 32],
    ['周末晨间长跑', 'longWater', 'weekend', 20, '中速（5–7 km/h）', '旅行器乐、连续轻电子歌单', '较长的晨间河岸、绿道路线', ['北京', 4], 154],
  ]),
  group('outdoors', '户外环境', [
    ['城市滨江跑', 'river', 'river', 15, '稳速（4–7 km/h）', '城市氛围、轻电子', '真实城市江岸、桥梁、滨水地标', ['杭州', 7], 192],
    ['公园林荫慢跑', 'park', 'trees', 10, '慢速（4–6 km/h）', '原声吉他、自然感器乐', '公园、树荫步道、绿道', ['新加坡', 4], 123],
    ['环湖慢跑', 'lake', 'lake', 10, '慢速（4–6 km/h）', '柔和钢琴、舒缓器乐', '真实环湖路线；素材不足时改称湖畔慢跑', ['杭州', 3], 184],
    ['林间探索跑', 'trail', 'mountain', 10, '慢速（4–6 km/h）', '自然氛围、轻器乐', '稳定前进的林间路线，不模拟地形阻力', ['洛杉矶', 4], 112],
    ['海边迎风慢跑', 'coast', 'wind', 15, '慢速（4–6 km/h）', 'Chill、轻吉他', '真实海岸栈道、海滨大道', ['悉尼', 6], 201],
    ['校园操场圈跑', 'track', 'track', 10, '稳速（4–7 km/h）', '稳定节奏器乐', '实际拍摄的校园操场或跑道路线', ['柏林', 9], 359],
    ['城市街头跑', 'street', 'city', 10, '中速（5–7 km/h）', '轻电子、都市流行器乐', '城市街道、广场、特色街区', ['纽约', 6], 268],
    ['城市观景慢跑', 'landmark', 'city', 10, '慢速（4–6 km/h）', '轻钢琴、柔和原声', '城市地标、广场、开阔街道', ['纽约', 10], 208],
    ['人文街区慢跑', 'heritage', 'heritage', 10, '慢速（4–6 km/h）', '轻吉他、轻快器乐', '特色街巷、历史建筑、生活街景', ['巴黎', 5], 42],
    ['江边晚风慢跑', 'river', 'wind', 15, '慢速（4–6 km/h）', 'Lo-fi、Chill', '傍晚江岸、晚霞滨水路线（AI制作）', ['伦敦', 8], 206],
    ['山间步道慢跑', 'trail', 'trail', 10, '慢速（4–6 km/h）', '自然氛围、无歌词器乐', '稳定的山间步道实景，不承诺坡度同步', ['杭州', 9], 135],
    ['古镇漫游跑', 'heritage', 'heritage', 10, '慢速（3–5 km/h）', '轻器乐、适合当地氛围的音乐', '古镇街巷、石桥、历史建筑', ['迪拜', 5], 34],
  ]),
  group('indoors', '室内场景', [
    ['居家跑步机', 'easy', 'home', 10, '用户自定义（参考4–6 km/h）', '用户常听歌单；默认轻器乐', '当前城市、公园、滨水均可选择', 'treadmill', 274],
    ['健身房间歇跑', 'steadyStreet', 'interval', 15, '快慢交替（慢速、快速档由用户设置）', '按阶段匹配稳定/活力音乐', '连续、画面稳定的城市大道或绿道', ['新加坡', 10], 304],
    ['雨天跑步机', 'park', 'rain', 10, '慢速（4–6 km/h）', '明亮轻快器乐', '默认晴天城市、公园；不要求视频也下雨', ['曼谷', 4], 217],
    ['居家短时跑', 'short', 'steps', 10, '慢速（3–5 km/h）', '轻快原声、简洁器乐', '短公园路线、清晰明亮的街区', ['纽约', 3], 47],
    ['健身房稳速跑', 'steadyStreet', 'pulse', 15, '中速（5–7 km/h）', '稳定节奏电子、流行器乐', '都市大道、连续河岸路线', ['上海', 8], 285],
    ['冬季室内长跑', 'longWater', 'snow', 20, '中速（5–7 km/h）', '连续旅行器乐、轻电子歌单', '较长的城市、海岸、绿道素材；不必是雪景', ['多伦多', 10], 211],
  ]),
  group('training', '配速与训练', [
    ['城市变速跑', 'steadyStreet', 'speed', 15, '快慢交替（慢速、快速档由用户设置）', '按阶段匹配节奏音乐', '连续城市路线，需具备变速标定', ['北京', 9], 4],
    ['耐力长跑', 'longWater', 'distance', 20, '中速（5–7 km/h）', '稳定节奏、少突变长歌单', '较长的绿道、河岸或海岸连续路线', ['纽约', 2], 176],
    ['稳速节奏跑', 'steadyStreet', 'pace', 15, '稳速（5–8 km/h）', '节奏稳定的电子、流行器乐', '都市大道、滨水、校园路线', ['巴黎', 9], 232],
    ['舒缓走跑', 'park', 'pulse', 10, '慢速（3–5 km/h）', '舒缓器乐；可无音乐', '平稳的公园、湖岸实景', ['洛杉矶', 5], 153],
    ['轻松起步跑', 'short', 'steps', 5, '慢速（3–5 km/h）', '柔和轻快器乐', '明亮短街区、公园步道', ['罗马', 4], 56],
    ['舒缓收尾跑', 'park', 'wind', 5, '慢速（3–5 km/h）', '柔和钢琴、安静氛围音乐', '平静湖岸、公园、黄昏步道', ['杭州', 2], 292],
    ['城市地标打卡跑', 'landmark', 'target', 20, '中速（5–7 km/h）', '稳定节奏、活力器乐', '城市地标、广场、特色建筑串联路线', ['悉尼', 1], 19],
    ['滨水巡游跑', 'longWater', 'river', 20, '中速（5–8 km/h）', '长时稳定节奏歌单', '画面稳定、节奏连贯的江岸或湖畔步道', ['开罗', 2], 190],
    ['长距离探索跑', 'longWater', 'distance', 20, '中速（5–7 km/h）', '长时旅行器乐、轻电子', '可持续播放的长城市或滨水路线', ['多伦多', 9], 172],
  ]),
  group('mood', '情绪与心态', [
    ['放空漫游跑', 'water', 'clear', 10, '慢速（3–5 km/h）', '氛围音乐、柔和器乐', '开阔海岸、安静湖岸、公园', ['悉尼', 9], 182],
    ['开心畅快嗨跑', 'landmark', 'smile', 15, '快速（6–8 km/h）', '明亮电子、流行器乐', '繁华街区、都市地标、明亮滨水', ['纽约', 9], 319],
    ['轻松充电跑', 'park', 'battery', 10, '慢速（3–5 km/h）', '柔和原声、轻器乐', '较短的绿道、公园路线', ['里约热内卢', 4], 91],
    ['独处静心慢跑', 'lake', 'leaf', 10, '慢速（3–5 km/h）', '无歌词氛围音乐；可关闭', '安静林荫步道、湖岸', ['北京', 8], 149],
    ['活力解压跑', 'river', 'flame', 15, '中速（5–7 km/h）', '节奏鲜明的电子、轻摇滚器乐', '都市大道、滨江、开阔街区', ['新加坡', 2], 9],
    ['甩掉坏心情', 'coast', 'clear', 10, '慢速（4–6 km/h）', '轻快流行器乐、Chill', '明亮海岸、公园、开阔城市景观', ['里约热内卢', 9], 198],
    ['随心漫游慢跑', 'park', 'trail', 10, '慢速（3–5 km/h）', '无音乐默认；可选柔和器乐', '安静街区、林荫、湖岸', ['杭州', 6], 128],
  ]),
  group('company', '音乐与玩法', [
    ['独自耳机跑', 'steady', 'audio', 10, '用户自定义（参考4–7 km/h）', '用户自选歌单；默认轻电子', '城市、绿道、滨水任选', ['柏林', 2], 262],
    ['同景同行跑', 'steady', 'friends', 10, '用户自定义（参考4–6 km/h）', '各自选择；默认轻快器乐', '两人自行选择同一条已开放路线', ['洛杉矶', 9], 317],
    ['公园趣味跑', 'park', 'leaf', 10, '慢速（3–5 km/h）', '轻快原声、趣味器乐', '公园、花园、生活街景；不承诺宠物互动', ['悉尼', 4], 79],
    ['听播客慢跑', 'water', 'podcast', 10, '慢速（4–6 km/h）', '播客人声；背景音乐默认关闭', '平稳绿道、河岸等低干扰实景', ['伦敦', 9], 220],
  ]),
];

export function getSceneRoutes(scene: RunScene, state: JourneyState): DailyRouteRecommendation[] {
  const profile: { distance: number; nature?: boolean; landmarks?: RegExp } = profiles[scene.profile];
  const cities = [...new Set([state.currentCityId, ...state.completedCityIds])];
  const ranked = cities.filter(hasPublishedCityRoutes).flatMap(cityId => {
    const city = getJourneyCity(cityId);
    if (!city) return [];
    return city.routes.filter(route => getRouteStatus(state, cityId, route.id) !== 'locked').map(route => {
      let score = -Math.abs(route.distanceKm - profile.distance);
      score -= Math.abs(route.durationMinutes - scene.targetMinutes) / 12;
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
