import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRunSceneryVideo } from '../lib/runScenery';
import { observeScenery, startSceneryWatch } from './sceneryWatch';

type ScenerySession = {
  position: () => number;
  dispose: () => void;
};

export function useRunScenery(runActive: boolean) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<ScenerySession | null>(null);
  const watch = useRef<ReturnType<typeof startSceneryWatch> | null>(null);
  const retryCount = useRef(0);
  const playRequest = useRef(0);
  const [status, setStatus] = useState<'loading' | 'playing' | 'retry'>('loading');

  const mountVideo = useCallback((retryId?: string) => {
    const host = hostRef.current;
    if (!host) return;
    sessionRef.current?.dispose();
    const video = createRunSceneryVideo(retryId);
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
      if (videoRef.current === video) setStatus('retry');
    };
    videoRef.current = video;
    const position = () => tracksFrames ? presented : video.currentTime;
    watch.current = startSceneryWatch(performance.now(), position());
    video.addEventListener('error', fail);
    if (tracksFrames) frameRequest = video.requestVideoFrameCallback(onFrame);
    host.append(video);
    sessionRef.current = {
      position,
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
    setStatus('loading');
  }, []);

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const request = ++playRequest.current;
    void video.play().catch(error => {
      if (videoRef.current === video && playRequest.current === request && error.name !== 'AbortError') {
        setStatus('retry');
      }
    });
  }, []);

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
        now: performance.now(), position: session.position(), playing: !video.paused && !video.seeking && !video.error,
      });
      watch.current = observation.watch;
      if (observation.status === 'advanced') setStatus('playing');
      else if (observation.status === 'stalled') setStatus('retry');
    }, 500);
    document.addEventListener('visibilitychange', reset);
    return () => {
      playRequest.current++;
      videoRef.current?.pause();
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
