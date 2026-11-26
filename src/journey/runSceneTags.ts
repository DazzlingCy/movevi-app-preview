import { getSceneContentRoute, RUN_SCENES, type RunScene, type RunSceneMode, type SceneContent } from './runScenes';

// MOVE VI 全球实境跑内容标签体系与 APP 场景化推荐方案，第三节。
const TAG_GROUPS = [
  {
    id: 'time', label: '时间与可用时长',
    tags: ['5 分钟', '10 分钟', '15 分钟', '20 分钟', '30 分钟', '45 分钟', '60 分钟',
      '清晨', '午间', '下班后', '晚间', '睡前', '周末', '碎片时间', '长时间运动'],
  },
  {
    id: 'mood', label: '情绪与心理状态',
    tags: ['心情不错', '压力有点大', '有点无聊', '想安静一下', '想放空', '有点疲惫', '需要重启状态',
      '想找回动力', '想独处', '想换换心情', '想获得新鲜感', '想被鼓励', '想沉浸其中', '想暂时离开工作',
      '想给自己一点时间', '想轻松开始', '想挑战自己', '想奖励自己'],
  },
  {
    id: 'purpose', label: '运动目的',
    tags: ['日常健康运动', '轻松有氧', '提升体能', '增强耐力', '提升心肺能力', '体重管理', '建立运动习惯',
      '恢复运动状态', '补充日常活动量', '改善久坐状态', '运动热身', '运动恢复', '提升跑步能力',
      '维持运动状态', '完成每日目标', '阶段性训练', '放松身心', '低冲击运动'],
  },
  {
    id: 'intensity', label: '运动强度与体感',
    tags: ['几乎不费力', '轻松舒适', '微微出汗', '明显出汗', '有一定挑战', '高强度', '低强度', '中等强度',
      '间歇强度', '循序渐进', '稳定配速', '短时冲刺', '恢复节奏', '适合新手', '进阶挑战'],
  },
  {
    id: 'training', label: '训练类型与结构',
    tags: ['自由跑', '轻松跑', '节奏跑', '间歇跑', '变速跑', '渐进跑', '稳定配速跑', '耐力跑', '长距离训练',
      '热身', '放松跑', '恢复跑', '坡度训练', '跑走结合', '快走', '慢走', '短时挑战', '分段训练', '跟练课程', 'AI 训练'],
  },
  {
    id: 'environment', label: '自然环境与地貌',
    tags: ['海滩', '海岸线', '海岛', '森林', '山脉', '山谷', '湖泊', '河流', '瀑布', '乡村', '草原', '沙漠',
      '峡谷', '公园绿道', '花海', '雪景', '火山地貌', '自然保护区'],
  },
  {
    id: 'city', label: '城市风格与地域气质',
    tags: ['国际大都市', '欧洲浪漫小镇', '历史古城', '传统街区', '现代科技城市', '海滨度假城市', '艺术设计之城',
      '购物街区', '大学城', '工业城市', '山城', '港口城市', '小镇慢生活', '文化名城', '建筑之城', '夜生活城市',
      '东方城市', '地中海风情'],
  },
  {
    id: 'discovery', label: '城市探索与发现内容',
    tags: ['城市地标', '隐藏街巷', '历史建筑', '当地生活', '街头艺术', '特色市场', '桥梁与河岸', '广场与街道',
      '电影取景地', '美食街区', '博物馆周边', '宗教建筑', '特色社区', '城市故事', '建筑细节', '当地文化',
      '特色交通', '城市冷知识', '必看景点', '非热门目的地'],
  },
  {
    id: 'visual', label: '画面氛围与视觉风格',
    tags: ['治愈系', '电影感', '浪漫', '霓虹夜景', '复古', '阳光明媚', '阴雨氛围', '慢生活', '清新自然', '热闹繁华',
      '安静空旷', '壮阔开阔', '神秘感', '色彩鲜明', '温暖', '极简', '梦幻', '真实烟火气', '沉浸感', '探索感'],
  },
  {
    id: 'fitness', label: '用户运动基础与状态',
    tags: ['运动新手', '久坐人群', '重新开始运动', '可轻松运动 10 分钟', '可轻松运动 20 分钟', '可轻松运动 30 分钟',
      '已有跑步习惯', '耐力基础较好', '希望提升速度', '希望提升耐力', '偏好步行', '偏好慢跑', '偏好跑走结合',
      '希望循序渐进'],
  },
  {
    id: 'companionship', label: '陪伴方式与互动',
    tags: ['独自运动', 'AI 教练陪伴', 'AI 旅行向导', '朋友一起', '家人一起', '情侣一起', '全球用户共同挑战',
      '故事讲解', '语音鼓励', '音乐陪伴', '自然声音陪伴', '城市声音陪伴', '安静无讲解', '互动挑战'],
  },
  {
    id: 'travel', label: '旅行主题与目的地',
    tags: ['巴黎漫游', '欧洲城市', '日本城市', '东南亚探索', '美国城市', '美国公路与街景', '地中海沿岸',
      '世界经典城市', '小众目的地', '世界海岸线', '环球城市之旅', '建筑巡礼', '世界名校周边', '世界历史街区',
      '世界夜景', '世界公园', '岛屿探索', '一城一故事', '百城打卡', '365 天探索世界'],
  },
  {
    id: 'challenge', label: '挑战与游戏化玩法',
    tags: ['路线通关', '1 公里目标', '3 公里目标', '5 公里目标', '10 公里目标', '城市解锁', '国家解锁',
      '洲际探索', '连续 7 天', '每周挑战', '地标收集', '城市徽章', '路线收藏', '探索进度', '个人纪录',
      '好友挑战', '主题挑战', '新路线尝鲜', '月度探索目标', '年度探索计划'],
  },
  {
    id: 'weather', label: '天气与季节',
    tags: ['春日花开', '夏日海风', '秋日落叶', '冬日雪景', '雨中城市', '雨后街道', '薄雾清晨', '晴朗午后',
      '日出时分', '日落时分', '蓝调时刻', '夜空星光', '四季常青', '樱花季', '红叶季', '圣诞氛围', '节庆街景', '热带雨林'],
  },
  {
    id: 'audio', label: '音乐与声音',
    tags: ['流行音乐', '电子音乐', '摇滚', '古典音乐', '轻音乐', '爵士', '节奏鼓点', '自然环境声', '海浪声',
      '森林鸟鸣', '城市环境声', '雨声', '无音乐', '播客', '城市历史讲解', 'AI 鼓励语音', '路线导览'],
  },
  {
    id: 'equipment', label: '特殊运动模式与设备能力',
    tags: ['跑步', '快走', '慢走', '跑走结合', '后退走', '震动模式', '低冲击运动', '坡度训练', '室内步行',
      '轻量活动', '扶手辅助', '设备联动训练', '无屏投屏体验', '短时活动', '舒缓活动'],
  },
  {
    id: 'lifestyle', label: '生活场景',
    tags: ['久坐工作后', '居家办公间隙', '出差旅行期间', '下班回家后', '周末居家', '天气不好不想出门',
      '冬季室内运动', '夏季避暑运动', '每天 20 分钟', '早起活动身体', '午间休息', '晚饭后活动',
      '看电视时运动', '碎片时间活动', '家庭共同运动'],
  },
  {
    id: 'personalization', label: 'AI 个性化推荐',
    tags: ['AI 安排 20 分钟', '根据心情推荐', '根据运动记录推荐', '推荐未体验城市', '根据喜欢的风景推荐',
      '推荐新路线', '每周运动计划', '随机探索目的地', '根据可用时间推荐', '根据强度偏好推荐',
      '根据完成情况调整', '继续上次探索', '发现相似路线', '避开重复内容', '今日专属路线'],
  },
] as const;

type TagGroup = typeof TAG_GROUPS[number];
export type RunSceneTagKey = {
  [Group in TagGroup as Group['id']]: `${Group['id']}:${Group['tags'][number]}`;
}[TagGroup['id']];

const SHORT_LABELS: Partial<Record<RunSceneTagKey, string>> = {
  'mood:想暂时离开工作': '暂别工作',
  'mood:想给自己一点时间': '给自己时间',
  'purpose:补充日常活动量': '增加活动量',
  'fitness:可轻松运动 10 分钟': '轻松10分钟',
  'fitness:可轻松运动 20 分钟': '轻松20分钟',
  'fitness:可轻松运动 30 分钟': '轻松30分钟',
  'companionship:AI 教练陪伴': 'AI教练',
  'companionship:AI 旅行向导': 'AI向导',
  'companionship:全球用户共同挑战': '全球挑战',
  'travel:美国公路与街景': '美国公路街景',
  'travel:365 天探索世界': '365天探索',
  'challenge:10 公里目标': '10公里目标',
  'audio:AI 鼓励语音': 'AI语音鼓励',
  'lifestyle:天气不好不想出门': '天气差不出门',
  'lifestyle:每天 20 分钟': '每天20分钟',
  'personalization:AI 安排 20 分钟': 'AI练20分',
  'personalization:根据运动记录推荐': '运动记录推荐',
  'personalization:推荐未体验城市': '未去过的城市',
  'personalization:根据喜欢的风景推荐': '风景偏好推荐',
  'personalization:随机探索目的地': '随机选目的地',
  'personalization:根据可用时间推荐': '按时长推荐',
  'personalization:根据强度偏好推荐': '按强度推荐',
  'personalization:根据完成情况调整': '按完成度调整',
};

const SCENE_IDS: Partial<Record<RunSceneTagKey, RunScene['id']>> = {
  'time:午间': 'midday',
  'environment:海滩': 'beach',
  'environment:森林': 'forest',
  'travel:建筑巡礼': 'architecture',
  'lifestyle:午间休息': 'midday',
};

// 仅为现有场景路线补充可从地点、地标和路线简介确认的标签。
const ROUTE_IDS: Partial<Record<RunSceneTagKey, readonly string[]>> = {
  'environment:海岸线': ['beach-miami', 'beach-bali'],
  'environment:海岛': ['beach-bali'],
  'environment:公园绿道': ['forest-philadelphia'],
  'city:历史古城': ['break-florence', 'break-kyoto'],
  'city:传统街区': ['break-kyoto'],
  'city:港口城市': ['sydney-route-1'],
  'discovery:城市地标': ['sydney-route-1', 'cairo-route-1', 'architecture-abu-dhabi', 'paris-route-3', 'singapore-route-8'],
  'discovery:历史建筑': ['cairo-route-1', 'paris-route-3'],
  'discovery:广场与街道': ['architecture-abu-dhabi', 'break-florence', 'break-buenos-aires', 'break-kyoto'],
  'discovery:宗教建筑': ['paris-route-3'],
  'discovery:建筑细节': ['architecture-abu-dhabi'],
  'travel:巴黎漫游': ['paris-route-3'],
  'travel:欧洲城市': ['forest-podgorica', 'paris-route-3', 'break-florence'],
  'travel:日本城市': ['break-kyoto'],
  'travel:东南亚探索': ['beach-bali', 'singapore-route-8'],
  'travel:美国城市': ['beach-miami', 'forest-philadelphia'],
  'travel:岛屿探索': ['beach-bali'],
};

const sceneRoutes = RUN_SCENES.flatMap(scene => scene.entries.flatMap(entry => {
  const route = getSceneContentRoute(entry);
  return route ? [{ scene, entry, route }] : [];
}));

const previewPool = sceneRoutes.flatMap(({ scene, entry }) =>
  'cityId' in entry ? [] : [{ entry, backdropHue: entry.backdropHue ?? scene.backdropHue }],
);

type PreviewChoice = Pick<RunSceneMode, 'id' | 'label'>;
export type RunSceneChoice = RunSceneMode | PreviewChoice;

export function chooseRunScenePreview(choice: PreviewChoice, previousLeadImage?: string): RunSceneMode | null {
  const previousLead = previewPool.find(({ entry }) => entry.image === previousLeadImage);
  const freshLeads = previewPool.filter(({ entry }) => entry.image !== previousLeadImage);
  const contrastingLeads = previousLead ? freshLeads.filter(({ backdropHue }) => {
    const distance = Math.abs(backdropHue - previousLead.backdropHue);
    return Math.min(distance, 360 - distance) >= 60;
  }) : freshLeads;
  const leads = contrastingLeads.length ? contrastingLeads : freshLeads;
  const first = leads[Math.floor(Math.random() * leads.length)] ?? previewPool[0];
  if (!first) return null;

  const remaining = previewPool.filter(({ entry }) => entry.image !== first.entry.image).map(({ entry }) => entry);
  const entries: [SceneContent, ...SceneContent[]] = [first.entry];
  while (entries.length < 4 && remaining.length > 0) {
    const index = Math.floor(Math.random() * remaining.length);
    entries.push(...remaining.splice(index, 1));
  }

  return { ...choice, backdropHue: first.backdropHue, entries };
}

function getTagMode(key: RunSceneTagKey, label: string, durationMinutes?: number): RunSceneChoice {
  const sceneId = SCENE_IDS[key];
  const routeIds = ROUTE_IDS[key];
  const [first, ...rest] = sceneRoutes.filter(({ scene, route }) =>
    scene.id === sceneId || routeIds?.includes(route.id) || route.durationMinutes === durationMinutes,
  );
  if (!first) return { id: `tag:${key}`, label };
  if (label === first.scene.label && 1 + rest.length === first.scene.entries.length) return first.scene;

  return {
    id: `tag:${key}`,
    label,
    backdropHue: first.scene.backdropHue,
    entries: [first.entry, ...rest.map(({ entry }) => entry)],
  };
}

export const RUN_SCENE_TAG_GROUPS = TAG_GROUPS.map(group => ({
  id: group.id,
  label: group.label,
  tags: group.tags.map(sourceLabel => {
    const key = `${group.id}:${sourceLabel}` as RunSceneTagKey;
    const duration = group.id === 'time' ? sourceLabel.match(/^(\d+) 分钟$/) : null;
    const label = SHORT_LABELS[key] ?? sourceLabel;
    return { key, label, mode: getTagMode(key, label, duration ? Number(duration[1]) : undefined) };
  }),
}));

export const RUN_SCENE_SIDEBAR_TAGS = ([
  { key: 'purpose:改善久坐状态', label: '改善久坐' },
  { key: 'lifestyle:周末居家', label: '周末居家' },
  { key: 'training:坡度训练', label: '坡度训练' },
] satisfies { key: RunSceneTagKey; label: string }[]).map(tag => ({
  ...tag,
  mode: getTagMode(tag.key, tag.label),
}));
