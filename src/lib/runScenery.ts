declare const __APP_VERSION__: string;

const repositorySceneryBase = `${import.meta.env.BASE_URL}video/routes/`;
const hostedSceneryBase = `https://cdn.jsdelivr.net/gh/DazzlingCy/movevi-app-preview@${__APP_VERSION__}/public/video/routes/`;
const useHostedMedia = import.meta.env.PROD && !__APP_VERSION__.startsWith('local-');

export const runScenerySource = `${useHostedMedia ? hostedSceneryBase : repositorySceneryBase}open-trail-demo.mp4`;
export const runSceneryPoster = `${useHostedMedia ? hostedSceneryBase : repositorySceneryBase}open-trail-demo.webp`;

export function createRunSceneryVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.src = runScenerySource;
  return video;
}

export function reloadRunSceneryVideo(video: HTMLVideoElement): void {
  const position = video.currentTime;
  video.load();
  if (position > 0) video.currentTime = position;
}
