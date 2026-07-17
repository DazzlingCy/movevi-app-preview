import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, useMotionValue, animate, AnimatePresence, useReducedMotion } from 'motion/react';
import { Award, Zap, ChevronRight, X, CheckCircle2, Lock, MapPin, Route, Milestone, Activity, Plane, Compass, RefreshCw, ClipboardCheck, Gift, Sparkles, LocateFixed, Footprints } from 'lucide-react';
import { CITIES, CityData } from '../data/cities';
import { cn } from '../lib/utils';
import { getGlowRank } from '../lib/glow';
import ActivityQuickLaunch, { type ActivityDrawCounts } from './ActivityQuickLaunch';

const MAP_FOCUS_Y_OFFSET = -94;

function LocalWorldMap() {
  const landClass = "fill-slate-200/55 stroke-cyan-100/30";
  const glowClass = "fill-cyan-200/12";

  return (
    <svg
      viewBox="0 0 1200 800"
      className="absolute inset-0 h-full w-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <filter id="world-map-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#world-map-glow)">
        <path className={glowClass} d="M95 170L160 112L255 105L330 145L365 218L325 300L245 338L160 315L92 250Z" />
        <path className={glowClass} d="M355 350L430 385L455 490L425 640L360 705L320 618L305 500Z" />
        <path className={glowClass} d="M500 190L610 150L705 185L735 265L650 315L545 285Z" />
        <path className={glowClass} d="M610 315L700 335L742 455L705 612L610 600L560 485Z" />
        <path className={glowClass} d="M675 185L850 125L1065 170L1120 280L1010 380L820 355L705 285Z" />
        <path className={glowClass} d="M930 520L1045 545L1100 625L1030 680L920 640Z" />
      </g>
      <g strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
        <path className={landClass} d="M88 178L143 120L230 95L307 118L358 166L382 230L345 282L290 315L215 330L145 306L86 255L60 205Z" />
        <path className={landClass} d="M245 96L282 70L345 82L386 116L350 150L298 132Z" />
        <path className={landClass} d="M366 332L430 365L470 435L452 548L410 655L350 710L318 620L300 520L323 420Z" />
        <path className={landClass} d="M498 204L548 163L632 152L700 190L715 248L654 296L565 285L510 250Z" />
        <path className={landClass} d="M610 306L690 328L742 410L735 520L694 624L625 604L575 520L550 430Z" />
        <path className={landClass} d="M680 184L790 128L930 118L1062 160L1134 230L1110 320L1018 386L875 374L750 325L705 252Z" />
        <path className={landClass} d="M780 330L830 358L812 410L750 390Z" />
        <path className={landClass} d="M915 516L1025 538L1102 605L1074 665L980 684L910 638Z" />
        <path className={landClass} d="M642 612L678 638L650 680L610 650Z" />
        <path className={landClass} d="M530 165L548 132L585 142L570 178Z" />
      </g>
    </svg>
  );
}

type MapCityNodeProps = {
  key?: React.Key;
  city: CityData;
  isCurrent: boolean;
  isLit: boolean;
  reduceMotion: boolean;
  onSelect: (city: CityData) => void;
};

function MapCityNode({
  city,
  isCurrent,
  isLit,
  reduceMotion,
  onSelect
}: MapCityNodeProps) {
  const isUpcoming = city.status === 'upcoming';
  const labelPositionClass = city.labelPosition === 'top'
    ? 'bottom-9 left-1/2 -translate-x-1/2'
    : city.labelPosition === 'bottom'
      ? 'top-9 left-1/2 -translate-x-1/2'
      : city.labelPosition === 'left'
        ? 'right-9 top-1/2 -translate-y-1/2'
        : 'left-9 top-1/2 -translate-y-1/2';
  const progressLabel = `${city.completed}/${city.routes} 路线`;
  const ariaLabel = isCurrent
    ? `${city.name}，正在进行中，已完成 ${progressLabel}`
    : isLit
      ? `${city.name}，已点亮城市`
      : isUpcoming
        ? `${city.name}，未上线`
        : `${city.name}，未点亮城市`;

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      className="absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
      style={{ left: `${city.x}%`, top: `${city.y}%` }}
      whileHover={reduceMotion ? undefined : { scale: 1.06, zIndex: 50 }}
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(city);
      }}
    >
      {isCurrent && (
        <>
          <motion.span
            aria-hidden="true"
            className="absolute h-8 w-8 rounded-full border border-[#ffd666]/60 bg-[#ffd666]/20 shadow-[0_0_22px_rgba(255,214,102,0.34)]"
            animate={reduceMotion ? undefined : { scale: [0.9, 1.15, 0.9], opacity: [0.5, 0.9, 0.5] }}
            transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span aria-hidden="true" className="absolute h-5 w-5 rounded-full border border-[#fff2bd]/75 bg-[#ffd666]/25" />
        </>
      )}

      {!isCurrent && isLit && (
        <span aria-hidden="true" className="absolute h-8 w-8 rounded-full border border-[#b9f3ff]/90 bg-[#64d2ff]/35 shadow-[0_0_26px_rgba(100,210,255,0.62),inset_0_0_12px_rgba(185,243,255,0.18)]" />
      )}

      {isCurrent && (
        <span aria-hidden="true" className="relative z-10 flex h-5 w-5 items-center justify-center">
          <span className="absolute h-[2px] w-8 bg-gradient-to-r from-transparent via-[#fff0a6] to-transparent shadow-[0_0_10px_rgba(255,214,102,0.75)]" />
          <span className="absolute h-8 w-[2px] bg-gradient-to-b from-transparent via-[#fff0a6] to-transparent shadow-[0_0_10px_rgba(255,214,102,0.75)]" />
          <span className="relative h-3.5 w-3.5 rounded-full border-2 border-white bg-[#ffe278] shadow-[0_0_24px_rgba(255,214,102,1)]" />
        </span>
      )}

      {!isCurrent && isLit && (
        <span aria-hidden="true" className="relative z-10 flex h-5 w-5 items-center justify-center">
          <span className="h-4 w-4 rounded-full border-2 border-white bg-[#aef2ff] shadow-[0_0_7px_rgba(255,255,255,0.9),0_0_26px_rgba(100,210,255,1)]" />
        </span>
      )}

      {!isCurrent && !isLit && !isUpcoming && (
        <span aria-hidden="true" className="relative z-10 h-3.5 w-3.5 rounded-full border-2 border-[#f2f7f8] bg-[#91a5ac] shadow-[0_0_16px_rgba(210,224,229,0.58)]" />
      )}

      {isUpcoming && (
        <span aria-hidden="true" className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-white/35 bg-white/10 text-white/55 shadow-[0_0_10px_rgba(255,255,255,0.12)]">
          <Lock size={9} strokeWidth={1.8} />
        </span>
      )}

      {isCurrent && (
        <span className={cn('pointer-events-none absolute z-30 min-w-[112px] rounded-[15px] border border-amber-200/15 bg-[#17140d]/92 px-2.5 py-2 text-left shadow-[0_10px_26px_rgba(0,0,0,0.3)] backdrop-blur-xl', labelPositionClass)}>
          <span className="block text-[8px] font-semibold tracking-[0.14em] text-amber-200/65">进行中</span>
          <span className="mt-0.5 block whitespace-nowrap text-[11px] font-semibold tracking-[-0.01em] text-white">{city.name} · {progressLabel}</span>
        </span>
      )}

      {!isCurrent && !isUpcoming && (
        <span className={cn(
          'pointer-events-none absolute z-30 flex items-center gap-1 whitespace-nowrap rounded-[10px] border px-2 py-1 text-[9px] font-medium backdrop-blur-lg',
          isLit
            ? 'border-[var(--accent)]/15 bg-[#091418]/88 text-[#a9eaff]'
            : 'border-white/[0.12] bg-[#0b1114]/84 text-white/62',
          labelPositionClass
        )}>
          {isLit ? <span className="h-1.5 w-1.5 rounded-full border border-white bg-[#8cecff] shadow-[0_0_8px_rgba(100,210,255,0.9)]" /> : <span className="h-1.5 w-1.5 rounded-full border border-[#e6f0f2] bg-[#7a8e96] shadow-[0_0_6px_rgba(210,224,229,0.45)]" />}
          {city.name}
        </span>
      )}

      {isUpcoming && (
        <span className={cn('pointer-events-none absolute z-30 flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-white/[0.12] bg-black/62 px-2 py-1 text-[8px] font-medium text-white/44', labelPositionClass)}>
          <Lock size={9} strokeWidth={1.8} />
          未上线
        </span>
      )}
    </motion.button>
  );
}

type CityDiscoverySheetProps = {
  city: CityData;
  isCurrent: boolean;
  reduceMotion: boolean;
  onClose: () => void;
  onAction: (city: CityData) => void;
};

function CityDiscoverySheet({ city, isCurrent, reduceMotion, onClose, onAction }: CityDiscoverySheetProps) {
  const isUpcoming = city.status === 'upcoming';
  const isLit = city.status === 'lit';
  const completion = city.status === 'lit' ? 100 : Math.round((city.completed / city.routes) * 100);
  const actionLabel = isCurrent ? '继续路线' : isLit ? '探索这座城市' : '查看城市';
  const titleId = `city-discovery-${city.id}`;

  return (
    <motion.div
      role="presentation"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-end bg-black/35 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.99 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
        className="premium-material-strong relative w-full overflow-hidden rounded-[30px] p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[22px] border border-white/[0.09] bg-white/[0.04]">
            <img src={city.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={cn('text-[9px] font-semibold tracking-[0.12em]', isCurrent ? 'text-amber-200/65' : isLit ? 'text-[var(--accent)]/70' : 'text-white/35')}>
                  {isCurrent ? '正在进行中' : isLit ? '已点亮城市' : isUpcoming ? '城市未上线' : '未点亮城市'}
                </p>
                <h2 id={titleId} className="mt-1 truncate text-[21px] font-semibold tracking-[-0.025em] text-white">{city.name}</h2>
                <p className="mt-0.5 text-[10px] font-medium text-white/35">{city.englishName} · {city.continent}</p>
              </div>
              <button
                type="button"
                autoFocus
                aria-label="关闭城市探索卡"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-white/50 transition-colors hover:bg-white/[0.09] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <X size={17} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-[11px] leading-[1.65] text-white/45">{city.description}</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: '路线', value: city.routes },
            { label: '记忆点', value: city.spots },
            { label: '完成度', value: `${completion}%` }
          ].map((item) => (
            <div key={item.label} className="rounded-[16px] border border-white/[0.065] bg-white/[0.035] px-3 py-2.5">
              <p className="text-[9px] font-medium text-white/30">{item.label}</p>
              <p className="mt-1 font-mono text-[13px] font-semibold text-white/80">{item.value}</p>
            </div>
          ))}
        </div>

        {isUpcoming ? (
          <div className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-white/[0.065] bg-white/[0.035] text-[11px] font-medium text-white/35">
            <Lock size={14} strokeWidth={1.8} />
            该城市暂未上线
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAction(city)}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--accent)] px-4 text-[12px] font-semibold text-[#061116] transition-colors hover:bg-[#93e3ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Footprints size={16} strokeWidth={2} />
            {actionLabel}
          </button>
        )}
      </motion.section>
    </motion.div>
  );
}

export default function HomeTab({ onNavigate, completedChapters = [], targetFlight, sessionCompletedFlights = [], onFlightComplete, pendingSelectionFrom, onCitySelected, litCityIds = [], userStats, setUserStats, taskPanelOpenSignal = 0, onSelectMedley, onSelectMedalLottery, onSelectWeightLossPlan, onSelectHundredCities, onViewAllEvents, activityDrawCounts }: { onNavigate?: (type: string, data: any) => void; completedChapters?: number[]; targetFlight?: {fromCityId: string, toCityId: string} | null; sessionCompletedFlights?: Array<{fromCityId: string; toCityId: string}>; onFlightComplete?: () => void; pendingSelectionFrom?: string | null; onCitySelected?: (cityId: string) => void; litCityIds?: string[]; userStats?: any; setUserStats?: any; taskPanelOpenSignal?: number; onSelectMedley?: () => void; onSelectMedalLottery?: () => void; onSelectWeightLossPlan?: () => void; onSelectHundredCities?: () => void; onViewAllEvents?: () => void; activityDrawCounts?: ActivityDrawCounts; }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showStoryPanel, setShowStoryPanel] = useState(false);
  const [showCitySelection, setShowCitySelection] = useState(false);
  const [selectableCities, setSelectableCities] = useState<CityData[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [isTreadmillConnected, setIsTreadmillConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [rewardBurst, setRewardBurst] = useState<{ id: number; reward: number; title: string } | null>(null);
  const [showMapHint, setShowMapHint] = useState(true);
  const reduceMotion = !!useReducedMotion();
  const currentGlowRank = getGlowRank(userStats?.lifetimeLightValue ?? userStats?.lightValue ?? 0).current;
  const avatarFrameStyles: Record<number, { ring: string; shadow: string; badge: string }> = {
    1: { ring: 'from-orange-200 via-amber-500 to-stone-700', shadow: 'shadow-[0_8px_22px_rgba(251,146,60,0.16)]', badge: 'text-orange-200' },
    2: { ring: 'from-white via-slate-300 to-slate-600', shadow: 'shadow-[0_8px_22px_rgba(226,232,240,0.14)]', badge: 'text-slate-100' },
    3: { ring: 'from-[#fff3bd] via-[#d6ad55] to-[#574018]', shadow: 'shadow-[0_8px_22px_rgba(251,191,36,0.18)]', badge: 'text-amber-200' },
    4: { ring: 'from-cyan-100 via-sky-300 to-blue-700', shadow: 'shadow-[0_8px_22px_rgba(100,210,255,0.16)]', badge: 'text-cyan-200' },
    5: { ring: 'from-fuchsia-100 via-violet-300 to-indigo-700', shadow: 'shadow-[0_8px_22px_rgba(167,139,250,0.17)]', badge: 'text-fuchsia-200' },
    6: { ring: 'from-rose-100 via-amber-200 to-yellow-500', shadow: 'shadow-[0_8px_22px_rgba(251,113,133,0.17)]', badge: 'text-rose-100' }
  };
  const avatarFrame = avatarFrameStyles[currentGlowRank.level] || avatarFrameStyles[1];

  useEffect(() => {
    if (userStats?.dailyTreadmillStarted) {
      setIsTreadmillConnected(true);
    }
  }, [userStats?.dailyTreadmillStarted]);

  useEffect(() => {
    if (pendingSelectionFrom) {
      const available = CITIES.filter(c => c.status !== 'lit' && c.status !== 'upcoming' && c.id !== pendingSelectionFrom);
      const shuffled = [...available].sort(() => 0.5 - Math.random());
      setSelectableCities(shuffled.slice(0, 3));
      setShowCitySelection(true);
    }
  }, [pendingSelectionFrom]);

  useEffect(() => {
    if (taskPanelOpenSignal > 0) {
      setShowTaskPanel(true);
    }
  }, [taskPanelOpenSignal]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowMapHint(false), 4200);
    return () => window.clearTimeout(timer);
  }, []);

  const litCount = CITIES.filter(c => c.status === 'lit').length;
  const inProgressCity = CITIES.find(c => c.status === 'in-progress');
  const sessionJourneySegments = useMemo(() => (
    sessionCompletedFlights.flatMap((flight) => {
      const fromCity = CITIES.find(city => city.id === flight.fromCityId);
      const toCity = CITIES.find(city => city.id === flight.toCityId);
      return fromCity && toCity ? [{ fromCity, toCity }] : [];
    })
  ), [sessionCompletedFlights]);

  const numMap = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

  let progressWidth = '0%';
  let journeyPromptText = '选择第一座城市，开始唤醒地球记忆';
  
  if (litCityIds.length === 0) {
    progressWidth = '0%';
  } else if (inProgressCity) {
    progressWidth = `${(inProgressCity.completed / inProgressCity.routes) * 100}%`;
    const remainingRoutes = Math.max(0, inProgressCity.routes - inProgressCity.completed);
    journeyPromptText = remainingRoutes > 0
      ? `再完成 ${remainingRoutes} 条路线，点亮${inProgressCity.name}`
      : `${inProgressCity.name}已完成，选择下一站`;
  } else if (litCount > 0 && litCount === CITIES.length) {
    progressWidth = '100%';
    journeyPromptText = '地球记忆已全部点亮';
  } else {
     // If everything is lit but some are still in progress? 
     // Or if we just finished one and haven't picked next
     const lastLitId = litCityIds[litCityIds.length - 1];
     const lastLitCity = CITIES.find(c => c.id === lastLitId);
      if (lastLitCity) {
        progressWidth = '100%';
        journeyPromptText = `从${lastLitCity.name}出发，选择下一座城市`;
      }
  }

  const handleConnectTreadmill = () => {
    setIsTreadmillConnected(true);
    if (setUserStats) {
      setUserStats((prev: any) => ({
        ...prev,
        dailyTreadmillStarted: true
      }));
    }
    setToastMessage('跑步机连接功能已启用，设备已连接');
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const triggerRewardBurst = (reward: number, title: string) => {
    const id = Date.now();
    setRewardBurst({ id, reward, title });
    window.setTimeout(() => {
      setRewardBurst(current => current?.id === id ? null : current);
    }, 1800);
  };

  const claimedDailyTaskIds: string[] = userStats?.claimedDailyTaskIds || [];
  const claimedWeeklyTaskIds: string[] = userStats?.claimedWeeklyTaskIds || [];
  const dailyTasks = [
    {
      id: 'daily-checkin',
      title: '每日签到',
      progress: userStats?.dailyCheckedIn ? 1 : 0,
      target: 1,
      reward: 1,
      actionLabel: '签到',
      ready: !userStats?.dailyCheckedIn,
      claimed: !!userStats?.dailyCheckedIn
    },
    {
      id: 'daily-route',
      title: '今日完成 1 条路线',
      progress: Math.min(userStats?.dailyCompletedRoutes || 0, 1),
      target: 1,
      reward: 2,
      ready: (userStats?.dailyCompletedRoutes || 0) >= 1,
      claimed: claimedDailyTaskIds.includes('daily-route')
    },
    {
      id: 'daily-treadmill',
      title: '今日启动一次跑步机',
      progress: userStats?.dailyTreadmillStarted ? 1 : 0,
      target: 1,
      reward: 1,
      ready: !!userStats?.dailyTreadmillStarted,
      claimed: claimedDailyTaskIds.includes('daily-treadmill')
    }
  ];
  const orderedDailyTasks = [...dailyTasks].sort((a, b) => {
    const order = ['daily-checkin', 'daily-treadmill', 'daily-route'];
    return order.indexOf(a.id) - order.indexOf(b.id);
  });
  const claimableDailyTasks = orderedDailyTasks.filter(task => task.ready && !task.claimed);
  const hasClaimableDailyReward = claimableDailyTasks.length > 0;
  const weeklyTasks = [
    {
      id: 'weekly-city',
      title: '本周完成 1 座城市',
      progress: Math.min(userStats?.weeklyCompletedCities || 0, 1),
      target: 1,
      reward: 10,
      ready: (userStats?.weeklyCompletedCities || 0) >= 1,
      claimed: claimedWeeklyTaskIds.includes('weekly-city')
    }
  ];
  const completedDailyCount = orderedDailyTasks.filter(task => task.claimed || task.ready).length;
  const completedWeeklyCount = weeklyTasks.filter(task => task.claimed || task.ready).length;
  const allGlowTasks = [...orderedDailyTasks, ...weeklyTasks];
  const totalTaskCount = allGlowTasks.length;
  const completedTaskCount = completedDailyCount + completedWeeklyCount;
  const handleClaimDailyTask = (taskId: string, reward: number) => {
    if (!setUserStats) return;

    if (taskId === 'daily-checkin') {
      if (userStats?.dailyCheckedIn) return;
      setUserStats((prev: any) => ({
        ...prev,
        dailyCheckedIn: true,
        lightValue: (prev.lightValue || 0) + reward,
        lifetimeLightValue: (prev.lifetimeLightValue ?? prev.lightValue ?? 0) + reward
      }));
      triggerRewardBurst(reward, '签到成功');
      showToast(`签到成功，获得 ${reward} 点光迹值`);
      return;
    }

    if (claimedDailyTaskIds.includes(taskId)) return;
    setUserStats((prev: any) => ({
      ...prev,
      claimedDailyTaskIds: [...(prev.claimedDailyTaskIds || []), taskId],
      lightValue: (prev.lightValue || 0) + reward,
      lifetimeLightValue: (prev.lifetimeLightValue ?? prev.lightValue ?? 0) + reward
    }));
    triggerRewardBurst(reward, '任务完成');
    showToast(`获得 ${reward} 点光迹值`);
  };

  const handleClaimWeeklyTask = (taskId: string, reward: number) => {
    if (!setUserStats || claimedWeeklyTaskIds.includes(taskId)) return;
    setUserStats((prev: any) => ({
      ...prev,
      claimedWeeklyTaskIds: [...(prev.claimedWeeklyTaskIds || []), taskId],
      lightValue: (prev.lightValue || 0) + reward,
      lifetimeLightValue: (prev.lifetimeLightValue ?? prev.lightValue ?? 0) + reward
    }));
    triggerRewardBurst(reward, '本周任务完成');
    showToast(`获得 ${reward} 点光迹值`);
  };

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    if (targetFlight) {
        const fromCity = CITIES.find(c => c.id === targetFlight.fromCityId);
        const toCity = CITIES.find(c => c.id === targetFlight.toCityId);
        if (fromCity && toCity) {
            const mapWidth = 1200;
            const mapHeight = 800;
            const startOffsetX = (0.5 - fromCity.x / 100) * mapWidth;
            const startOffsetY = (0.5 - fromCity.y / 100) * mapHeight + MAP_FOCUS_Y_OFFSET;
            const endOffsetX = (0.5 - toCity.x / 100) * mapWidth;
            const endOffsetY = (0.5 - toCity.y / 100) * mapHeight + MAP_FOCUS_Y_OFFSET;

             x.set(startOffsetX);
             y.set(startOffsetY);
             setScale(1.2);

             if (reduceMotion) {
               x.set(endOffsetX);
               y.set(endOffsetY);
               setSelectedCity(toCity);
               onFlightComplete?.();
               return;
             }

             setTimeout(() => {
               animate(x, endOffsetX, { type: 'spring', bounce: 0, duration: 3 });
               animate(y, endOffsetY, { type: 'spring', bounce: 0, duration: 3 });
             }, 500);

            setTimeout(() => {
                setSelectedCity(toCity);
                if (onFlightComplete) {
                    onFlightComplete();
                }
            }, 3600);
        }
        return;
    }

    // Focus on the in-progress city on initial load if no target flight
    const inProgressCity = CITIES.find(c => c.status === 'in-progress') || CITIES[0];

    const mapWidth = 1200;
    const mapHeight = 800;
    const offsetX = (0.5 - inProgressCity.x / 100) * mapWidth;
    const offsetY = (0.5 - inProgressCity.y / 100) * mapHeight + MAP_FOCUS_Y_OFFSET;
    
    if (reduceMotion) {
      x.set(offsetX);
      y.set(offsetY);
    } else {
      animate(x, offsetX, { duration: 0.6, ease: 'easeOut' });
      animate(y, offsetY, { duration: 0.6, ease: 'easeOut' });
    }
    setScale(1.08);
  }, [x, y, targetFlight, onFlightComplete, reduceMotion]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));

  const touchDistance = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setShowMapHint(false);
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - touchDistance.current;
      setScale(prev => Math.min(Math.max(prev + delta * 0.01, 0.5), 3));
      touchDistance.current = dist;
    }
  };

  const handleTouchEnd = () => {
    touchDistance.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    setShowMapHint(false);
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.1, 3));
    } else {
      setScale(prev => Math.max(prev - 0.1, 0.5));
    }
  };

  const handleStartExplore = () => {
    setShowStoryPanel(false);
    
    if (inProgressCity) {
      setSelectedCity(inProgressCity);
    } else {
      // Pick 3 available cities (not lit, not upcoming)
      const available = CITIES.filter(c => c.status !== 'lit' && c.status !== 'upcoming');
      const shuffled = [...available].sort(() => 0.5 - Math.random());
      setSelectableCities(shuffled.slice(0, 3));
      setShowCitySelection(true);
    }
  };

  const handleShuffleCities = (e: React.MouseEvent) => {
    e.stopPropagation();
    let available = CITIES.filter(c => c.status !== 'lit' && c.status !== 'upcoming');
    if (pendingSelectionFrom) {
      available = available.filter(c => c.id !== pendingSelectionFrom);
    }
    const currentIds = new Set(selectableCities.map(c => c.id));
    let remaining = available.filter(c => !currentIds.has(c.id));
    if (remaining.length < 3) {
      remaining = [...available].sort(() => 0.5 - Math.random());
    } else {
      remaining = remaining.sort(() => 0.5 - Math.random());
    }
    setSelectableCities(remaining.slice(0, 3));
  };

  const handleCitySelect = (city: CityData) => {
    setShowCitySelection(false);
    
    // Set status to in-progress for selected city
    CITIES.forEach(c => {
      if (c.status === 'in-progress') {
        c.status = 'unlit';
      }
    });
    city.status = 'in-progress';

    if (onCitySelected) {
      onCitySelected(city.id);
    }
    
    if (!pendingSelectionFrom) {
      // Default map is 1200x800
      const mapWidth = 1200;
      const mapHeight = 800;
      
      // Find offset
      const offsetX = (0.5 - city.x / 100) * mapWidth;
      const offsetY = (0.5 - city.y / 100) * mapHeight + MAP_FOCUS_Y_OFFSET;
      
      animate(x, offsetX, { type: 'spring', bounce: 0, duration: 0.8 });
      animate(y, offsetY, { type: 'spring', bounce: 0, duration: 0.8 });
      setScale(1.08);
      
      setTimeout(() => {
        setSelectedCity(city);
      }, 800);
    }
  };

  const handleCityClick = (city: CityData) => {
    setShowMapHint(false);
    setSelectedCity(city);
  };

  const handleLocateCurrentCity = () => {
    const city = CITIES.find(candidate => candidate.status === 'in-progress') || CITIES[0];
    const mapWidth = 1200;
    const mapHeight = 800;
    const offsetX = (0.5 - city.x / 100) * mapWidth;
    const offsetY = (0.5 - city.y / 100) * mapHeight + MAP_FOCUS_Y_OFFSET;

    setShowMapHint(false);
    setScale(1.08);
    if (reduceMotion) {
      x.set(offsetX);
      y.set(offsetY);
      return;
    }

    animate(x, offsetX, { duration: 0.48, ease: 'easeOut' });
    animate(y, offsetY, { duration: 0.48, ease: 'easeOut' });
  };

  const handleCitySheetAction = (city: CityData) => {
    setSelectedCity(null);
    if (city.status !== 'upcoming' && onNavigate) {
      onNavigate('cityRoutes', city);
    }
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[var(--app-bg)]">
      <div className="premium-map-wash pointer-events-none absolute inset-0 z-0" />

      {/* Pannable/Zoomable Map Area */}
      <div 
        className="w-full h-full relative cursor-grab active:cursor-grabbing z-10 touch-none"
        ref={containerRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <motion.div
          drag
          dragConstraints={containerRef}
          dragElastic={0.2}
          onDragStart={() => setShowMapHint(false)}
          style={{ 
            x, 
            y,
            backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg")',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.82,
            filter: 'contrast(1.06) brightness(0.62) saturate(0.62)'
          }}
          animate={{ scale }}
          transition={{ scale: reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.1, duration: 0.4 } }}
          className="absolute top-1/2 left-1/2 w-[1200px] h-[800px] -translate-x-1/2 -translate-y-1/2 origin-center"
        >
          {/* Only keep routes completed during the current app session. */}
          {sessionJourneySegments.length > 0 && (
            <svg
              viewBox="0 0 1200 800"
              className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="journey-trail-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(100,210,255,0.18)" />
                  <stop offset="70%" stopColor="rgba(100,210,255,0.48)" />
                  <stop offset="100%" stopColor="rgba(255,214,102,0.62)" />
                </linearGradient>
              </defs>
              {sessionJourneySegments.map(({ fromCity, toCity }, index) => {
                const x1 = (fromCity.x / 100) * 1200;
                const y1 = (fromCity.y / 100) * 800;
                const x2 = (toCity.x / 100) * 1200;
                const y2 = (toCity.y / 100) * 800;
                const curveX = (x1 + x2) / 2 + (y2 - y1) * 0.14;
                const curveY = (y1 + y2) / 2 - (x2 - x1) * 0.14;
                const path = `M ${x1} ${y1} Q ${curveX} ${curveY} ${x2} ${y2}`;

                return (
                  <motion.path
                    key={`${fromCity.id}-${toCity.id}`}
                    d={path}
                    fill="transparent"
                    stroke="url(#journey-trail-gradient)"
                    strokeWidth="2"
                    strokeDasharray="7 11"
                    strokeLinecap="round"
                    initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : index * 0.08, ease: 'easeOut' }}
                  />
                );
              })}
            </svg>
          )}

          {/* Cities Nodes */}
          {CITIES.map((city) => (
            <MapCityNode
              key={city.id}
              city={city}
              isCurrent={city.id === inProgressCity?.id}
              isLit={city.status === 'lit'}
              reduceMotion={reduceMotion}
              onSelect={handleCityClick}
            />
          ))}

          {/* Flight Path Animation */}
          {(() => {
            if (!targetFlight) return null;
            const fc = CITIES.find(c => c.id === targetFlight.fromCityId);
            const tc = CITIES.find(c => c.id === targetFlight.toCityId);
            if (!fc || !tc) return null;

            const x1 = (fc.x / 100) * 1200;
            const y1 = (fc.y / 100) * 800;
            const x2 = (tc.x / 100) * 1200;
            const y2 = (tc.y / 100) * 800;

            const cx = (x1 + x2) / 2 + (y2 - y1) * 0.2;
            const cy = (y1 + y2) / 2 - (x2 - x1) * 0.2;

            const pathObj = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

            return (
              <div className="absolute inset-0 pointer-events-none z-30">
                <svg className="absolute inset-0 w-full h-full overflow-visible">
                  <motion.path 
                     d={pathObj}
                     fill="transparent"
                     strokeDasharray="8 8"
                     stroke="rgba(34,211,238, 0.6)"
                     strokeWidth="3"
                     strokeLinecap="round"
                     initial={{ pathLength: 0 }}
                     animate={{ pathLength: 1 }}
                     transition={{ duration: 3, delay: 0.5, ease: "easeInOut" }}
                   />
                   <motion.path 
                     d={pathObj}
                     fill="transparent"
                     stroke="rgba(251,191,36, 0.4)"
                     strokeWidth="5"
                     strokeLinecap="round"
                     className="blur-[8px]"
                     initial={{ pathLength: 0 }}
                     animate={{ pathLength: 1 }}
                     transition={{ duration: 3, delay: 0.5, ease: "easeInOut" }}
                   />
                </svg>
                <div className="absolute top-0 left-0 w-full h-full"> 
                   <motion.div
                     className="absolute flex flex-col items-center justify-center text-white pointer-events-none"
                     style={{ 
                       top: 0, 
                       left: 0,
                       offsetPath: `path('${pathObj}')`,
                       offsetRotate: "auto 45deg"
                     }}
                     initial={{ offsetDistance: "0%", opacity: 0 }}
                     animate={{ offsetDistance: "100%", opacity: 1 }}
                     transition={{ 
                        opacity: { duration: 0.1, delay: 0.5 },
                        offsetDistance: { duration: 3, delay: 0.5, ease: "easeInOut" } 
                     }}
                   >
                     <Plane size={20} fill="white" className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ transform: 'translate(-50%, -50%)' }} />
                   </motion.div>
                </div>
              </div>
            );
          })()}
        </motion.div>
      </div>

      <div className="premium-vignette pointer-events-none absolute inset-0 z-[11]" />

      <button
        type="button"
        aria-label="定位当前探索城市"
        onClick={handleLocateCurrentCity}
        className="premium-material absolute right-4 top-[88px] z-20 flex h-11 w-11 items-center justify-center rounded-full text-white/55 transition-colors duration-200 hover:bg-white/[0.08] hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <LocateFixed size={18} strokeWidth={1.8} />
      </button>

      <AnimatePresence>
        {showMapHint && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
            className="pointer-events-none absolute left-1/2 top-[142px] z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/[0.07] bg-[#0a0e11]/78 px-3 py-2 text-[9px] font-medium text-white/38 shadow-lg backdrop-blur-xl"
          >
            拖动地图 · 轻触城市探索
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD: profile and device state */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('glowCenter', null)}
            className="premium-material pointer-events-auto flex min-w-0 items-center gap-2.5 rounded-[24px] p-1.5 pr-3.5 text-left transition-colors duration-200 hover:bg-white/[0.075] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <div className={`relative h-11 w-11 shrink-0 rounded-full bg-gradient-to-br ${avatarFrame.ring} p-[2px] ${avatarFrame.shadow}`}>
              <div className="h-full w-full rounded-full bg-slate-950 p-[2px]">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100"
                  alt="木小六的头像"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-slate-950/95 px-1.5 py-[1px] text-[8px] font-black leading-none ${avatarFrame.badge}`}>
                LV.{currentGlowRank.level}
              </div>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.015em] text-white">木小六</p>
              <p className="mt-0.5 text-[10px] font-medium text-amber-200/75">
                {currentGlowRank.name}段位
              </p>
            </div>
          </button>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              aria-label={`查看光迹值，当前 ${userStats?.lightValue || 120}`}
              onClick={() => onNavigate && onNavigate('glowCenter', null)}
              className="premium-material flex min-h-12 items-center gap-2 rounded-[20px] px-3 text-white/80 transition-colors duration-200 hover:bg-white/[0.075] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <Sparkles size={15} strokeWidth={1.9} className="text-[var(--accent)]" />
              <span className="font-mono text-[13px] font-semibold">{userStats?.lightValue || 120}</span>
            </button>
            <button
              type="button"
              aria-label={isTreadmillConnected ? '跑步机已连接' : '连接跑步机'}
              onClick={handleConnectTreadmill}
              className={cn(
                'premium-material relative flex h-12 w-12 items-center justify-center rounded-[20px] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                isTreadmillConnected
                  ? 'bg-emerald-300/10 text-emerald-200'
                  : 'text-[var(--accent)] hover:bg-white/[0.075]'
              )}
            >
              <Activity size={18} strokeWidth={1.9} />
              <span className={cn('absolute right-2 top-2 h-1.5 w-1.5 rounded-full', isTreadmillConnected ? 'bg-[var(--success)]' : 'bg-white/25')} />
            </button>
          </div>
        </div>

      </header>



      {/* Bottom controls and current journey */}
      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex flex-col gap-3">
        <div className="pointer-events-auto grid grid-cols-3 gap-1.5">
          <button
            type="button"
            className="premium-control flex min-h-[46px] items-center justify-center gap-1 rounded-[17px] text-[10px] font-medium text-white/55 transition-colors duration-200 hover:bg-white/[0.075] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            onClick={() => onNavigate && onNavigate('litRecords', null)}
          >
            <Zap className="text-[var(--accent)]" size={14} strokeWidth={1.9} />
            点亮记录
          </button>
          <button
            type="button"
            className="premium-control flex min-h-[46px] items-center justify-center gap-1 rounded-[17px] text-[10px] font-medium text-white/55 transition-colors duration-200 hover:bg-white/[0.075] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            onClick={() => onNavigate && onNavigate('leaderboard', null)}
          >
            <Award className="text-[var(--accent)]" size={14} strokeWidth={1.9} />
            排行榜
          </button>
          <button
            type="button"
            aria-label={hasClaimableDailyReward ? `今日任务，有 ${claimableDailyTasks.length} 项光迹值可领取` : '今日任务'}
            className={cn(
              'premium-control relative flex min-h-[46px] items-center justify-center gap-1 rounded-[17px] text-[10px] font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
              hasClaimableDailyReward
                ? 'text-[#fff3a6] focus-visible:outline-[#f4df4f]'
                : 'text-white/55 hover:bg-white/[0.075] hover:text-white'
            )}
            style={hasClaimableDailyReward ? {
              background: 'linear-gradient(180deg, rgba(91,88,20,0.78), rgba(55,55,15,0.76))',
              borderColor: 'rgba(225,205,48,0.72)',
              boxShadow: '0 0 0 1px rgba(231,211,54,0.08), 0 10px 28px rgba(95,88,10,0.24), inset 0 1px 0 rgba(255,246,156,0.12)'
            } : undefined}
            onClick={() => setShowTaskPanel(true)}
          >
            <ClipboardCheck className={cn('text-[var(--accent)]', hasClaimableDailyReward && 'text-[#ffe45c] drop-shadow-[0_0_6px_rgba(244,223,79,0.55)]')} size={14} strokeWidth={1.9} />
            任务
            <span className={cn(
              'rounded-full px-1.5 py-0.5 font-mono text-[9px]',
              hasClaimableDailyReward
                ? 'px-0 font-semibold text-[#ffe45c]'
                : 'bg-white/[0.065] text-white/45'
            )}>{completedDailyCount + completedWeeklyCount}/4</span>
          </button>
        </div>

        <div className="pointer-events-auto">
          <ActivityQuickLaunch
            onSelectMedalLottery={onSelectMedalLottery}
            onSelectMedley={onSelectMedley}
            onSelectWeightLossPlan={onSelectWeightLossPlan}
            onSelectHundredCities={onSelectHundredCities}
            onViewAll={onViewAllEvents}
            drawCounts={activityDrawCounts}
          />
        </div>

        <button
          type="button"
          className="premium-material-strong pointer-events-auto relative w-full overflow-hidden rounded-[30px] p-[18px] text-left transition-colors duration-200 hover:bg-[#101418]/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          onClick={() => setShowStoryPanel(true)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {inProgressCity && (
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="flex min-w-0 items-center gap-1 truncate text-[10px] font-medium text-white/40">
                    <MapPin size={11} strokeWidth={1.9} className="shrink-0" />
                    {inProgressCity.name} · {inProgressCity.completed}/{inProgressCity.routes} 路线
                  </span>
                </div>
              )}
              <h3 className="text-[18px] font-semibold tracking-[-0.025em] text-white">奔跑·点亮地球计划</h3>
              <p className="mt-1.5 truncate text-[11px] font-medium leading-relaxed text-white/45">{journeyPromptText}</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.055] text-white/65">
              <ChevronRight size={19} strokeWidth={1.9} />
            </span>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <div
              style={{ width: progressWidth }}
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
            />
          </div>
        </button>
      </div>

      {/* City discovery bottom sheet */}
      <AnimatePresence>
        {selectedCity && !showStoryPanel && (
          <CityDiscoverySheet
            city={selectedCity}
            isCurrent={selectedCity.id === inProgressCity?.id}
            reduceMotion={reduceMotion}
            onClose={() => setSelectedCity(null)}
            onAction={handleCitySheetAction}
          />
        )}
      </AnimatePresence>

      {/* Story Panel Overlay */}
      <AnimatePresence>
        {showStoryPanel && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-50 bg-[#05070A] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 pb-2 border-b border-white/5 relative bg-gradient-to-b from-cyan-900/20 to-transparent">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
              <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-1">奔跑·点亮地球计划</h2>
                <p className="text-xs text-cyan-400 opacity-80 tracking-widest font-mono">MOVEVI World Light Project</p>
              </div>
              <button 
                onClick={() => setShowStoryPanel(false)}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center border border-white/10 transition-colors pointer-events-auto shadow-xl"
              >
                <X size={20} className="text-slate-300" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 hide-scrollbar">
              <div className="mb-8 p-4 bg-gradient-to-r from-cyan-950/40 to-transparent rounded-xl border-l-2 border-cyan-500 shadow-md">
                <p className="text-xs text-slate-300 leading-relaxed font-medium italic mb-3">
                  "600年以后，人类早已离开地球，生活在群星之间。我们建造了新的城市、新的轨道、新的家园。"
                </p>
                <p className="text-xs text-slate-300 leading-relaxed font-medium italic mb-3">
                  "可是走向宇宙深处，人们越开始想念那颗蓝色的母星。想念巴黎清晨的雾，想念东京街口的人潮，想念开罗金字塔前吹来的热风，也想念南京城墙下，梧桐叶落在路面的声音..."
                </p>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  你，不是普通运动者。你是一名<span className="text-cyan-400 font-bold mx-1">光迹探索者 (Glowtrail Explorer)</span>。<br/>
                  你的任务，是通过每一次出发，唤醒一段地球记忆；每完成一条路线，点亮一道母星光迹。
                </p>
              </div>

              {!litCityIds.length ? (
                <div className="w-full py-12 px-6 bg-slate-900/50 border border-slate-700/50 rounded-2xl flex flex-col items-center justify-center text-center mb-6 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
                  <Compass size={32} className="text-cyan-500 animate-pulse mb-4 relative z-10" />
                  <h3 className="text-lg font-bold text-slate-200 tracking-wider mb-2 relative z-10">奔跑·点亮地球计划待开启</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4 relative z-10">
                    地球的记忆仍在一片暗淡之中。<br className="hidden sm:block" />您的奔跑，是重启这些城市坐标的唯一能源。
                  </p>
                  <div className="text-xs font-mono text-cyan-500/80 bg-cyan-950/30 px-3 py-1.5 rounded relative z-10">
                    等待接收探索者指令...
                  </div>
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-slate-700 before:to-slate-800">
                  {Array.from({ length: Math.min(litCityIds.length + 1, 12) }).map((_, index) => {
                    const cityId = litCityIds[index];
                    const numStr = numMap[index] || (index + 1).toString();
                    
                    if (cityId) {
                      const city = CITIES.find(c => c.id === cityId);
                      if (!city) return null;
                      
                      const isLit = city.status === 'lit';
                      const isInProgress = city.status === 'in-progress';
                      const isLocked = false;

                      return (
                        <div key={city.id} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${!isLocked ? 'is-active' : ''}`}>
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-[#05070A] ${isLit ? 'bg-[#2ecc71] text-slate-100 shadow-[0_0_20px_rgba(46,204,113,0.8)]' : isInProgress ? 'bg-cyan-500 text-slate-100 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-slate-800 text-slate-400'} shrink-0 z-10 font-bold text-xs relative`}>
                            {isLit && <span className="absolute w-full h-full rounded-full bg-[#2ecc71] animate-ping opacity-40"></span>}
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-white/5 border ${isLit ? 'border-[#2ecc71]/40 shadow-[0_0_20px_rgba(46,204,113,0.15)] bg-[#2ecc71]/[0.02]' : isInProgress ? 'border-cyan-500/30' : 'border-white/5'} rounded-2xl p-4 shadow-lg backdrop-blur-sm ${isLocked ? 'opacity-60' : ''}`}>
                             <div className="flex items-start justify-between mb-1 gap-2">
                                <div>
                                  <h3 className={`${isLit ? 'text-[#2ecc71]' : isInProgress ? 'text-cyan-400' : 'text-slate-300'} font-bold text-lg`}>第{numStr}城：{city.name}</h3>
                                  <p className="text-[13px] text-slate-400 mt-1 font-mono">{city.continent} · {city.englishName}</p>
                                </div>
                                {isLocked && <Lock size={14} className="text-slate-500" />}
                                {isInProgress && (
                                  <button onClick={(e) => {
                                      e.stopPropagation();
                                      setShowSwitchConfirm(true);
                                  }} className="flex items-center gap-1.5 text-xs font-medium text-cyan-400/80 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400/40 hover:bg-cyan-900/40 px-3 py-1 rounded-full transition-all shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.05)]">
                                    <RefreshCw size={12} />
                                    切换
                                  </button>
                                )}
                             </div>
                             <p className={`text-[12px] leading-relaxed mb-4 ${isLocked ? 'text-slate-500' : 'text-slate-300'}`}>
                               {city.description}
                             </p>
                             {isLit ? (
                                <div className="flex items-center text-[10px] text-[#2ecc71] bg-[#2ecc71]/10 rounded px-2 py-1 font-mono w-fit">
                                   <CheckCircle2 size={12} className="mr-1" />
                                   已完成: 城市卡片已解锁
                                </div>
                             ) : isInProgress ? (
                                <div className="flex items-center text-[10px] text-cyan-400 bg-cyan-950/40 rounded px-2 py-1 font-mono w-fit">
                                   <Activity size={12} className="mr-1" />
                                   进行中: 唤醒进度 {city.completed}/{city.routes}
                                </div>
                             ) : null}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={`locked-${index}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group opacity-50">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-[#05070A] bg-slate-800 text-slate-500 shrink-0 z-10 font-bold text-xs relative">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                             <div className="flex items-center justify-between mb-1">
                                <h3 className="text-slate-500 font-bold">第{numStr}城：待解密</h3>
                                <Lock size={14} className="text-slate-600" />
                             </div>
                             <p className="text-xs text-slate-600 mb-3 font-mono">未知坐标</p>
                             <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                               需完成前置任务后，方可获取此地标的脉冲信号。
                             </p>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/5 shrink-0">
               <button 
                 onClick={handleStartExplore}
                 className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-colors tracking-wide shadow-[0_0_20px_rgba(34,211,238,0.3)]"
               >
                 {litCityIds.length === 0 ? "开始探索" : inProgressCity ? "继续探索" : "选择下一城"}
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* City Selection Overlay */}
      <AnimatePresence>
        {showCitySelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">选择探索城市</h2>
              <p className="text-slate-400 text-sm">选择一个城市，开启你的光迹唤醒之旅</p>
            </div>
            
            <div className="w-full flex flex-col gap-4">
              {selectableCities.map((city, idx) => {
                const completedCount = city.completedRouteIndices?.length || 0;
                const totalRoutes = city.routes || 3;
                
                return (
                <motion.div
                  key={city.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl cursor-pointer"
                  onClick={() => handleCitySelect(city)}
                >
                  <div className="relative h-28">
                    <img src={city.image} alt={city.name} className="absolute inset-0 w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-white drop-shadow-md">{city.name}</h3>
                          <p className="text-xs text-cyan-300 font-mono tracking-widest uppercase mt-0.5">{city.englishName}</p>
                        </div>
                        <ChevronRight className="text-white/50 w-5 h-5" />
                      </div>
                      
                      <div className="w-full bg-slate-700/80 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-cyan-400 h-full transition-all duration-500 shadow-[0_0_12px_rgba(34,211,238,0.9)]"
                          style={{ width: `${Math.min(100, (completedCount / totalRoutes) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-mono">
                        <span>进度</span>
                        <span className="text-cyan-400">{completedCount}/{totalRoutes} 路线</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>
            
            <button 
              onClick={handleShuffleCities}
              className="mt-8 flex items-center justify-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 px-6 py-2.5 rounded-full"
            >
              <RefreshCw size={16} />
              <span className="text-sm font-medium">换一批</span>
            </button>
            
            <button
              className="mt-6 text-slate-400 text-sm hover:text-white"
              onClick={() => setShowCitySelection(false)}
            >
              取消
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reward Burst */}
      <AnimatePresence>
        {rewardBurst && (
          <motion.div
            key={rewardBurst.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-[95] flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.72, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="relative w-full max-w-[280px] overflow-hidden rounded-[30px] border border-amber-300/45 bg-[#08111d]/95 px-7 py-7 text-center shadow-[0_0_70px_rgba(251,191,36,0.38)] backdrop-blur-xl"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.15, 1], opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/60 bg-amber-300 text-slate-950 shadow-[0_0_34px_rgba(251,191,36,0.55)]"
              >
                <Sparkles size={30} strokeWidth={2.8} />
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="mt-5 text-[11px] font-black tracking-[0.22em] text-amber-100"
              >
                光迹值到账
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: [0.75, 1.12, 1] }}
                transition={{ delay: 0.18, duration: 0.5 }}
                className="mt-1 font-mono text-5xl font-black text-white"
              >
                +{rewardBurst.reward}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
                className="mt-2 text-xs font-bold text-cyan-200"
              >
                {rewardBurst.title}
              </motion.p>

              {Array.from({ length: 14 }).map((_, index) => {
                const angle = (index / 14) * Math.PI * 2;
                const distance = 86 + (index % 4) * 14;
                return (
                  <motion.span
                    key={index}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{
                      x: Math.cos(angle) * distance,
                      y: Math.sin(angle) * distance,
                      scale: [0, 1, 0.6],
                      opacity: [0, 1, 0]
                    }}
                    transition={{ duration: 1.15, delay: index * 0.025, ease: 'easeOut' }}
                    className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.8)]"
                  />
                );
              })}

              <motion.div
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: [0, 1, 0], y: -110 }}
                transition={{ duration: 1.25, delay: 0.18, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 h-20 w-1 -translate-x-1/2 rounded-full bg-gradient-to-t from-cyan-300/0 via-cyan-200/70 to-amber-200/0 blur-[1px]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Panel */}
      <AnimatePresence>
        {showTaskPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-md"
            onClick={() => setShowTaskPanel(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-t-[30px] border border-white/10 bg-[#05070A] p-4 pb-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_20%_0%,rgba(94,106,210,0.26),transparent_42%),radial-gradient(circle_at_84%_6%,rgba(251,191,36,0.18),transparent_36%)]" />
              <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[size:28px_28px]" />
              <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-[0.24em] text-indigo-200">GLOW TASKS</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-white">光迹任务</h2>
                </div>
                <button
                  type="button"
                  aria-label="关闭任务面板"
                  onClick={() => setShowTaskPanel(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
                    <p className="text-[10px] font-bold text-slate-500">完成度</p>
                    <p className="mt-1 font-mono text-xl font-black text-white">{completedTaskCount}/{totalTaskCount}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTaskPanel(false);
                      onNavigate && onNavigate('glowCenter', null);
                    }}
                    className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-3 text-left transition-colors hover:border-cyan-200/30 hover:bg-cyan-300/[0.1]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-cyan-100/60">余额</p>
                      <ChevronRight size={12} className="text-cyan-200/70" />
                    </div>
                    <p className="mt-1 font-mono text-xl font-black text-cyan-200">{userStats?.lightValue || 0}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTaskPanel(false);
                      onNavigate && onNavigate('glowWheel', null);
                    }}
                    className="relative overflow-hidden rounded-2xl border border-amber-200/25 bg-gradient-to-br from-amber-300/18 via-indigo-300/12 to-cyan-300/10 p-3 text-left transition-all hover:border-amber-200/45 hover:bg-amber-300/[0.12] active:scale-95"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,231,155,0.22),transparent_48%)]" />
                    <div className="relative flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-amber-100/70">光迹值</p>
                      <ChevronRight size={12} className="text-amber-100/80" />
                    </div>
                    <div className="relative mt-1 flex items-center gap-1.5">
                      <Gift size={16} className="text-amber-200" />
                      <p className="text-sm font-black leading-tight text-amber-100">现金抽奖</p>
                    </div>
                  </button>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedTaskCount / totalTaskCount) * 100}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-300 via-cyan-300 to-amber-200"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {[
                  { title: '今日任务', meta: '每日刷新', tasks: orderedDailyTasks, tone: 'cyan' },
                  { title: '本周任务', meta: `${completedWeeklyCount}/1`, tasks: weeklyTasks, tone: 'amber' }
                ].map(group => (
                  <div key={group.title}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-100">{group.title}</h3>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-500">{group.meta}</span>
                    </div>
                    <div className="space-y-2">
                      {group.tasks.map((task: any) => {
                        const progressText = task.unit === 'km'
                          ? `${task.progress.toFixed(1)}/${task.target}${task.unit}`
                          : `${task.progress}/${task.target}`;
                        const progressPercent = Math.min(100, (task.progress / task.target) * 100);
                        const canClaim = task.ready && !task.claimed;
                        const isWeekly = group.tone === 'amber';
                        return (
                          <div
                            key={task.id}
                            className={`rounded-[18px] border p-3 ${
                              task.claimed
                                ? 'border-emerald-300/[0.14] bg-emerald-300/[0.035]'
                                : canClaim
                                  ? isWeekly
                                    ? 'border-amber-300/[0.24] bg-amber-300/[0.065]'
                                    : 'border-cyan-300/[0.22] bg-cyan-300/[0.055]'
                                  : 'border-white/[0.08] bg-[#0b1018]/80'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                                task.claimed
                                  ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-300'
                                  : canClaim
                                    ? isWeekly
                                      ? 'border-amber-300/20 bg-amber-300/10 text-amber-200'
                                      : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
                                    : 'border-white/[0.08] bg-white/[0.035] text-slate-500'
                              }`}>
                                {task.claimed ? <CheckCircle2 size={18} /> : isWeekly ? <Award size={17} /> : <Gift size={17} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-xs font-black text-slate-100">{task.title}</p>
                                  <span className={`shrink-0 font-mono text-[11px] font-black ${isWeekly ? 'text-amber-200' : 'text-cyan-200'}`}>+{task.reward}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                                    <div
                                      className={`h-full rounded-full ${isWeekly ? 'bg-gradient-to-r from-amber-300 to-yellow-100' : 'bg-gradient-to-r from-indigo-300 to-cyan-200'}`}
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="shrink-0 font-mono text-[10px] font-bold text-slate-500">{progressText}</span>
                                </div>
                              </div>
                              <button
                                disabled={!canClaim}
                                onClick={() => task.id === 'weekly-city' ? handleClaimWeeklyTask(task.id, task.reward) : handleClaimDailyTask(task.id, task.reward)}
                                className={`h-9 shrink-0 rounded-xl px-3 text-[10px] font-black transition-colors ${
                                  canClaim
                                    ? isWeekly
                                      ? 'bg-amber-200 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.22)]'
                                      : 'bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(103,232,249,0.2)]'
                                    : task.claimed
                                      ? 'border border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-300'
                                      : 'border border-white/[0.08] bg-white/[0.035] text-slate-500'
                                }`}
                              >
                                {task.claimed ? '已领' : task.actionLabel || '领取'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Switch City Confirmation */}
      <AnimatePresence>
        {showSwitchConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-xs text-center shadow-2xl"
            >
               <h3 className="text-xl font-bold text-white mb-3">切换城市</h3>
               <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                 切换城市将消耗<span className="text-amber-400 font-bold mx-1">30点光迹值</span>。<br/>
                 是否继续？
               </p>
               
               <div className="flex gap-3">
                 <button 
                   onClick={() => setShowSwitchConfirm(false)}
                   className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium border border-white/5"
                 >
                   取消
                 </button>
                 <button 
                   onClick={() => {
                      if (userStats && userStats.lightValue >= 30) {
                        if (setUserStats) {
                          setUserStats((prev: any) => ({ ...prev, lightValue: prev.lightValue - 30 }));
                        }
                        const available = CITIES.filter(c => c.status !== 'lit' && c.status !== 'upcoming');
                        const shuffled = [...available].sort(() => 0.5 - Math.random());
                        setSelectableCities(shuffled.slice(0, 3));
                        setShowSwitchConfirm(false);
                        setShowStoryPanel(false); // Close story panel as well right away
                        setShowCitySelection(true);
                        setToastMessage('已消耗30点光迹值重新选择城市');
                        setTimeout(() => setToastMessage(null), 3000);
                      } else {
                        setShowSwitchConfirm(false);
                        setToastMessage('光迹值不足 (需要30点)');
                        setTimeout(() => setToastMessage(null), 3000);
                      }
                   }}
                   className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl transition-colors font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                 >
                   确定
                 </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-md text-xs font-medium whitespace-nowrap"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
