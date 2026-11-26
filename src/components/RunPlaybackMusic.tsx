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
  const wantsMusic = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const { cues } = track;

  const play = useCallback((reload = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (reload && audio.error) audio.load();
    void audio.play().catch(() => {
      if (audio.paused) setPlaying(false);
    });
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncLyrics = () => {
      const nextCue = cues.findIndex(cue => cue.at > audio.currentTime);
      setLineIndex(nextCue === -1 ? cues.length - 1 : Math.max(0, nextCue - 1));
    };
    syncLyrics();
    audio.addEventListener('timeupdate', syncLyrics);
    return () => {
      audio.removeEventListener('timeupdate', syncLyrics);
    };
  }, [audioRef, cues]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!runActive) {
      audio.pause();
      setPlaying(false);
      return;
    }

    let recoveryTimer: number | undefined;
    let recoveryUsed = false;
    const onPlaying = () => setPlaying(true);
    const onError = () => setPlaying(false);
    const onPause = () => {
      setPlaying(false);
      if (!wantsMusic.current || document.hidden || audio.error || audio.ended || recoveryUsed) return;
      recoveryUsed = true;
      recoveryTimer = window.setTimeout(() => {
        if (wantsMusic.current && audio.paused && !document.hidden) play();
      }, 250);
    };
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    setPlaying(!audio.paused && audio.readyState >= audio.HAVE_CURRENT_DATA);
    if (wantsMusic.current && audio.paused) play();
    return () => {
      window.clearTimeout(recoveryTimer);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
  }, [audioRef, play, runActive]);

  const cue = cues[lineIndex];
  const cueDuration = (cues[lineIndex + 1]?.at ?? Infinity) - cue.at;

  return (
    <button type="button" className={styles.musicStatus} disabled={!runActive}
      aria-label={playing ? '暂停音乐' : '播放音乐'} aria-describedby={playing ? lineId : undefined}
      onClick={() => {
        if (playing) {
          wantsMusic.current = false;
          audioRef.current?.pause();
        } else {
          wantsMusic.current = true;
          play(true);
        }
      }}>
      {playing ? <Pause size={14} aria-hidden="true" /> : <Music2 size={14} aria-hidden="true" />}
      {playing ? <>
        <Fragment key={cue.at}>
          <ScrollingLyric line={cue.line} cueDuration={cueDuration} />
        </Fragment>
        <span id={lineId} className="sr-only">{cue.line}</span>
      </> : <span>播放音乐</span>}
    </button>
  );
}
