import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const input = resolve('dist/video/routes/open-trail-demo.mp4');
const directory = resolve('dist/video/routes/open-trail-hls');
mkdirSync(directory, { recursive: true });

// Copy the encoded video unchanged. Name the fragmented MP4 segments .mp4
// so the static host serves them as video/mp4.
const result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
  '-map', '0:v:0', '-c:v', 'copy', '-an',
  '-f', 'hls', '-hls_playlist_type', 'vod', '-hls_time', '6',
  '-hls_segment_type', 'fmp4', '-hls_flags', 'independent_segments',
  '-hls_segment_filename', 'segment-%02d.mp4', 'index.m3u8',
], { cwd: directory, stdio: 'inherit' });
if (result.error || result.status !== 0) throw result.error ?? new Error('FFmpeg could not package the running video');

const playlist = readFileSync(resolve(directory, 'index.m3u8'), 'utf8');
const segments = playlist.match(/^segment-\d+\.mp4$/gm) ?? [];
if (segments.length < 2 || !playlist.includes('#EXT-X-ENDLIST')) {
  throw new Error('Incomplete run scenery HLS playlist');
}
console.log(`Packaged original running video into ${segments.length} segments without re-encoding.`);
