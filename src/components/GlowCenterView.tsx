import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { ChevronLeft, Crown, Gift, Info, Medal, Shuffle, Sparkles, Ticket, Zap, X } from 'lucide-react';
import { getGlowRank, GLOW_RANKS } from '../lib/glow';

export type GlowExchangeType =
  | 'activityTicket'
  | 'rerollCity'
  | 'medalMysteryTicket'
  | 'silverTrail'
  | 'diamondFrame'
  | 'starlightBadge'
  | 'kingNameplate';

interface GlowCenterViewProps {
  userStats: any;
  onBack: () => void;
  onExchange: (type: GlowExchangeType) => { success: boolean; message: string };
  onClaimRankReward: (level: number) => { success: boolean; message: string; amount?: string };
}

const rankCopy: Record<number, { title: string; description: string; aura: string }> = {
  1: {
    title: '初次留痕',
    description: '完成第一次出发，开始记录属于你的城市光迹。',
    aura: 'rgba(251,146,60,0.32)'
  },
  2: {
    title: '稳定探索',
    description: '开始形成跑步习惯，城市记忆被持续唤醒。',
    aura: 'rgba(226,232,240,0.28)'
  },
  3: {
    title: '黄金光迹',
    description: '路线完成度进入稳定阶段，探索节奏逐渐成型。',
    aura: 'rgba(251,191,36,0.34)'
  },
  4: {
    title: '钻石轨道',
    description: '跨城探索能力提升，光迹网络进入高亮状态。',
    aura: 'rgba(34,211,238,0.34)'
  },
  5: {
    title: '星耀巡航',
    description: '持续奔跑让你的城市版图开始形成星群。',
    aura: 'rgba(217,70,239,0.34)'
  },
  6: {
    title: '王者回响',
    description: '你已抵达最高段位，完整光迹将成为城市传说。',
    aura: 'rgba(251,113,133,0.34)'
  }
};

const RankBadgeIcon = ({ level }: { level: number }) => {
  if (level === 1) {
    return <Zap size={34} strokeWidth={2.6} />;
  }

  if (level === 2) {
    return (
      <svg viewBox="0 0 64 64" className="h-10 w-10" fill="none" aria-hidden="true">
        <path d="M32 8L50 17V31C50 43 42 52 32 57C22 52 14 43 14 31V17L32 8Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
        <path d="M24 31L30 37L42 25" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (level === 3) {
    return (
      <svg viewBox="0 0 64 64" className="h-11 w-11" fill="none" aria-hidden="true">
        <path d="M32 7L38 24H56L41.5 34.5L47 52L32 41.5L17 52L22.5 34.5L8 24H26L32 7Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
        <circle cx="32" cy="32" r="7" fill="currentColor" />
      </svg>
    );
  }

  if (level === 4) {
    return (
      <svg viewBox="0 0 64 64" className="h-11 w-11" fill="none" aria-hidden="true">
        <path d="M32 6L54 22L46 54H18L10 22L32 6Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
        <path d="M10 22H54M24 22L18 54M40 22L46 54M24 22L32 6L40 22" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      </svg>
    );
  }

  if (level === 5) {
    return (
      <svg viewBox="0 0 64 64" className="h-11 w-11" fill="none" aria-hidden="true">
        <path d="M32 5L39 22L57 24L43.5 36L47 54L32 44.5L17 54L20.5 36L7 24L25 22L32 5Z" stroke="currentColor" strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M32 18V40M21 29H43" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  return <Crown size={38} strokeWidth={2.5} />;
};

interface GlowShopItem {
  id: GlowExchangeType;
  title: string;
  cost: number;
  description: string;
  icon: typeof Gift;
  accent: string;
  requiredRankLevel?: number;
  weeklyLimit?: number;
  oneTime?: boolean;
}

const shopItems: GlowShopItem[] = [
  {
    id: 'activityTicket',
    title: '串烧补给券',
    cost: 10,
    description: '为周末城市记忆串烧增加 1 次现金抽奖机会。',
    icon: Ticket,
    accent: 'from-fuchsia-300 to-rose-500',
    requiredRankLevel: 3,
    weeklyLimit: 1
  },
  {
    id: 'medalMysteryTicket',
    title: '勋章盲盒券',
    cost: 10,
    description: '兑换 1 张勋章盲盒抽奖券。',
    icon: Medal,
    accent: 'from-amber-200 to-yellow-500',
    requiredRankLevel: 3,
    weeklyLimit: 1
  },
  {
    id: 'rerollCity',
    title: '下一城重选券',
    cost: 3,
    description: '重新打开下一站城市选择，换一种探索路线。',
    icon: Shuffle,
    accent: 'from-cyan-300 to-blue-500'
  },
  {
    id: 'silverTrail',
    title: '银光路线主题',
    cost: 8,
    description: '解锁白银专属路线光效。',
    icon: Sparkles,
    accent: 'from-slate-100 to-slate-400',
    requiredRankLevel: 2,
    oneTime: true
  },
  {
    id: 'diamondFrame',
    title: '钻石头像框',
    cost: 20,
    description: '解锁钻石段位专属头像框。',
    icon: Crown,
    accent: 'from-cyan-200 to-blue-500',
    requiredRankLevel: 4,
    oneTime: true
  },
  {
    id: 'starlightBadge',
    title: '星耀徽记',
    cost: 30,
    description: '解锁星耀段位专属身份徽记。',
    icon: Sparkles,
    accent: 'from-fuchsia-200 to-violet-500',
    requiredRankLevel: 5,
    oneTime: true
  },
  {
    id: 'kingNameplate',
    title: '王者铭牌',
    cost: 50,
    description: '解锁王者专属昵称铭牌。',
    icon: Crown,
    accent: 'from-rose-200 to-amber-300',
    requiredRankLevel: 6,
    oneTime: true
  }
];

const rankShopItemIds: Record<number, GlowExchangeType[]> = {
  1: ['rerollCity'],
  2: ['silverTrail', 'rerollCity'],
  3: ['activityTicket', 'medalMysteryTicket'],
  4: ['diamondFrame', 'activityTicket'],
  5: ['starlightBadge', 'medalMysteryTicket'],
  6: ['kingNameplate', 'activityTicket']
};

export default function GlowCenterView({ userStats, onBack, onExchange, onClaimRankReward }: GlowCenterViewProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRankInfo, setShowRankInfo] = useState(false);
  const [rankRewardResult, setRankRewardResult] = useState<{ level: number; amount: string } | null>(null);
  const [rankRewardReveal, setRankRewardReveal] = useState<{ level: number; name: string; color: string; phase: 'activating' | 'opening' } | null>(null);
  const [claimingRankLevel, setClaimingRankLevel] = useState<number | null>(null);
  const rankRewardTimersRef = useRef<number[]>([]);
  const lightValue = userStats?.lightValue || 0;
  const lifetimeLightValue = userStats?.lifetimeLightValue ?? lightValue;
  const weeklyGlowExchangeIds: string[] = userStats?.weeklyGlowExchangeIds || [];
  const rankInfo = getGlowRank(lifetimeLightValue);
  const currentRankIndex = Math.max(0, GLOW_RANKS.findIndex(rank => rank.level === rankInfo.current.level));
  const [selectedIndex, setSelectedIndex] = useState(currentRankIndex);
  const selectedRank = GLOW_RANKS[selectedIndex] || rankInfo.current;
  const selectedCopy = rankCopy[selectedRank.level];
  const selectedIsCurrent = selectedRank.level === rankInfo.current.level;
  const selectedUnlocked = lifetimeLightValue >= selectedRank.threshold;
  const nextRank = GLOW_RANKS.find(rank => rank.level === selectedRank.level + 1) || null;
  const claimedRankRewardLevels: number[] = userStats?.claimedGlowRankRewardLevels || [];
  const unlockedGlowPerkIds: string[] = userStats?.unlockedGlowPerkIds || [];
  const selectedShopItems = (rankShopItemIds[selectedRank.level] || [])
    .map(id => shopItems.find(item => item.id === id))
    .filter((item): item is GlowShopItem => Boolean(item));
  const rankRewardClaimed = claimedRankRewardLevels.includes(selectedRank.level);

  useEffect(() => {
    return () => {
      rankRewardTimersRef.current.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  const handleRankDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.18;
    if (swipe < -55) {
      setSelectedIndex(index => Math.min(GLOW_RANKS.length - 1, index + 1));
    } else if (swipe > 55) {
      setSelectedIndex(index => Math.max(0, index - 1));
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2400);
  };

  const handleExchange = (type: GlowExchangeType) => {
    const result = onExchange(type);
    showToast(result.message);
  };

  const handleClaimRankReward = () => {
    if (claimingRankLevel !== null) return;

    const rewardRank = selectedRank;
    setClaimingRankLevel(rewardRank.level);
    setRankRewardReveal({
      level: rewardRank.level,
      name: rewardRank.name,
      color: rewardRank.color,
      phase: 'activating'
    });

    const openTimer = window.setTimeout(() => {
      const result = onClaimRankReward(rewardRank.level);

      if (!result.success || !result.amount) {
        setRankRewardReveal(null);
        setClaimingRankLevel(null);
        showToast(result.message);
        return;
      }

      setRankRewardReveal(current => current ? { ...current, phase: 'opening' } : current);

      const resultTimer = window.setTimeout(() => {
        setRankRewardReveal(null);
        setClaimingRankLevel(null);
        setRankRewardResult({ level: rewardRank.level, amount: result.amount! });
        showToast(result.message);
      }, 920);

      rankRewardTimersRef.current.push(resultTimer);
    }, 620);

    rankRewardTimersRef.current.push(openTimer);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020407] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(94,106,210,0.24),transparent_36%),radial-gradient(circle_at_84%_10%,rgba(251,191,36,0.18),transparent_34%),linear-gradient(180deg,#020407_0%,#07111b_46%,#030507_100%)]" />
      <div className="absolute inset-0 opacity-[0.065] bg-[linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[size:28px_28px]" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-slate-200 backdrop-blur-md transition-colors hover:bg-white/10"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-black tracking-tight text-white">光迹值中心</h1>
            </div>
            <button
              onClick={() => setShowRankInfo(true)}
              className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 text-[10px] font-black text-slate-200 backdrop-blur-md transition-colors hover:bg-white/10"
            >
              <Info size={14} />
              说明
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 hide-scrollbar">
          <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0a0f17]/[0.86] p-4 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(94,106,210,0.2),transparent_46%),radial-gradient(circle_at_88%_10%,rgba(251,191,36,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_72%)]" />
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl" style={{ backgroundColor: selectedCopy.aura }} />
            <div className="relative rounded-[24px] border border-white/10 bg-black/[0.24] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`h-14 w-14 rounded-full bg-gradient-to-br ${rankInfo.current.color} p-[2px] shadow-[0_0_28px_rgba(103,232,249,0.16)]`}>
                    <div className="h-full w-full rounded-full bg-slate-950 p-1">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200"
                    alt="User Avatar"
                    className="h-full w-full rounded-full object-cover"
                  />
                    </div>
                </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black text-white">木小六</p>
                      <span className={`rounded-full bg-gradient-to-r ${rankInfo.current.color} px-2 py-0.5 text-[9px] font-black text-slate-950`}>LV.{rankInfo.current.level}</span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">累计 {lifetimeLightValue} 光迹值</p>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              onDragEnd={handleRankDragEnd}
              key={selectedRank.level}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 20 }}
              className={`relative mt-4 cursor-grab overflow-hidden rounded-[26px] border p-5 text-center active:cursor-grabbing ${
                selectedIsCurrent
                  ? 'border-amber-300/45 bg-amber-300/[0.065] shadow-[0_0_34px_rgba(251,191,36,0.16)]'
                  : selectedUnlocked
                    ? 'border-white/10 bg-black/[0.28]'
                    : 'border-white/[0.08] bg-black/[0.18] opacity-[0.82]'
              }`}
            >
              <div className="absolute inset-x-10 top-8 h-24 rounded-full blur-3xl" style={{ backgroundColor: selectedCopy.aura }} />
              {selectedIsCurrent && (
                <div className="absolute right-4 top-4 rounded-full border border-amber-200/35 bg-amber-300/12 px-3 py-1 text-[10px] font-black text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.15)]">
                  当前段位
                </div>
              )}
              <div className="relative mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-[30px] border border-white/15 bg-slate-950/80 shadow-[inset_0_0_30px_rgba(255,255,255,0.04)]">
                <div className={`absolute inset-2 rounded-[26px] bg-gradient-to-br ${selectedRank.color} opacity-95 blur-[1px]`} />
                <div className="absolute inset-[12px] rounded-[22px] border border-black/35 bg-black/[0.24]" />
                <div className="absolute inset-[21px] rounded-2xl border border-white/10" />
                {selectedIsCurrent && (
                  <motion.div
                    className={`absolute inset-0 rounded-[30px] bg-gradient-to-br ${selectedRank.color} opacity-[0.38] blur-md`}
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-[#07111b] text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.04),0_10px_28px_rgba(0,0,0,0.35)]">
                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_35%_22%,rgba(255,255,255,0.16),transparent_28%)]" />
                  <RankBadgeIcon level={selectedRank.level} />
                </div>
              </div>

              <div className="relative mt-5">
                <p className="text-[10px] font-black tracking-[0.24em] text-slate-400">LV.{selectedRank.level}</p>
                <h2 className={`mt-1 bg-gradient-to-r ${selectedRank.color} bg-clip-text text-4xl font-black text-transparent`}>
                  {selectedRank.name}
                </h2>
                <p className="mt-2 text-sm font-black text-white">{selectedCopy.title}</p>
              </div>

              <div className="relative mt-5 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="text-[10px] font-bold text-slate-500">达成条件</p>
                  <p className="mt-1 font-mono text-lg font-black text-white">{selectedRank.threshold}+</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="text-[10px] font-bold text-slate-500">当前状态</p>
                  <p className={`mt-1 text-sm font-black ${selectedUnlocked ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {selectedIsCurrent ? '当前段位' : selectedUnlocked ? '已解锁' : '未解锁'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={!selectedUnlocked || rankRewardClaimed || claimingRankLevel !== null}
                onClick={handleClaimRankReward}
                className={`relative mt-4 h-11 w-full rounded-2xl text-xs font-black transition-all ${
                  selectedUnlocked && !rankRewardClaimed && claimingRankLevel === null
                    ? `bg-gradient-to-r ${selectedRank.color} text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.2)]`
                    : 'border border-white/10 bg-white/[0.035] text-slate-500'
                }`}
              >
                {claimingRankLevel === selectedRank.level ? '红包开启中' : !selectedUnlocked ? `${selectedRank.name}段位解锁` : rankRewardClaimed ? '段位红包已领取' : '领取段位红包'}
              </button>

              <div className="relative mt-5 flex items-center justify-center gap-1.5">
                {GLOW_RANKS.map((rank, index) => (
                  <span
                    key={rank.level}
                    className={`h-1.5 rounded-full transition-all ${index === selectedIndex ? 'w-6 bg-amber-300' : 'w-1.5 bg-white/20'}`}
                  />
                ))}
              </div>
              <p className="relative mt-2 text-[10px] font-bold text-slate-500">左右滑动切换段位</p>
            </motion.div>

            <div className="relative mt-5">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>{rankInfo.current.name}</span>
                <span>{rankInfo.next ? `还差 ${rankInfo.remaining} 到 ${rankInfo.next.name}` : '已达最高段位'}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rankInfo.progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300"
                />
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-white/10 bg-[#080d14]/82 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-[0.22em] text-amber-200">GLOW SHOP</p>
                <h2 className="mt-1 text-base font-black tracking-tight text-white">{selectedRank.name}兑换商城</h2>
              </div>
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-right">
                <p className="text-[10px] font-bold text-cyan-100/65">可用光迹值</p>
                <p className="font-mono text-sm font-black text-cyan-200">{lightValue}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {selectedShopItems.map(item => {
                const Icon = item.icon;
                const rankLocked = !selectedUnlocked || (!!item.requiredRankLevel && rankInfo.current.level < item.requiredRankLevel);
                const weeklyUsed = !!item.weeklyLimit && weeklyGlowExchangeIds.includes(item.id);
                const owned = !!item.oneTime && unlockedGlowPerkIds.includes(item.id);
                const canExchange = !rankLocked && !weeklyUsed && !owned && lightValue >= item.cost;
                const buttonText = owned
                  ? '已拥有'
                  : weeklyUsed
                    ? '本周已兑'
                    : rankLocked
                      ? `${selectedRank.name}解锁`
                      : canExchange
                        ? '立即兑换'
                        : '光迹值不足';
                return (
                  <motion.div
                    key={item.id}
                    whileTap={{ scale: canExchange ? 0.98 : 1 }}
                    className={`relative flex min-h-[198px] flex-col overflow-hidden rounded-[22px] border p-3 shadow-xl ${
                      canExchange
                        ? 'border-cyan-300/20 bg-slate-950/80'
                        : 'border-white/[0.08] bg-slate-950/[0.58]'
                    }`}
                  >
                    <div className={`absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br ${item.accent} opacity-20 blur-2xl`} />
                    <div className="relative flex items-start justify-between gap-2">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-slate-950 shadow-lg`}>
                        <Icon size={20} />
                      </div>
                      <span className="shrink-0 rounded-full border border-amber-200/15 bg-amber-300/10 px-2.5 py-1 font-mono text-[11px] font-black text-amber-100">-{item.cost}</span>
                    </div>
                    <div className="relative mt-3 flex-1">
                      <h3 className="text-sm font-black leading-tight tracking-tight text-white">{item.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.requiredRankLevel && (
                          <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black ${rankLocked ? 'bg-amber-300/10 text-amber-200' : 'bg-emerald-300/10 text-emerald-200'}`}>
                            {GLOW_RANKS.find(rank => rank.level === item.requiredRankLevel)?.name}解锁
                          </span>
                        )}
                        {item.weeklyLimit && (
                          <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black ${weeklyUsed ? 'bg-slate-500/10 text-slate-400' : 'bg-indigo-300/10 text-indigo-200'}`}>
                            每周 1 张
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[10px] font-medium leading-relaxed text-slate-400">{item.description}</p>
                    </div>
                    <button
                      disabled={!canExchange}
                      onClick={() => handleExchange(item.id)}
                      className={`relative mt-4 h-10 w-full rounded-2xl text-[11px] font-black transition-colors ${
                        canExchange
                          ? 'bg-gradient-to-r from-cyan-200 to-indigo-200 text-slate-950 shadow-[0_0_22px_rgba(103,232,249,0.22)]'
                          : 'border border-white/10 bg-white/[0.035] text-slate-500'
                      }`}
                    >
                      {buttonText}
                    </button>
                  </motion.div>
                );
              })}
              <div className="relative flex min-h-[198px] flex-col items-center justify-center overflow-hidden rounded-[22px] border border-dashed border-white/10 bg-white/[0.025] p-4 text-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,0.08),transparent_56%)]" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-500">
                  <Sparkles size={22} />
                </div>
                <h3 className="relative mt-4 text-sm font-black text-slate-200">更多兑换物品</h3>
                <p className="relative mt-2 text-[11px] font-bold text-slate-500">敬请期待</p>
              </div>
            </div>

          </section>
        </main>
      </div>

      <AnimatePresence>
        {showRankInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-md"
            onClick={() => setShowRankInfo(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.96 }}
              className="w-full max-w-[330px] rounded-[28px] border border-white/10 bg-[#07111b] p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-200" />
                  <h2 className="text-lg font-black text-white">段位说明</h2>
                </div>
                <button
                  onClick={() => setShowRankInfo(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-400">
                段位根据累计光迹值判定，用来记录你的长期探索进度。当前光迹值可以变化，但已达成的段位不会因为消耗而倒退。
              </p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-400">
                每次解锁新段位可领取 1 个段位红包；左右滑动段位卡，可预览对应段位的专属兑换物品。
              </p>
              {nextRank && (
                <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                  <p className="text-[10px] font-black tracking-[0.2em] text-cyan-200">下一目标</p>
                  <p className="mt-2 text-sm font-black text-white">
                    累计 {nextRank.threshold} 光迹值解锁 {nextRank.name}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rankRewardReveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/82 p-6 backdrop-blur-lg"
          >
            <motion.div
              initial={{ opacity: 0, y: 26, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20 }}
              className="relative w-full max-w-[320px] overflow-hidden rounded-[32px] border border-white/12 bg-[#0b1019] p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.66)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.28),transparent_44%),radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.18),transparent_32%),linear-gradient(160deg,rgba(255,255,255,0.07),transparent_64%)]" />
              <div className={`absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${rankRewardReveal.color} opacity-25 blur-3xl`} />
              <div className={`absolute -left-10 bottom-2 h-32 w-32 rounded-full bg-gradient-to-br ${rankRewardReveal.color} opacity-20 blur-3xl`} />

              {[0, 1, 2, 3, 4, 5, 6, 7].map(item => (
                <motion.span
                  key={item}
                  className={`absolute h-1.5 w-1.5 rounded-full bg-gradient-to-br ${rankRewardReveal.color} shadow-[0_0_16px_rgba(251,191,36,0.8)]`}
                  initial={{
                    opacity: 0,
                    x: 150,
                    y: 145,
                    scale: 0.3
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: 150 + Math.cos((item / 8) * Math.PI * 2) * 122,
                    y: 145 + Math.sin((item / 8) * Math.PI * 2) * 96,
                    scale: [0.4, 1.2, 0.6]
                  }}
                  transition={{
                    duration: 1.15,
                    repeat: Infinity,
                    delay: item * 0.07,
                    ease: 'easeOut'
                  }}
                />
              ))}

              <div className="relative mx-auto mt-1 flex h-32 w-32 items-center justify-center">
                <motion.div
                  className={`absolute inset-0 rounded-full bg-gradient-to-br ${rankRewardReveal.color} opacity-25 blur-2xl`}
                  animate={{
                    scale: rankRewardReveal.phase === 'opening' ? [1, 1.36, 1.08] : [0.92, 1.12, 0.92],
                    opacity: rankRewardReveal.phase === 'opening' ? [0.28, 0.72, 0.38] : [0.2, 0.42, 0.2]
                  }}
                  transition={{
                    duration: rankRewardReveal.phase === 'opening' ? 0.72 : 1.5,
                    repeat: rankRewardReveal.phase === 'opening' ? 0 : Infinity,
                    ease: 'easeInOut'
                  }}
                />
                <motion.div
                  className={`absolute inset-2 rounded-[34px] bg-gradient-to-br ${rankRewardReveal.color} p-[2px] shadow-[0_20px_58px_rgba(0,0,0,0.42)]`}
                  animate={rankRewardReveal.phase === 'opening'
                    ? { rotateY: [0, 24, -18, 0], rotateZ: [0, -4, 4, 0], scale: [1, 1.08, 0.98, 1.12] }
                    : { y: [0, -8, 0], rotateZ: [-2, 2, -2] }}
                  transition={{ duration: rankRewardReveal.phase === 'opening' ? 0.82 : 1.55, repeat: rankRewardReveal.phase === 'opening' ? 0 : Infinity }}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-[32px] bg-[#07111b] text-white">
                    <div className="absolute inset-4 rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_34%_20%,rgba(255,255,255,0.18),transparent_32%)]" />
                    <RankBadgeIcon level={rankRewardReveal.level} />
                  </div>
                </motion.div>
                <motion.div
                  className="absolute -bottom-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-100/35 bg-gradient-to-br from-[#ff4b2e] via-[#ff7a1a] to-[#ffd15d] text-white shadow-[0_16px_44px_rgba(248,113,22,0.38)]"
                  animate={rankRewardReveal.phase === 'opening'
                    ? { y: [0, -18, 4, 0], scale: [1, 1.14, 0.94, 1.08] }
                    : { y: [0, -5, 0] }}
                  transition={{ duration: rankRewardReveal.phase === 'opening' ? 0.78 : 1.3, repeat: rankRewardReveal.phase === 'opening' ? 0 : Infinity }}
                >
                  <div className="absolute inset-x-2 top-6 h-px bg-yellow-100/70" />
                  <Gift size={28} className="relative" />
                </motion.div>
              </div>

              <p className="relative mt-6 text-[10px] font-black uppercase tracking-[0.28em] text-amber-100/80">
                LV.{rankRewardReveal.level} {rankRewardReveal.name}
              </p>
              <h3 className="relative mt-2 text-2xl font-black text-white">
                {rankRewardReveal.phase === 'activating' ? '段位红包已激活' : '正在开启红包'}
              </h3>
              <p className="relative mt-2 text-xs font-bold leading-5 text-slate-400">
                {rankRewardReveal.phase === 'activating' ? '段位徽章正在确认，红包奖励即将入账。' : '好运正在展开，马上揭晓本次奖励。'}
              </p>

              <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${rankRewardReveal.color}`}
                  initial={{ width: '16%' }}
                  animate={{ width: rankRewardReveal.phase === 'activating' ? '56%' : '100%' }}
                  transition={{ duration: rankRewardReveal.phase === 'activating' ? 0.58 : 0.82, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rankRewardResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md"
            onClick={() => setRankRewardResult(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 260, damping: 21 }}
              className="relative w-full max-w-[320px] overflow-hidden rounded-[30px] border border-rose-200/20 bg-[#10101a] p-6 text-center shadow-[0_24px_80px_rgba(244,63,94,0.28)]"
              onClick={event => event.stopPropagation()}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,113,133,0.24),transparent_52%),linear-gradient(160deg,rgba(251,191,36,0.09),transparent_60%)]" />
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-300 to-red-500 text-white shadow-[0_0_34px_rgba(251,113,133,0.34)]">
                <Gift size={30} />
              </div>
              <p className="relative mt-5 text-[10px] font-black tracking-[0.2em] text-rose-200">
                LV.{rankRewardResult.level} 段位红包
              </p>
              <p className="relative mt-2 font-mono text-5xl font-black text-white">¥{rankRewardResult.amount}</p>
              <p className="relative mt-3 text-xs font-semibold text-slate-400">恭喜解锁新的光迹段位</p>
              <button
                type="button"
                onClick={() => setRankRewardResult(null)}
                className="relative mt-6 h-11 w-full rounded-2xl bg-gradient-to-r from-rose-300 to-amber-200 text-xs font-black text-slate-950"
              >
                收下红包
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute left-1/2 top-20 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-4 py-2 text-xs font-black text-slate-950 shadow-xl"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
