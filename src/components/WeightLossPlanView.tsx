import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Award, CheckCircle2, ChevronLeft, Flame, Gift, Lock, MapPin, Play, Route, Shuffle, Sparkles, Timer, Trophy } from 'lucide-react';
import { CITIES, getRouteData } from '../data/cities';

export interface WeightPlanRewardRecord {
  day: number;
  amount: string;
  openedAt: string;
}

interface WeightLossPlanViewProps {
  started: boolean;
  completedDays: number[];
  rewardBoxes: number[];
  openedRewardDays: number[];
  rewardHistory: WeightPlanRewardRecord[];
  onBack: () => void;
  onStartPlan: () => void;
  onOpenReward: (day: number) => { success: boolean; message: string; amount?: string };
  onNavigateToRouteDetail: (cityId: string, routeIndex: number, image: string, day: number) => void;
}

const MILESTONE_DAYS = [1, 7, 15, 21, 30];
const TOTAL_DAYS = 30;

const generatePlanRoutes = () => {
  const cities = CITIES.filter(city => city.status !== 'upcoming');
  return Array.from({ length: TOTAL_DAYS }, (_, index) => {
    const city = cities[index % cities.length];
    const routeIndex = Math.floor(index / cities.length) % Math.max(city.routes, 3) + 1;
    const routeData = getRouteData(city.id, routeIndex);
    return {
      day: index + 1,
      cityId: city.id,
      cityName: city.name,
      routeIndex,
      image: city.image,
      routeData
    };
  });
};

type PlanRoute = ReturnType<typeof generatePlanRoutes>[number];

export default function WeightLossPlanView({
  started,
  completedDays,
  rewardBoxes,
  openedRewardDays,
  rewardHistory,
  onBack,
  onStartPlan,
  onOpenReward,
  onNavigateToRouteDetail
}: WeightLossPlanViewProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [result, setResult] = useState<{ day: number; amount: string } | null>(null);
  const [rewardReveal, setRewardReveal] = useState<{ day: number; phase: 'collecting' | 'opening' } | null>(null);
  const [openingRewardDay, setOpeningRewardDay] = useState<number | null>(null);
  const [routeOverrides, setRouteOverrides] = useState<Record<number, PlanRoute>>({});
  const rewardTimersRef = useRef<number[]>([]);
  const planRoutes = useMemo(() => generatePlanRoutes(), []);
  const completedSet = new Set(completedDays);
  const nextDay = Math.min(completedDays.length + 1, TOTAL_DAYS);
  const [displayDay, setDisplayDay] = useState(Math.max(1, completedDays.length));
  const activeDay = Math.min(displayDay, TOTAL_DAYS);
  const todayRoute = routeOverrides[activeDay] || planRoutes[activeDay - 1];
  const todayCompleted = completedSet.has(activeDay);
  const isFutureDay = activeDay > nextDay;
  const completedDistance = planRoutes
    .filter(item => completedSet.has(item.day))
    .reduce((sum, item) => sum + Number(item.routeData.distance || 0), 0);
  const earnedBoxes = rewardBoxes.length;
  const openedBoxes = openedRewardDays.length;
  const planComplete = completedDays.length >= TOTAL_DAYS;
  const progressPercent = Math.round((completedDays.length / TOTAL_DAYS) * 100);
  const nextRewardDay = MILESTONE_DAYS.find(day => day > completedDays.length);
  const daysToNextReward = nextRewardDay ? Math.max(0, nextRewardDay - completedDays.length) : 0;
  const clampDisplayDay = (day: number) => Math.min(TOTAL_DAYS, Math.max(1, day));
  const handleRouteSwipe = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
    if (Math.abs(info.offset.x) < 44) return;
    setDisplayDay(prev => clampDisplayDay(prev + (info.offset.x < 0 ? 1 : -1)));
  };
  const handleShuffleRoute = () => {
    if (!todayRoute || todayCompleted || isFutureDay) return;

    const cities = CITIES.filter(city => city.status !== 'upcoming' && city.id !== todayRoute.cityId);
    const city = cities[Math.floor(Math.random() * cities.length)];
    const routeIndex = Math.floor(Math.random() * Math.max(city.routes, 1)) + 1;
    const nextRoute: PlanRoute = {
      day: activeDay,
      cityId: city.id,
      cityName: city.name,
      routeIndex,
      image: city.image,
      routeData: getRouteData(city.id, routeIndex)
    };

    setRouteOverrides(prev => ({ ...prev, [activeDay]: nextRoute }));
    showToast(`已切换至${city.name}路线`);
  };

  useEffect(() => {
    return () => {
      rewardTimersRef.current.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleOpenReward = (day: number) => {
    if (openingRewardDay !== null) return;

    setOpeningRewardDay(day);
    setRewardReveal({ day, phase: 'collecting' });

    const openTimer = window.setTimeout(() => {
      const response = onOpenReward(day);

      if (!response.success || !response.amount) {
        setRewardReveal(null);
        setOpeningRewardDay(null);
        showToast(response.message);
        if (response.amount) {
          setResult({ day, amount: response.amount });
        }
        return;
      }

      setRewardReveal({ day, phase: 'opening' });

      const resultTimer = window.setTimeout(() => {
        setRewardReveal(null);
        setOpeningRewardDay(null);
        setResult({ day, amount: response.amount! });
        showToast(response.message);
      }, 980);

      rewardTimersRef.current.push(resultTimer);
    }, 620);

    rewardTimersRef.current.push(openTimer);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05070A] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_88%_2%,rgba(251,191,36,0.18),transparent_32%),linear-gradient(180deg,#06110d_0%,#05070A_52%,#020304_100%)]" />
      <div className="absolute inset-0 opacity-[0.055] bg-[linear-gradient(rgba(255,255,255,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.24)_1px,transparent_1px)] bg-[size:28px_28px]" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="shrink-0 px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-slate-200 backdrop-blur-md active:scale-95"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300/70">30 DAY BURN</p>
              <h1 className="text-xl font-black tracking-tight text-white">30天燃脂计划</h1>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/15 bg-emerald-300/10 text-emerald-200">
              <Flame size={19} />
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 hide-scrollbar">
          <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1210]/85 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_25%_18%,rgba(52,211,153,0.26),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(250,204,21,0.22),transparent_34%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">
                <Sparkles size={12} />
                每日一条路线
              </div>
              <h2 className="mt-3 text-[32px] font-black leading-[0.98] tracking-[-0.04em] text-white">
                用30天，<br />跑出轻盈节奏
              </h2>
              <p className="mt-3 max-w-[280px] text-sm font-semibold leading-5 text-slate-400">
                每天完成一条推荐路线，在关键节点开启现金红包盲盒。
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/24 p-3">
                  <p className="text-[10px] font-bold text-slate-500">完成天数</p>
                  <p className="mt-1 font-mono text-xl font-black tabular-nums text-white">{completedDays.length}/30</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/24 p-3">
                  <p className="text-[10px] font-bold text-slate-500">累计公里</p>
                  <p className="mt-1 font-mono text-xl font-black tabular-nums text-emerald-200">{completedDistance.toFixed(1)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/24 p-3">
                  <p className="text-[10px] font-bold text-slate-500">盲盒</p>
                  <p className="mt-1 font-mono text-xl font-black tabular-nums text-amber-200">{openedBoxes}/{earnedBoxes}</p>
                </div>
              </div>

              {!started && (
                <button
                  onClick={onStartPlan}
                  className="mt-5 h-12 w-full rounded-full bg-white text-sm font-black text-slate-950 shadow-[0_12px_28px_rgba(255,255,255,0.12)] active:scale-[0.98]"
                >
                  开启30天计划
                </button>
              )}
            </div>
          </section>

          {started && (
            <motion.section
              className="mt-4 rounded-2xl border border-emerald-300/15 bg-[#0d1412]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={handleRouteSwipe}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">
                    {planComplete ? 'PLAN COMPLETE' : `DAY ${activeDay}`}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-white">
                      {planComplete ? '整期计划已完成' : activeDay === nextDay ? '今日推荐路线' : `第 ${activeDay} 天路线`}
                    </h2>
                    {!planComplete && activeDay === nextDay && !todayCompleted && (
                      <button
                        type="button"
                        onClick={handleShuffleRoute}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 text-[11px] font-black text-emerald-100 active:scale-95"
                      >
                        <Shuffle size={13} />
                        换一条
                      </button>
                    )}
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs font-black text-emerald-100">
                  {activeDay}/30
                </div>
              </div>
              <p className="mt-2 text-[11px] font-bold text-slate-500">左右滑动切换日期查看路线</p>

              {todayRoute && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/25">
                  <div className="relative h-32">
                    <img src={todayRoute.image} alt={todayRoute.cityName} className="h-full w-full object-cover opacity-75" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-100">
                        <MapPin size={14} />
                        {todayRoute.cityName}
                      </div>
                      <h3 className="mt-1 text-xl font-black text-white">{todayRoute.routeData.title}</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-3">
                    <div className="rounded-xl bg-white/[0.045] p-2">
                      <p className="text-[10px] text-slate-500">距离</p>
                      <p className="font-mono text-sm font-black text-white">{todayRoute.routeData.distance} km</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.045] p-2">
                      <p className="text-[10px] text-slate-500">预计时长</p>
                      <p className="font-mono text-sm font-black text-white">{todayRoute.routeData.duration}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.045] p-2">
                      <p className="text-[10px] text-slate-500">消耗</p>
                      <p className="font-mono text-sm font-black text-white">{todayRoute.routeData.calories}</p>
                    </div>
                  </div>
                  {todayCompleted ? (
                    <div className="mx-3 mb-3">
                      <div className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 text-sm font-black text-emerald-200">
                        <CheckCircle2 size={18} />
                        已完成
                      </div>
                    </div>
                  ) : isFutureDay ? (
                    <button
                      type="button"
                      disabled
                      className="mx-3 mb-3 flex h-11 w-[calc(100%-24px)] items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.035] text-sm font-black text-slate-500"
                    >
                      <Lock size={16} />
                      日期未到，暂不可开始
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigateToRouteDetail(todayRoute.cityId, todayRoute.routeIndex, todayRoute.image, todayRoute.day)}
                      className="mx-3 mb-3 flex h-11 w-[calc(100%-24px)] items-center justify-center gap-2 rounded-full bg-emerald-300 text-sm font-black text-slate-950 shadow-[0_12px_28px_rgba(52,211,153,0.20)] active:scale-[0.98]"
                    >
                      <Play size={17} className="fill-slate-950" />
                      去完成
                    </button>
                  )}
                </div>
              )}
            </motion.section>
          )}

          <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0d1118]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_22px_60px_rgba(0,0,0,0.28)]">
            <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,0.16),transparent_50%),radial-gradient(circle_at_82%_0%,rgba(251,191,36,0.12),transparent_48%)]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f9bff]">PROGRESS</p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-white">30天进度</h2>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  {planComplete ? '计划已完成' : nextRewardDay ? `下一奖励：第${nextRewardDay}天，还差${daysToNextReward}天` : '全部奖励已解锁'}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200/20 bg-emerald-200/10 px-3 py-2 text-right">
                <p className="text-[10px] font-bold text-emerald-100/70">完成</p>
                <p className="font-mono text-sm font-black text-emerald-100">{completedDays.length}/{TOTAL_DAYS}</p>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-5 gap-2">
              {MILESTONE_DAYS.map(day => {
                const earned = rewardBoxes.includes(day);
                const opened = openedRewardDays.includes(day);
                const record = rewardHistory.find(item => item.day === day);
                const isOpening = openingRewardDay === day;
                const isNext = !earned && day === nextRewardDay;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={!earned || opened || openingRewardDay !== null}
                    onClick={() => earned && !opened && handleOpenReward(day)}
                    className={`group relative min-h-[96px] overflow-hidden rounded-2xl border p-2 text-center transition ${
                      opened
                        ? 'border-amber-200/35 bg-gradient-to-b from-amber-200/18 to-amber-500/8'
                        : earned
                          ? 'border-emerald-200/55 bg-gradient-to-b from-emerald-200/20 to-cyan-300/8 shadow-[0_0_28px_rgba(52,211,153,0.12)] active:scale-95'
                          : isNext
                            ? 'border-amber-200/22 bg-amber-200/[0.055]'
                            : 'border-white/[0.07] bg-white/[0.035] opacity-70'
                    } ${isOpening ? 'animate-pulse ring-2 ring-amber-200/60' : ''}`}
                  >
                    {earned && !opened && (
                      <span className="absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-emerald-100/70 to-transparent" />
                    )}
                    <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-2xl ${
                      opened
                        ? 'bg-amber-200/18 text-amber-100'
                        : earned
                          ? 'bg-emerald-200 text-slate-950'
                          : 'bg-black/24 text-amber-100/70'
                    }`}>
                      {opened ? <CheckCircle2 size={17} /> : earned ? <Gift size={18} className={isOpening ? 'animate-bounce' : ''} /> : <Lock size={15} />}
                    </div>
                    <p className="mt-2 text-[10px] font-black text-slate-300">第{day}天</p>
                    <p className={`mt-1 font-mono text-[11px] font-black ${
                      opened ? 'text-amber-100' : earned ? 'text-emerald-100' : isNext ? 'text-amber-100/80' : 'text-slate-500'
                    }`}>
                      {opened ? record?.amount : earned ? '可开启' : isNext ? '下一站' : '未获得'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="relative mt-5 rounded-[22px] border border-white/[0.07] bg-black/20 p-4">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>DAY 1</span>
                <span className="rounded-full border border-emerald-200/20 bg-emerald-200/10 px-2.5 py-1 font-mono text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.12)]">
                  {progressPercent}%
                </span>
                <span>DAY 30</span>
              </div>
              <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-200 to-amber-200"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>已完成 {completedDays.length} 天</span>
                <span>{planComplete ? '全部完成' : `剩余 ${TOTAL_DAYS - completedDays.length} 天`}</span>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
                <Route size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">活动规则</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                  每天按顺序完成 1 条推荐路线。完成第 1、7、15、21、30 天时获得红包盲盒，打开后可查看现金奖励。
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute left-1/2 top-20 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950 shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rewardReveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-lg"
          >
            <motion.div
              initial={{ scale: 0.82, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="relative w-full max-w-[300px] overflow-hidden rounded-[30px] border border-amber-200/25 bg-[#130d08] p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.65)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(251,191,36,0.34),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(244,63,94,0.24),transparent_48%)]" />
              <div className="absolute inset-x-8 top-5 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
              {[0, 1, 2, 3, 4, 5].map(item => (
                <motion.span
                  key={item}
                  className="absolute h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.9)]"
                  initial={{
                    opacity: 0,
                    x: 138,
                    y: 128,
                    scale: 0.4
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: 138 + Math.cos((item / 6) * Math.PI * 2) * 104,
                    y: 128 + Math.sin((item / 6) * Math.PI * 2) * 82,
                    scale: [0.4, 1, 0.7]
                  }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    delay: item * 0.08,
                    ease: 'easeOut'
                  }}
                />
              ))}

              <div className="relative mx-auto mt-2 flex h-28 w-28 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full bg-amber-200/20 blur-2xl"
                  animate={{ scale: rewardReveal.phase === 'opening' ? [1, 1.34, 1.08] : [0.9, 1.08, 0.9], opacity: [0.42, 0.88, 0.5] }}
                  transition={{ duration: rewardReveal.phase === 'opening' ? 0.7 : 1.4, repeat: rewardReveal.phase === 'opening' ? 0 : Infinity }}
                />
                <motion.div
                  className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-amber-100/35 bg-gradient-to-br from-[#ff4b2e] via-[#ff7a1a] to-[#ffd15d] text-white shadow-[0_20px_50px_rgba(248,113,22,0.36)]"
                  animate={rewardReveal.phase === 'opening'
                    ? { rotateY: [0, 18, -16, 0], scale: [1, 1.08, 0.96, 1.12] }
                    : { y: [0, -8, 0], rotate: [-2, 2, -2] }}
                  transition={{ duration: rewardReveal.phase === 'opening' ? 0.82 : 1.5, repeat: rewardReveal.phase === 'opening' ? 0 : Infinity }}
                >
                  <div className="absolute left-0 right-0 top-0 h-9 rounded-t-[28px] bg-white/18" />
                  <div className="absolute inset-x-3 top-9 h-px bg-yellow-100/70" />
                  <Gift size={42} className="relative drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]" />
                </motion.div>
              </div>

              <p className="relative mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-amber-100/80">
                DAY {rewardReveal.day} REWARD
              </p>
              <h3 className="relative mt-2 text-2xl font-black text-white">
                {rewardReveal.phase === 'collecting' ? '红包盲盒已获得' : '正在打开盲盒'}
              </h3>
              <p className="relative mt-2 text-xs font-bold leading-5 text-amber-100/70">
                {rewardReveal.phase === 'collecting' ? '奖励正在靠近，准备揭晓现金红包。' : '好运加速中，马上公布本次奖励。'}
              </p>

              <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-200 via-orange-300 to-rose-300"
                  initial={{ width: '12%' }}
                  animate={{ width: rewardReveal.phase === 'collecting' ? '54%' : '100%' }}
                  transition={{ duration: rewardReveal.phase === 'collecting' ? 0.56 : 0.86, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-md"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-xs overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1118] p-5 text-center shadow-[0_28px_90px_rgba(0,0,0,0.58)]"
              onClick={event => event.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.24),transparent_70%)]" />
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-300/10 text-amber-100">
                <Trophy size={32} />
              </div>
              <p className="relative mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">第{result.day}天红包</p>
              <p className="relative mt-2 text-5xl font-black tracking-[-0.06em] text-white">{result.amount}</p>
              <button
                onClick={() => setResult(null)}
                className="relative mt-6 h-11 w-full rounded-full bg-emerald-300 text-sm font-black text-slate-950 shadow-[0_12px_28px_rgba(52,211,153,0.24)]"
              >
                收下红包
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
