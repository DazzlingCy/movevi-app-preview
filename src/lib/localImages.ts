import { LOCAL_IMAGE_MANIFEST } from '../data/localImageManifest';

const appEnv = (import.meta as ImportMeta & { env?: { BASE_URL?: string; PROD?: boolean } }).env;
const appBase = appEnv?.BASE_URL ?? './';
const previewMediaBase = 'https://cdn.jsdelivr.net/gh/DazzlingCy/movevi-app-preview@9fb29f21636ca2e1f58c5034d9e9c29994e39ca6/public/';
const mediaBase = appEnv?.PROD ? previewMediaBase : appBase;

/** Keep backend/custom images untouched; pre-packaged defaults use the app's own origin. */
export function resolveLocalImage(src: string | undefined, base = mediaBase): string | undefined {
  if (!src) return src;
  const localPath = LOCAL_IMAGE_MANIFEST[src];
  return localPath ? `${base.endsWith('/') ? base : `${base}/`}${localPath}` : src;
}

/** Recommendation variants are generated from the vendored route covers. */
export function recommendationCoverPath(localPath: string, size: 'feature' | 'thumbnail'): string {
  const name = localPath.slice(localPath.lastIndexOf('/') + 1, localPath.lastIndexOf('.'));
  return `images/recommendations/${size}/${name}.webp`;
}

export function resolveRecommendationCover(src: string | undefined, size: 'feature' | 'thumbnail'): string | undefined {
  const localPath = src && LOCAL_IMAGE_MANIFEST[src];
  return localPath ? `${mediaBase}${recommendationCoverPath(localPath, size)}` : src;
}
