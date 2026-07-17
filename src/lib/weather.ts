import { useMemo } from 'react';
import type { CityData } from '../data/cities';

export type WeatherKind = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';
export type WeatherStatus = 'idle' | 'ready';

export interface WeatherSnapshot {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  precipitation: number;
  isDay: boolean;
  observedAt: string;
  fetchedAt: number;
  kind: WeatherKind;
  label: string;
}

export interface WeatherState {
  status: WeatherStatus;
  data: WeatherSnapshot | null;
}

export interface WeatherStory {
  short: string;
  full: string;
}

type WeatherPreset = {
  code: number;
  kind: WeatherKind;
  temperature: [number, number];
  windSpeed: [number, number];
  precipitation: [number, number];
};

const PREVIEW_WEATHER_PRESETS: WeatherPreset[] = [
  { code: 0, kind: 'clear', temperature: [18, 31], windSpeed: [3, 14], precipitation: [0, 0] },
  { code: 2, kind: 'cloudy', temperature: [14, 27], windSpeed: [4, 18], precipitation: [0, 0] },
  { code: 45, kind: 'fog', temperature: [8, 20], windSpeed: [1, 7], precipitation: [0, 0] },
  { code: 61, kind: 'rain', temperature: [12, 24], windSpeed: [6, 20], precipitation: [0.3, 4] },
  { code: 71, kind: 'snow', temperature: [-6, 3], windSpeed: [4, 16], precipitation: [0.1, 2] },
  { code: 95, kind: 'storm', temperature: [18, 29], windSpeed: [18, 40], precipitation: [3, 12] }
];

// A preview session keeps one weather scene per city so the UI does not change on re-render.
const previewWeatherByCity = new Map<string, WeatherSnapshot>();

export function getWeatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear';
  if ([1, 2, 3].includes(code)) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'rain';
}

export function getWeatherLabel(code: number): string {
  if (code === 0) return '晴';
  if (code === 1) return '晴间多云';
  if (code === 2) return '多云';
  if (code === 3) return '阴';
  if ([45, 48].includes(code)) return '有雾';
  if ([51, 53, 55, 56, 57].includes(code)) return '细雨';
  if ([61, 63, 66, 80, 81].includes(code)) return '有雨';
  if ([65, 67, 82].includes(code)) return '强降雨';
  if ([71, 73, 77, 85].includes(code)) return '有雪';
  if ([75, 86].includes(code)) return '大雪';
  if ([95, 96, 99].includes(code)) return '雷雨';
  return '天气变化中';
}

export function getWeatherStory(cityName: string, snapshot: WeatherSnapshot | null): WeatherStory {
  if (!snapshot) {
    return {
      short: `${cityName}此刻的天气还在路上`,
      full: `天气氛围正在生成，${cityName}仍在地图中等待你靠近。`
    };
  }

  const stories: Record<WeatherKind, WeatherStory> = {
    clear: snapshot.isDay
      ? {
          short: `晴光正落在${cityName}街巷，城市轮廓格外清晰`,
          full: `晴光正落在${cityName}的街巷与屋脊，熟悉的城市轮廓里，或许正藏着一段尚未点亮的记忆。`
        }
      : {
          short: `${cityName}的夜色正在亮起，另一面刚刚显影`,
          full: `夜色正在点亮${cityName}，白天忽略的街道与建筑轮廓，正慢慢显露出另一种城市表情。`
        },
    cloudy: {
      short: `云层压低了${cityName}天际线，一些细节被藏了起来`,
      full: `云层轻轻压低${cityName}的天际线，城市把一部分细节藏了起来，等待你沿着路线慢慢发现。`
    },
    fog: {
      short: `雾把${cityName}藏起一半，靠近才能看清`,
      full: `薄雾正穿过${cityName}，熟悉的地标只露出一半轮廓。越靠近，城市留下的线索才会越清晰。`
    },
    rain: {
      short: `雨正在擦亮${cityName}街道，另一种记忆开始浮现`,
      full: `雨水正在擦亮${cityName}的街道与灯影，平日被忽略的颜色和声音，正组成另一种城市记忆。`
    },
    snow: {
      short: `雪落在${cityName}的屋脊上，今天的城市有些不同`,
      full: `雪正在覆盖${cityName}的屋脊与街道，熟悉的路线变得安静而稀有，像一张只在今天出现的城市卡片。`
    },
    storm: {
      short: `雷雨掠过${cityName}，城市正在切换另一种表情`,
      full: `雷雨正从${cityName}上空掠过，明暗交替之间，城市正在显露一种短暂而少见的表情。`
    }
  };

  return stories[snapshot.kind];
}

export function formatWeatherTemperature(value: number): string {
  return `${Math.round(value)}°`;
}

function randomBetween(min: number, max: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round((min + Math.random() * (max - min)) * factor) / factor;
}

function createPreviewSnapshot(): WeatherSnapshot {
  const preset = PREVIEW_WEATHER_PRESETS[Math.floor(Math.random() * PREVIEW_WEATHER_PRESETS.length)];
  const temperature = randomBetween(...preset.temperature);
  const now = new Date();

  return {
    temperature,
    apparentTemperature: temperature + randomBetween(-2, 2),
    weatherCode: preset.code,
    windSpeed: randomBetween(...preset.windSpeed),
    precipitation: randomBetween(...preset.precipitation),
    isDay: Math.random() > 0.25,
    observedAt: now.toISOString(),
    fetchedAt: now.getTime(),
    kind: preset.kind,
    label: getWeatherLabel(preset.code)
  };
}

export function usePreviewCityWeather(city?: CityData): WeatherState {
  return useMemo(() => {
    if (!city) return { status: 'idle', data: null };

    const existing = previewWeatherByCity.get(city.id);
    if (existing) return { status: 'ready', data: existing };

    const snapshot = createPreviewSnapshot();
    previewWeatherByCity.set(city.id, snapshot);
    return { status: 'ready', data: snapshot };
  }, [city?.id]);
}
