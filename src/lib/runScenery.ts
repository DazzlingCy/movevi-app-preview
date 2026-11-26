export const runScenerySource = `${import.meta.env.BASE_URL}video/routes/open-trail-demo.mp4`;
export const runSceneryPoster = `${import.meta.env.BASE_URL}video/routes/open-trail-demo.webp`;

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
