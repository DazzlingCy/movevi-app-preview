import type { SmartSpeedProfile } from './runSpeed';
import lyrics from './runMusicLyrics.json';

export interface RunMusicTrack {
  file: string;
  cues: readonly { at: number; line: string }[];
}
interface RunModeExperience {
  track: RunMusicTrack;
  smartSpeed?: { profile: SmartSpeedProfile; description: string };
}
const weekendTrack: RunMusicTrack = {
  file: 'yu-quan-running.mp3',
  cues: lyrics.running,
};

const deskBreakTrack: RunMusicTrack = {
  file: 'mayday-stubborn.mp3',
  cues: lyrics.stubborn,
};

const inclineTrack: RunMusicTrack = {
  file: 'jason-zhang-battle.mp3',
  cues: lyrics.battle,
};

const modeExperiences = new Map<string, RunModeExperience>([
  ['tag:purpose:改善久坐状态', {
    track: deskBreakTrack,
    smartSpeed: { profile: 'desk-break', description: '轻松起步，逐渐提速' },
  }],
  ['tag:lifestyle:周末居家', {
    track: weekendTrack,
    smartSpeed: { profile: 'weekend-home', description: '匀速慢跑，平缓收尾' },
  }],
  ['tag:training:坡度训练', {
    track: inclineTrack,
    smartSpeed: { profile: 'incline', description: '分段提速与回落' },
  }],
]);

export const defaultRunExperience: RunModeExperience = { track: weekendTrack };

export function getRunModeExperience(modeId?: string): RunModeExperience {
  return (modeId ? modeExperiences.get(modeId) : undefined) ?? defaultRunExperience;
}
