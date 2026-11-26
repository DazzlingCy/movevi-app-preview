import { chooseRunSceneryFormat, type RunSceneryFormat } from '../journey/sceneryFormat';

const runSceneryMp4 = `${import.meta.env.BASE_URL}video/routes/open-trail-demo.mp4`;
const runSceneryHls = `${import.meta.env.BASE_URL}video/routes/open-trail-hls/index.m3u8`;
export const runSceneryPoster = `${import.meta.env.BASE_URL}video/routes/open-trail-demo.webp`;

export function preferredRunSceneryFormat(video: HTMLVideoElement): RunSceneryFormat {
  return chooseRunSceneryFormat({
    hlsPublished: import.meta.env.VITE_RUN_SCENERY_HLS === '1',
    nativeHls: !!(video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('application/x-mpegURL')),
    userAgent: navigator.userAgent, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints,
  });
}

export function runSceneryUrl(format: RunSceneryFormat, retryId?: string): string {
  const url = format === 'hls' ? runSceneryHls : runSceneryMp4;
  return retryId ? `${url}?retry=${encodeURIComponent(retryId)}` : url;
}

export function createRunSceneryVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  video.preload = 'auto';
  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.poster = runSceneryPoster;
  return video;
}
