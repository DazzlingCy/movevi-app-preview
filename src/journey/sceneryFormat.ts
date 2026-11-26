export type RunSceneryFormat = 'mp4' | 'hls';

export function chooseRunSceneryFormat({
  hlsPublished, nativeHls, userAgent, platform, maxTouchPoints,
}: {
  hlsPublished: boolean;
  nativeHls: boolean;
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): RunSceneryFormat {
  const appleMobile = /iPhone|iPad|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
  return hlsPublished && nativeHls && appleMobile ? 'hls' : 'mp4';
}
