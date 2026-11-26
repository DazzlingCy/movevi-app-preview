import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Airplay, ArrowRight, Award, ChevronLeft, Maximize2, Pause, Play, X } from 'lucide-react';
import { CITIES, getRouteData } from '../data/cities';
import { getRouteCategory } from '../data/routeCategories';
import { reloadRunSceneryVideo, runSceneryPoster } from '../lib/runScenery';
import { coinMileageCounter, isCoinRouteComplete, type CoinExerciseEvidence } from '../journey/coinRewards';
import { MILEAGE_METERS_PER_SECOND } from '../journey/mileageTeams';
import { getJourneyCity } from '../journey/data';
import { getMedalLandmarks } from '../journey/medalLottery';
import { getRunSpeedKmh, type RunSpeed, type SmartRunSpeed } from '../journey/runSpeed';
import type { RunMusicTrack } from '../journey/runModeExperience';
import CityImage from './CityImage';
import CoinRewardBadge from './CoinRewardBadge';
import RunPlaybackMusic from './RunPlaybackMusic';
import { RunSpeedDrawer } from './RunSpeedPicker';
import type { CityRouteListItem } from './CityRoutesView';
import Modal from './journey/Modal';
import styles from './RunPlaybackView.module.css';

const sceneryLoadTimeoutMs = 8000;

interface RunPlaybackViewProps {
  cityId: string;
  routeIndex: number;
  image: string;
  cityName?: string;
  categoryLabel?: string;
  routeOverride?: CityRouteListItem;
  prepareScenery: () => HTMLVideoElement;
  musicRef: RefObject<HTMLAudioElement | null>;
  musicTrack: RunMusicTrack;
  onExit: () => void;
  requireFullRoute?: boolean;
  useActualStats?: boolean;
  demoCompleteSignal?: number;
  trackTeamMileage?: boolean;
  initialSpeed?: RunSpeed;
  coinRewards?: {
    demo: boolean;
    tracking: boolean;
  };
  onComplete: (stats: { distance: number; duration: number; calories: number }, evidence?: CoinExerciseEvidence) => void;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
};

const parsePlannedDuration = (value: string) => {
  const [minutes = 0, seconds = 0] = value.split(':').map(Number);
  return minutes * 60 + seconds;
};

type SpeedSample = { seconds: number; kmh: number };
type ChartPoint = { x: number; y: number };

const speedChartWidth = 400;
const speedChartHeight = 32;

function smoothSpeedPath(points: readonly ChartPoint[]): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return '';

  const segments = points.slice(1, -1).map((point, index) => {
    const next = points[index + 2];
    const midX = (point.x + next.x) / 2;
    const midY = (point.y + next.y) / 2;
    return `Q ${point.x} ${point.y} ${midX} ${midY}`;
  });
  return [`M ${first.x} ${first.y}`, ...segments, `L ${last.x} ${last.y}`].join(' ');
}

function SmartSpeedChart({ speed, routeKm, routeSeconds, elapsed, actual }: {
  speed: SmartRunSpeed;
  routeKm: number;
  routeSeconds: number;
  elapsed: number;
  actual: readonly SpeedSample[];
}) {
  const gradientId = useId();
  const duration = routeSeconds || 300;
  const preset = useMemo(() => Array.from({ length: 101 }, (_, index): SpeedSample => {
    const seconds = duration * index / 100;
    return { seconds, kmh: getRunSpeedKmh(speed, seconds, routeKm, routeSeconds) };
  }), [speed, duration, routeKm, routeSeconds]);
  const speeds = [...preset, ...actual].map(sample => sample.kmh);
  const min = Math.max(0, Math.min(...speeds) - .5);
  const max = Math.max(...speeds) + .5;
  const horizon = Math.max(duration, elapsed);
  const pointFor = ({ seconds, kmh }: SpeedSample): ChartPoint => ({
    x: speedChartWidth * seconds / horizon,
    y: 28 - 24 * (kmh - min) / (max - min),
  });
  const presetPoints = preset.map(pointFor);
  const presetPath = smoothSpeedPath(presetPoints);
  const actualPoints = actual.flatMap((sample, index) => {
    const previous = actual[index - 1];
    // Hold the previous reading until the last second before a speed change.
    return previous ? [
      pointFor({ seconds: Math.max(previous.seconds, sample.seconds - 1), kmh: previous.kmh }),
      pointFor(sample),
    ] : [pointFor(sample)];
  });
  const latest = actual.at(-1);
  const tip = latest && pointFor({ seconds: elapsed, kmh: latest.kmh });
  if (tip) actualPoints.push(tip);
  const actualPath = smoothSpeedPath(actualPoints);

  return <figure className={styles.speedChart} aria-label="智能变速速度曲线" aria-description="浅绿色为预设速度，珊瑚色为实际速度">
    <svg viewBox={`0 0 ${speedChartWidth} ${speedChartHeight}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${gradientId}-line`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={speedChartHeight}>
          <stop offset="0" stopColor="#e2fbc4" />
          <stop offset="1" stopColor="#91d8a5" />
        </linearGradient>
        <linearGradient id={`${gradientId}-fill`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={speedChartHeight}>
          <stop offset="0" stopColor="#b9eda5" stopOpacity=".18" />
          <stop offset="1" stopColor="#b9eda5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${presetPath} V ${speedChartHeight} H 0 Z`} fill={`url(#${gradientId}-fill)`} />
      <path className={styles.presetCurve} d={presetPath} stroke={`url(#${gradientId}-line)`} vectorEffect="non-scaling-stroke" />
      {actualPath && <path className={styles.actualCurve} d={actualPath} vectorEffect="non-scaling-stroke" />}
    </svg>
    {tip && <span className={styles.actualSpeedTip} aria-hidden="true"
      style={{ left: `${tip.x * 100 / speedChartWidth}%`, top: `${tip.y * 100 / speedChartHeight}%` }} />}
  </figure>;
}

export default function RunPlaybackView({ cityId, routeIndex, image, cityName: cityNameOverride, categoryLabel, routeOverride, prepareScenery, musicRef, musicTrack, onExit, onComplete, requireFullRoute = false, useActualStats = false, demoCompleteSignal = 0, trackTeamMileage = false, initialSpeed, coinRewards }: RunPlaybackViewProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [{ distance, time, teamMeters, speed, speedSamples }, setProgress] = useState({
    distance: 0, time: 0, teamMeters: 0, speed: initialSpeed, speedSamples: [] as SpeedSample[],
  });
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const speedControlRef = useRef<HTMLButtonElement>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showRunActions, setShowRunActions] = useState(false);
  const [coinEvidence, setCoinEvidence] = useState<CoinExerciseEvidence>();
  const runActionsTitleId = useId();
  const runSummaryTitleId = useId();
  const sceneryHostRef = useRef<HTMLDivElement>(null);
  const sceneryVideoRef = useRef<HTMLVideoElement>(null);
  const [sceneryVisible, setSceneryVisible] = useState(false);
  const [sceneryStatus, setSceneryStatus] = useState<'loading' | 'playing' | 'retry'>('loading');
  const reduceMotion = useReducedMotion();

  const city = CITIES.find(item => String(item.id) === String(cityId));
  const route = routeOverride ?? getRouteData(cityId, routeIndex);
  const journeyRoute = getJourneyCity(cityId)?.routes.find(item => item.order === routeIndex);
  const medalNames = journeyRoute ? getMedalLandmarks(journeyRoute) : [];
  const cityName = cityNameOverride ?? city?.name ?? '城市';
  const category = categoryLabel ?? routeOverride?.category ?? getRouteCategory(cityName, routeIndex);
  const playbackTitle = route.title.replace(/\s*·\s*/g, ' ');
  const plannedDistance = Number(route.distance) || 0;
  const plannedDuration = parsePlannedDuration(route.duration);
  const currentKmh = speed ? getRunSpeedKmh(speed, time, plannedDistance, plannedDuration) : MILEAGE_METERS_PER_SECOND * 3.6;
  const routeProgress = Math.min(1, time / (plannedDuration || 300));
  // The incline training preview climbs from level 1 to 9, then eases back down.
  const inclineLevel = categoryLabel === '坡度训练' ? 1 + Math.round(8 * Math.sin(Math.PI * routeProgress)) : 1;
  const routeFinished = !requireFullRoute || distance >= plannedDistance;
  const manuallySimulated = !!coinEvidence && coinEvidence.source !== 'playback';
  const simulatedPartial = manuallySimulated && !isCoinRouteComplete({ ...coinEvidence, plannedMeters: Math.round(plannedDistance * 1000) });
  const earnsMedals = routeFinished && !!coinEvidence && !!coinRewards?.tracking
    && isCoinRouteComplete({ ...coinEvidence, plannedMeters: Math.round(plannedDistance * 1000) });
  const liveEvidence: CoinExerciseEvidence = {
    meters: Math.round(distance * 1000), activeSeconds: time, endedAt: Date.now(), source: 'playback',
  };
  const runActive = isPlaying && !showRunActions && !showSummary;
  useEffect(() => {
    if (!demoCompleteSignal) return;
    setProgress(previous => ({ ...previous, distance: plannedDistance, time: plannedDuration }));
    setIsPlaying(false); setShowRunActions(false); setShowSummary(true);
  }, [demoCompleteSignal, plannedDistance, plannedDuration]);

  useEffect(() => {
    if (!runActive) return;
    let lastVideoTime = sceneryVideoRef.current?.currentTime;
    const timer = window.setInterval(() => {
      const video = trackTeamMileage ? sceneryVideoRef.current : null;
      const videoAdvanced = video && !video.paused && !video.seeking && video.readyState >= video.HAVE_CURRENT_DATA
        && lastVideoTime !== undefined && lastVideoTime !== video.currentTime;
      lastVideoTime = video?.currentTime;
      setProgress(previous => {
        const stepKm = previous.speed ? getRunSpeedKmh(previous.speed, previous.time, plannedDistance, plannedDuration) / 3600 : 0.003;
        const nextDistance = Math.min(plannedDistance, previous.distance + stepKm);
        const meters = Math.round(nextDistance * 1000) - Math.round(previous.distance * 1000);
        const actualKmh = Math.round((nextDistance - previous.distance) * 36000) / 10;
        const speedSamples = previous.speed?.mode === 'smart' && previous.speedSamples.at(-1)?.kmh !== actualKmh
          ? [...previous.speedSamples, { seconds: previous.time, kmh: actualKmh }]
          : previous.speedSamples;
        return {
          ...previous,
          distance: nextDistance,
          time: previous.time + 1,
          teamMeters: previous.teamMeters + (videoAdvanced ? Math.min(meters, MILEAGE_METERS_PER_SECOND) : 0),
          speedSamples,
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runActive, plannedDistance, plannedDuration, trackTeamMileage]);

  useLayoutEffect(() => {
    const host = sceneryHostRef.current;
    if (!host) return;
    const video = prepareScenery();
    const showScenery = () => {
      setSceneryVisible(true);
      setSceneryStatus('playing');
    };
    const showBuffering = () => setSceneryStatus(status => status === 'playing' ? 'loading' : status);
    const showRetry = () => {
      setSceneryVisible(false);
      setSceneryStatus('retry');
    };
    video.addEventListener('playing', showScenery);
    video.addEventListener('waiting', showBuffering);
    video.addEventListener('error', showRetry);
    host.append(video);
    sceneryVideoRef.current = video;
    if (video.error) showRetry();
    else if (!video.paused && video.readyState >= video.HAVE_FUTURE_DATA) showScenery();
    return () => {
      video.removeEventListener('playing', showScenery);
      video.removeEventListener('waiting', showBuffering);
      video.removeEventListener('error', showRetry);
      video.pause();
      if (video.readyState !== video.HAVE_NOTHING) video.currentTime = 0;
      video.muted = true;
      video.preload = 'metadata';
      video.remove();
      sceneryVideoRef.current = null;
    };
  }, [prepareScenery]);

  const playScenery = useCallback((retry = false) => {
    const video = sceneryVideoRef.current;
    if (!video) return;
    if (video.paused || retry) setSceneryStatus('loading');
    if (video.error || (retry && video.readyState < video.HAVE_FUTURE_DATA)) {
      reloadRunSceneryVideo(video);
    }
    void video.play().catch(error => {
      if (error.name !== 'AbortError') setSceneryStatus('retry');
    });
  }, []);

  useEffect(() => {
    const video = sceneryVideoRef.current;
    if (!video || !runActive) return;
    playScenery();
    return () => video.pause();
  }, [playScenery, runActive]);

  useEffect(() => {
    if (!runActive || sceneryStatus !== 'loading') return;
    const timer = window.setTimeout(() => setSceneryStatus('retry'), sceneryLoadTimeoutMs);
    return () => window.clearTimeout(timer);
  }, [runActive, sceneryStatus]);

  const result = useMemo(() => {
    const resultDistance = requireFullRoute || useActualStats || speed || distance >= 0.05 ? distance : plannedDistance;
    const resultDuration = requireFullRoute || useActualStats || speed || time >= 20 ? time : plannedDuration;
    return {
      distance: Number(resultDistance.toFixed(2)),
      duration: resultDuration,
      calories: Math.max(1, Math.round(resultDistance * 65))
    };
  }, [distance, plannedDistance, plannedDuration, time, requireFullRoute, useActualStats, speed]);

  const todayDateStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '/');

  const finishRun = () => {
    if ((coinRewards?.tracking || trackTeamMileage) && liveEvidence.meters > 0 && liveEvidence.activeSeconds > 0) {
      setCoinEvidence({ ...liveEvidence, ...(trackTeamMileage && { teamMeters }) });
    }
    setIsPlaying(false);
    setShowRunActions(false);
    setShowSummary(true);
  };

  const simulateCoinWorkout = (complete: boolean) => {
    const meters = complete ? Math.round(plannedDistance * 1000) : 1000;
    const activeSeconds = complete ? Math.max(plannedDuration, 15 * 60) : 8 * 60;
    setProgress(previous => ({ ...previous, distance: meters / 1000, time: activeSeconds }));
    setCoinEvidence({ meters, activeSeconds, endedAt: Date.now() });
  };

  const toggleRunPause = () => {
    setShowRunActions(isPlaying);
    setIsPlaying(!isPlaying);
  };

  const closeSpeedPicker = () => {
    setShowSpeedPicker(false);
    window.requestAnimationFrame(() => speedControlRef.current?.focus({ preventScroll: true }));
  };

  return (
    <div className={`${styles.player} relative h-full w-full overflow-hidden bg-[#05070A] font-sans text-white`} aria-label={`${cityName}${route.title}跑步界面`}>
      <div ref={sceneryHostRef} className={styles.sceneryVideo} aria-hidden="true" />
      {!sceneryVisible && (
        <motion.div
          className={styles.sceneryPoster}
          animate={reduceMotion || !runActive ? { scale: 1 } : { scale: [1, 1.035, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          <CityImage src={sceneryStatus === 'retry' ? image : runSceneryPoster} alt="" fallbackLabel={cityName} loading="eager" className="h-full w-full object-cover" />
        </motion.div>
      )}
      <div className={styles.shade} aria-hidden="true" />
      <header className={`${styles.header} absolute inset-x-0 top-0 z-10`} inert={showSpeedPicker || undefined}>
        <button type="button" onClick={finishRun} className={styles.backButton} aria-label="返回并查看结算" aria-haspopup="dialog">
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <p className={styles.routeHeading} title={`${category} ${playbackTitle}`}>
          <span className={styles.routeCategory}>{category}</span>{' '}<span className={styles.routeTitle}>{playbackTitle}</span>
        </p>
      </header>

      <main className={styles.hud} id="main-content" inert={showSpeedPicker || undefined}>
        {!showSummary && !showRunActions && coinRewards?.tracking && (
          <CoinRewardBadge {...coinMileageCounter(liveEvidence.meters)} className={styles.coinFloat} variant="live" />
        )}
        {!isPlaying && !showSummary && <p className={styles.pausedLabel} role="status">运动已暂停</p>}
        <dl className={styles.metrics} aria-label="运动数据">
          <div className={styles.elapsedTime}><dt>时间</dt><dd>{formatTime(time)}</dd></div>
          <div><dt>速度 <small>km/h</small></dt><dd>{Number(currentKmh.toFixed(1))}</dd></div>
          <div><dt>坡度</dt><dd>{inclineLevel}</dd></div>
          <div><dt>千卡</dt><dd>{Math.round(distance * 65)}</dd></div>
        </dl>
        {!showSummary && <RunPlaybackMusic audioRef={musicRef} track={musicTrack} runActive={runActive} />}
        {runActive && sceneryStatus === 'loading' && (
          <p className={styles.sceneryNotice} role="status">正在加载视频…</p>
        )}
        {runActive && sceneryStatus === 'retry' && (
          <button className={styles.sceneryNotice} type="button" onClick={() => playScenery(true)}>
            <Play size={16} aria-hidden="true" /> 点按播放视频
          </button>
        )}
        {speed?.mode === 'smart' && !showSummary && <SmartSpeedChart speed={speed} routeKm={plannedDistance} routeSeconds={plannedDuration} elapsed={time} actual={speedSamples} />}
        {!showSummary && (
          <div className={styles.playbackControls}>
            {!showRunActions && <>
              <div className={styles.mediaControls}>
                <button type="button" disabled>高清</button>
                <button type="button" aria-label="全屏" disabled><Maximize2 size={18} aria-hidden="true" /></button>
                <button type="button" aria-label="投屏" disabled><Airplay size={18} aria-hidden="true" /></button>
              </div>
              <button ref={speedControlRef} type="button"
                aria-label="调整跑步速度" aria-haspopup="dialog" title={speed?.mode === 'smart' ? '智能变速' : '自定义速度'}
                onClick={() => setShowSpeedPicker(true)}>
                速度
              </button>
            </>}
            <button
              type="button"
              className={styles.quickPause}
              aria-label={isPlaying ? '暂停跑步' : '继续跑步'}
              aria-haspopup={isPlaying ? 'dialog' : undefined}
              onClick={toggleRunPause}
            >
              {isPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            </button>
          </div>
        )}
      </main>

      {showSpeedPicker && <RunSpeedDrawer currentKmh={currentKmh} onClose={closeSpeedPicker}
        onSpeedChange={kmh => setProgress(previous => ({ ...previous, speed: { mode: 'custom', kmh } }))} />}

      {showRunActions && !showSummary && (
        <Modal labelId={runActionsTitleId} onClose={() => setShowRunActions(false)} className={styles.runActions} backdropClassName={styles.runActionsBackdrop}>
          <header className={styles.pauseHeader}>
            <span className={styles.pauseMark} aria-hidden="true"><Pause size={18} /></span>
            <div>
              <h2 id={runActionsTitleId}>运动已暂停</h2>
              <p>{cityName} · {route.title}</p>
            </div>
            <button type="button" className={styles.closePause} aria-label="关闭暂停提示" onClick={() => setShowRunActions(false)}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className={styles.decisionButtons}>
            <button type="button" className={styles.endDecision} onClick={finishRun}>结束运动</button>
            <button type="button" className={styles.primaryDecision} onClick={toggleRunPause}><Play size={15} aria-hidden="true" />继续跑步</button>
          </div>
        </Modal>
      )}

      {showSummary && (
        <Modal labelId={runSummaryTitleId} className={styles.summaryDialog} backdropClassName={styles.summaryBackdrop}>
          <header className={styles.summaryHeader}>
            <div className={styles.summaryHeading}>
              <h2 id={runSummaryTitleId}>{simulatedPartial ? '运动已结束' : routeFinished ? '路线已完成' : '路线尚未完成'}</h2>
              <p className={styles.summaryRoute}>{cityName} · {route.title}</p>
            </div>
            <span className={styles.summaryDate}>{todayDateStr}</span>
          </header>

          <div className={styles.summaryBody} tabIndex={0} role="region" aria-label="运动明细">
            <dl className={styles.summaryStats}>
              <div>
                <dt>实际里程</dt>
                <dd>{result.distance.toFixed(2)} <small>km</small></dd>
              </div>
              <div>
                <dt>路线时长</dt>
                <dd>{formatTime(result.duration)}</dd>
              </div>
              <div>
                <dt>实际消耗</dt>
                <dd>{result.calories} <small>kcal</small></dd>
              </div>
            </dl>

            {coinRewards?.demo && !requireFullRoute && (manuallySimulated
              ? <small className={styles.coinDemoNote}>本次为模拟有效运动</small>
              : <div className={styles.coinDemoActions}>
                <button type="button" onClick={() => simulateCoinWorkout(false)}>模拟运动 1 km</button>
                <button type="button" onClick={() => simulateCoinWorkout(true)}>模拟通关</button>
              </div>)}
            {earnsMedals && medalNames.length > 0 && <section className={styles.summaryMedals} aria-label="获得景点勋章">
              <h3><Award size={14} aria-hidden="true" /> 获得景点勋章</h3>
              <ul>
                {medalNames.map(name => (
                  <li key={name}>
                    <Award size={13} aria-hidden="true" />{name}
                  </li>
                ))}
              </ul>
            </section>}
          </div>

          <footer className={styles.summaryFooter}>
            <div className={styles.summaryButtons}>
              <button type="button" onClick={() => routeFinished ? onComplete(result, coinEvidence) : onExit()}>
                {routeFinished ? '完成' : '返回路线详情'}
              </button>
              {!routeFinished && !simulatedPartial && <button type="button" onClick={() => {
                setShowSummary(false);
                setIsPlaying(true);
              }}>
                继续这条路线 <ArrowRight size={15} aria-hidden="true" />
              </button>}
            </div>
          </footer>
        </Modal>
      )}
    </div>
  );
}
