import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const input = resolve('dist/video/routes/open-trail-demo.mp4');
const directory = resolve('dist/video/routes/open-trail-ios');
mkdirSync(directory, { recursive: true });

// Keep the original H.264 bitstream and wrap it in MPEG-TS segments so
// native HLS doesn't depend on a separate fragmented MP4 init segment.
const result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
  '-map', '0:v:0', '-c:v', 'copy', '-an',
  '-f', 'hls', '-hls_playlist_type', 'vod', '-hls_time', '6',
  '-hls_segment_type', 'mpegts', '-hls_flags', 'independent_segments',
  '-master_pl_name', 'master.m3u8',
  '-hls_segment_filename', 'segment-%02d.ts', 'index.m3u8',
], { cwd: directory, stdio: 'inherit' });
if (result.error || result.status !== 0) throw result.error ?? new Error('FFmpeg could not package the running video');

const playlist = readFileSync(resolve(directory, 'index.m3u8'), 'utf8');
const segments = playlist.match(/^segment-\d+\.ts$/gm) ?? [];
const master = readFileSync(resolve(directory, 'master.m3u8'), 'utf8');
if (segments.length < 2 || !playlist.includes('#EXT-X-ENDLIST') || !master.includes('index.m3u8')) {
  throw new Error('Incomplete run scenery HLS playlist');
}
console.log(`Packaged original running video into ${segments.length} segments without re-encoding.`);
