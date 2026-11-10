const repositorySceneryBase = `${import.meta.env.BASE_URL}video/routes/`;
const previewScenerySource = 'https://cdn.jsdelivr.net/gh/DazzlingCy/movevi-app-preview@6db52917e2d9ff27b24f6352e88a9cb7705cd460/public/video/routes/hangzhou-city-fast.mp4';
const fastScenerySource = import.meta.env.PROD
  ? previewScenerySource
  : `${repositorySceneryBase}hangzhou-city-fast.mp4`;
const fallbackScenerySource = import.meta.env.PROD
  ? previewScenerySource
  : `${repositorySceneryBase}hangzhou-city-demo.mp4`;

export function createRunSceneryVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.src = fastScenerySource;
  return video;
}

export function reloadRunSceneryVideo(video: HTMLVideoElement): void {
  const position = video.currentTime;
  // Some browsers load the conventional MP4 more reliably than a fragmented MP4.
  if (video.getAttribute('src') === fastScenerySource) video.src = fallbackScenerySource;
  else video.load();
  if (position > 0) video.currentTime = position;
}
