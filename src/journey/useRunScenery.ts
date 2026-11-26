import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRunSceneryVideo, preferredRunSceneryFormat, runSceneryUrl } from '../lib/runScenery';
import type { RunSceneryFormat } from './sceneryFormat';
import { observeScenery, startSceneryWatch } from './sceneryWatch';

type ScenerySession = {
  format: RunSceneryFormat;
  hasAdvanced: boolean;
  position: () => number;
  fallback: () => boolean;
  dispose: () => void;
};

export function useRunScenery(runActive: boolean) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<ScenerySession | null>(null);
  const watch = useRef<ReturnType<typeof startSceneryWatch> | null>(null);
  const retryCount = useRef(0);
  const playRequest = useRef(0);
  const wantsPlayback = useRef(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'retry'>('loading');

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const request = ++playRequest.current;
    void video.play().catch(error => {
      if (videoRef.current !== video || playRequest.current !== request || error.name === 'AbortError') return;
      if (error.name === 'NotSupportedError' && sessionRef.current?.fallback()) return;
      setStatus('retry');
    });
  }, []);

  const mountVideo = useCallback((retryId?: string) => {
    const host = hostRef.current;
    if (!host) return;
    sessionRef.current?.dispose();
    const video = createRunSceneryVideo();
    const tracksFrames = typeof video.requestVideoFrameCallback === 'function';
    let frameRequest: number | undefined;
    let presented = 0;
    let disposed = false;
    const onFrame = () => {
      if (disposed) return;
      presented++;
      frameRequest = video.requestVideoFrameCallback(onFrame);
    };
    const fail = () => {
      if (videoRef.current === video && !sessionRef.current?.fallback()) setStatus('retry');
    };
    videoRef.current = video;
    // Native HLS can advance without delivering a compositor callback. Use
    // its media clock to avoid flagging healthy playback as stalled.
    const position = () => session.format === 'hls' || !tracksFrames ? video.currentTime : presented;
    video.addEventListener('error', fail);
    if (tracksFrames) frameRequest = video.requestVideoFrameCallback(onFrame);
    host.append(video);
    const session: ScenerySession = {
      format: preferredRunSceneryFormat(video),
      hasAdvanced: false,
      position,
      fallback: () => {
        if (videoRef.current !== video || session.format !== 'hls') return false;
        session.format = 'mp4';
        session.hasAdvanced = false;
        video.autoplay = false;
        video.src = runSceneryUrl('mp4', retryId);
        watch.current = startSceneryWatch(performance.now(), position());
        setStatus('loading');
        if (wantsPlayback.current) playVideo();
        return true;
      },
      dispose: () => {
        disposed = true;
        video.removeEventListener('error', fail);
        if (frameRequest !== undefined) video.cancelVideoFrameCallback(frameRequest);
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.remove();
      },
    };
    sessionRef.current = session;
    watch.current = startSceneryWatch(performance.now(), position());
    video.autoplay = session.format === 'hls';
    video.src = runSceneryUrl(session.format, retryId);
    setStatus('loading');
  }, [playVideo]);

  useLayoutEffect(() => {
    mountVideo();
    return () => {
      videoRef.current = null;
      sessionRef.current?.dispose();
      sessionRef.current = null;
      watch.current = null;
    };
  }, [mountVideo]);

  useEffect(() => {
    if (!runActive) return;
    wantsPlayback.current = true;
    const reset = () => {
      const session = sessionRef.current;
      if (session) watch.current = startSceneryWatch(performance.now(), session.position());
    };
    reset();
    playVideo();
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const session = sessionRef.current;
      if (document.hidden || !video || !session || !watch.current) return;
      const observation = observeScenery(watch.current, {
        now: performance.now(), position: session.position(),
        playing: !video.paused && !video.seeking && !video.error && video.readyState >= video.HAVE_CURRENT_DATA,
        // The original 1080p stream starts with a 10-second segment. Don't
        // suggest interrupting that initial download after only eight seconds.
        timeoutMs: session.format === 'hls' && !session.hasAdvanced ? 25_000 : undefined,
      });
      watch.current = observation.watch;
      if (observation.status === 'advanced') {
        session.hasAdvanced = true;
        setStatus('playing');
      } else if (observation.status === 'stalled') setStatus('retry');
    }, 500);
    document.addEventListener('visibilitychange', reset);
    return () => {
      wantsPlayback.current = false;
      playRequest.current++;
      const video = videoRef.current;
      if (video) {
        video.autoplay = false;
        video.pause();
      }
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [playVideo, runActive]);

  const reload = () => {
    if (!runActive) return;
    mountVideo(`${Date.now()}-${++retryCount.current}`);
    // Call play on the newly attached element within the Safari tap gesture.
    playVideo();
  };
  return { hostRef, videoRef, status, reload };
}
