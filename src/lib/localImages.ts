import { LOCAL_IMAGE_MANIFEST } from '../data/localImageManifest';

const appEnv = (import.meta as ImportMeta & { env?: { BASE_URL?: string; PROD?: boolean } }).env;
const appBase = appEnv?.BASE_URL ?? './';
const previewMediaBase = 'https://cdn.jsdelivr.net/gh/DazzlingCy/movevi-app-preview@7253ac6b3913518161a2bc7656267722883c610b/public/';
const mediaBase = appEnv?.PROD ? previewMediaBase : appBase;

/** Keep backend/custom images untouched; pre-packaged defaults use the app's own origin. */
export function resolveLocalImage(src: string | undefined, base = mediaBase): string | undefined {
  if (!src) return src;
  const localPath = LOCAL_IMAGE_MANIFEST[src];
  return localPath ? `${base.endsWith('/') ? base : `${base}/`}${localPath}` : src;
}

type RouteCoverSize = 'feature' | 'thumbnail' | 'list';
type CityCoverSize = 'cover' | 'grid';

function coverName(localPath: string) {
  return localPath.slice(localPath.lastIndexOf('/') + 1, localPath.lastIndexOf('.'));
}

/** Route variants are generated from the vendored route covers. */
export function recommendationCoverPath(localPath: string, size: RouteCoverSize): string {
  return `images/recommendations/${size}/${coverName(localPath)}.webp`;
}

export function resolveRecommendationCover(src: string | undefined, size: RouteCoverSize): string | undefined {
  const localPath = src && LOCAL_IMAGE_MANIFEST[src];
  return localPath ? `${mediaBase}${recommendationCoverPath(localPath, size)}` : src;
}

export function cityCoverPath(localPath: string, size: CityCoverSize): string {
  return `images/cities/${size}/${coverName(localPath)}.webp`;
}

export function resolveCityCover(src: string, size: CityCoverSize): string {
  const localPath = LOCAL_IMAGE_MANIFEST[src];
  return localPath ? `${mediaBase}${cityCoverPath(localPath, size)}` : src;
}
