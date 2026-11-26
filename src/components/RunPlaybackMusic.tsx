import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Music2, Pause } from 'lucide-react';
import type { RunMusicTrack } from '../journey/runModeExperience';
import styles from './RunPlaybackView.module.css';

function ScrollingLyric({ line, cueDuration }: { line: string; cueDuration: number }) {
  const windowRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useLayoutEffect(() => {
    const viewport = windowRef.current;
    const text = textRef.current;
    if (!viewport || !text) return;

    const measure = () => setOverflow(Math.max(0, text.scrollWidth - viewport.clientWidth));
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(text);
    measure();
    return () => observer.disconnect();
  }, []);

  const duration = Math.min(Math.max(0.6, cueDuration - 0.5), Math.max(0.8, overflow / 36));
  const motion = overflow > 0 ? {
    '--lyric-offset': `-${overflow}px`,
    '--lyric-duration': `${duration}s`,
  } as CSSProperties : undefined;

  return (
    <span className={styles.lyricWindow} ref={windowRef} aria-hidden="true" title={line}>
      <span className={styles.lyricText} ref={textRef} data-scroll={overflow > 0 || undefined} style={motion}>
        {line}
      </span>
    </span>
  );
}
export default function RunPlaybackMusic({ audioRef, track, runActive }: {
  audioRef: RefObject<HTMLAudioElement | null>;
  track: RunMusicTrack;
  runActive: boolean;
}) {
  const lineId = useId();
  const [enabled, setEnabled] = useState(true);
  const [lineIndex, setLineIndex] = useState(0);
  const { cues } = track;

  const play = useCallback(() => {
    void audioRef.current?.play().catch((error: DOMException) => {
      if (error.name !== 'AbortError') setEnabled(false);
    });
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncLyrics = () => {
      const nextCue = cues.findIndex(cue => cue.at > audio.currentTime);
      setLineIndex(nextCue === -1 ? cues.length - 1 : Math.max(0, nextCue - 1));
    };
    const showRetry = () => setEnabled(false);
    syncLyrics();
    audio.addEventListener('timeupdate', syncLyrics);
    audio.addEventListener('error', showRetry);
    return () => {
      audio.removeEventListener('timeupdate', syncLyrics);
      audio.removeEventListener('error', showRetry);
    };
  }, [audioRef, cues]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !runActive || !enabled) return;
    if (audio.paused) play();
    return () => audio.pause();
  }, [audioRef, enabled, play, runActive]);

  const cue = cues[lineIndex];
  const cueDuration = (cues[lineIndex + 1]?.at ?? Infinity) - cue.at;

  return (
    <button type="button" className={styles.musicStatus} disabled={!runActive}
      aria-label={enabled ? '暂停音乐' : '播放音乐'} aria-describedby={enabled ? lineId : undefined}
      onClick={() => {
        if (enabled) {
          audioRef.current?.pause();
          setEnabled(false);
        } else {
          setEnabled(true);
          play();
        }
      }}>
      {enabled ? <Pause size={14} aria-hidden="true" /> : <Music2 size={14} aria-hidden="true" />}
      {enabled ? <>
        <Fragment key={cue.at}>
          <ScrollingLyric line={cue.line} cueDuration={cueDuration} />
        </Fragment>
        <span id={lineId} className="sr-only">{cue.line}</span>
      </> : <span>播放音乐</span>}
    </button>
  );
}
