import { useState, useEffect } from 'react';
import { Compass, Trophy, Map as MapIcon, User, Gift, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HomeTab from './components/HomeTab';
import EventsTab from './components/EventsTab';
import { CITIES } from './data/cities';
import CitiesTab from './components/CitiesTab';
import ProfileTab from './components/ProfileTab';
import CityRoutesView from './components/CityRoutesView';
import RouteDetailView from './components/RouteDetailView';
import RunPlaybackView from './components/RunPlaybackView';
import IntroScreen from './components/IntroScreen';
import LitRecordsView from './components/LitRecordsView';
import LeaderboardView from './components/LeaderboardView';
import WeekendMedleyView from './components/WeekendMedleyView';
import TeamRelayView, { type TeamRelayMember, type TeamRelayTask } from './components/TeamRelayView';
import GlowCenterView, { type GlowExchangeType } from './components/GlowCenterView';
import GlowWheelView from './components/GlowWheelView';
import MedalLotteryView from './components/MedalLotteryView';
import WeightLossPlanView, { type WeightPlanRewardRecord } from './components/WeightLossPlanView';
import { getGlowRank, getGlowWheelDailyExchangeLimit } from './lib/glow';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [eventsFocus, setEventsFocus] = useState<'hundred' | null>(null);
  const [showEventsBadge, setShowEventsBadge] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showDailyRouteTaskGuide, setShowDailyRouteTaskGuide] = useState(false);
  const [taskPanelOpenSignal, setTaskPanelOpenSignal] = useState(0);
  const [fullScreenPage, setFullScreenPage] = useState<{type: 'cityRoutes' | 'routeDetail' | 'runPlayback' | 'litRecords' | 'leaderboard' | 'weekendMedley' | 'teamRelay' | 'glowCenter' | 'glowWheel' | 'medalLottery' | 'weightLossPlan', data?: any} | null>(null);

  // Weekend City Memory Medley Activity states
  const [medleySelectedRouteIds, setMedleySelectedRouteIds] = useState<string[]>([]);
  const [medleyCompletedRouteIds, setMedleyCompletedRouteIds] = useState<string[]>([]);
  const [medleyLotteryChances, setMedleyLotteryChances] = useState<number>(5);
  const [medleyDrawHistory, setMedleyDrawHistory] = useState<number[]>([]);
  const [medleyShareBonusClaimed, setMedleyShareBonusClaimed] = useState<boolean>(false);
  const [medleyActivityStarted, setMedleyActivityStarted] = useState<boolean>(false);
  const [medleyCompletionRewardClaimed, setMedleyCompletionRewardClaimed] = useState<boolean>(false);

  // City Puzzle Team Activity states
  const [teamRelayStarted, setTeamRelayStarted] = useState<boolean>(false);
  const [teamRelayMembers, setTeamRelayMembers] = useState<TeamRelayMember[]>([]);
  const [teamRelayTasks, setTeamRelayTasks] = useState<TeamRelayTask[]>([]);
  const [teamRelayCompletedTaskIds, setTeamRelayCompletedTaskIds] = useState<string[]>([]);
  const [teamRelayLotteryChances, setTeamRelayLotteryChances] = useState<number>(0);
  const [teamRelayDrawHistory, setTeamRelayDrawHistory] = useState<number[]>([]);
  const [teamRelayShareBonusClaimed, setTeamRelayShareBonusClaimed] = useState<boolean>(false);
  const [teamRelayCityId, setTeamRelayCityId] = useState<string | null>(null);
  const [teamRelayPuzzleAwarded, setTeamRelayPuzzleAwarded] = useState<boolean>(false);

  // 30-Day Weight Loss Plan states
  const [weightPlanStarted, setWeightPlanStarted] = useState<boolean>(false);
  const [weightPlanCompletedDays, setWeightPlanCompletedDays] = useState<number[]>([]);
  const [weightPlanRewardBoxes, setWeightPlanRewardBoxes] = useState<number[]>([1]);
  const [weightPlanOpenedRewardDays, setWeightPlanOpenedRewardDays] = useState<number[]>([]);
  const [weightPlanRewardHistory, setWeightPlanRewardHistory] = useState<WeightPlanRewardRecord[]>([]);
  const [litCityIds, setLitCityIds] = useState<string[]>(() => {
    // Default home preview: Hangzhou and Seoul are lit, Beijing is the active city.
    CITIES.forEach(c => {
      if (c.status !== 'upcoming') c.status = 'unlit';
      c.completed = 0;
      c.completedRouteIndices = [];
      c.completedRouteTimestamps = {};
      c.justLit = false;
    });

    const hangzhou = CITIES.find(city => city.id === '1');
    const seoul = CITIES.find(city => city.id === '13');
    const beijing = CITIES.find(city => city.id === '2');
    if (!hangzhou || !seoul || !beijing) return [];

    [hangzhou, seoul].forEach(city => {
      city.status = 'lit';
      city.completed = city.routes;
      city.completedRouteIndices = Array.from({ length: city.routes }, (_, index) => index);
    });

    beijing.status = 'in-progress';
    beijing.completed = 1;
    beijing.completedRouteIndices = [0];
    return [hangzhou.id, seoul.id, beijing.id];
  });

  const [completedChapters, setCompletedChapters] = useState<number[]>([]);
  const [targetFlight, setTargetFlight] = useState<{fromCityId: string, toCityId: string} | null>(null);
  const [sessionCompletedFlights, setSessionCompletedFlights] = useState<Array<{fromCityId: string; toCityId: string}>>([]);
  const [pendingSelectionFrom, setPendingSelectionFrom] = useState<string | null>(null);
  const [userStats, setUserStats] = useState({
    completedCities: 3,
    completedRoutes: 36,
    totalDistance: 62.0,
    totalTimeHours: 12.0,
    lightValue: 120,
    lifetimeLightValue: 120,
    dailyCheckedIn: false,
    dailyDistance: 0,
    dailyTreadmillStarted: false,
    dailyCompletedRoutes: 0,
    weeklyCompletedCities: 0,
    claimedDailyTaskIds: [] as string[],
    claimedWeeklyTaskIds: [] as string[],
    medalMysteryTickets: 0,
    weeklyGlowExchangeIds: [] as string[],
    unlockedGlowPerkIds: [] as string[],
    claimedGlowRankRewardLevels: [] as number[],
    glowRankRewardHistory: [] as Array<{ level: number; amount: string; claimedAt: string }>,
    glowWheelChances: 0,
    dailyGlowWheelExchangeCount: 0,
    glowWheelDrawHistory: [] as Array<{ id: string; amount: number; createdAt: string }>
  });

  const tabs = [
    { id: 'home', label: '首页', icon: Compass },
    { id: 'events', label: '活动', icon: Trophy },
    { id: 'cities', label: '城市', icon: MapIcon },
    { id: 'profile', label: '我的', icon: User },
  ];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab 
          userStats={userStats}
          setUserStats={setUserStats}
          taskPanelOpenSignal={taskPanelOpenSignal}
          onNavigate={(type, data) => setFullScreenPage({ type: type as any, data })} 
          onSelectMedley={() => setFullScreenPage({ type: 'weekendMedley' })}
          onSelectMedalLottery={() => setFullScreenPage({ type: 'medalLottery' })}
          onSelectWeightLossPlan={() => setFullScreenPage({ type: 'weightLossPlan' })}
          onSelectHundredCities={() => {
            setShowEventsBadge(false);
            setEventsFocus('hundred');
            setActiveTab('events');
          }}
          onViewAllEvents={() => {
            setShowEventsBadge(false);
            setEventsFocus(null);
            setActiveTab('events');
          }}
          activityDrawCounts={{
            medalLottery: userStats.medalMysteryTickets || 0,
            weekendMedley: medleyLotteryChances,
            weightLossPlan: weightPlanRewardBoxes.filter(day => !weightPlanOpenedRewardDays.includes(day)).length,
            hundredCities: 0
          }}
          completedChapters={completedChapters} 
          targetFlight={targetFlight} 
          sessionCompletedFlights={sessionCompletedFlights}
          pendingSelectionFrom={pendingSelectionFrom}
          litCityIds={litCityIds}
          onCitySelected={(cityId) => {
            if (pendingSelectionFrom) {
              setTargetFlight({ fromCityId: pendingSelectionFrom, toCityId: cityId });
              setPendingSelectionFrom(null);
            } else {
              // Direct selection or first selection
              const city = CITIES.find(c => c.id === cityId);
              if (city) {
                CITIES.forEach(c => { if(c.status === 'in-progress') c.status = 'unlit'; });
                city.status = 'in-progress';
                setLitCityIds(prev => {
                  if (prev.includes(cityId)) return prev;
                  return [...prev, cityId];
                });
              }
            }
          }}
          onFlightComplete={() => {
          if (targetFlight) {
            setSessionCompletedFlights(previous => (
              previous.some(flight => flight.fromCityId === targetFlight.fromCityId && flight.toCityId === targetFlight.toCityId)
                ? previous
                : [...previous, targetFlight]
            ));
            const nextCity = CITIES.find(c => c.id === targetFlight.toCityId);
            if (nextCity && (nextCity.status === 'unlit' || nextCity.status === 'in-progress')) {
              nextCity.status = 'in-progress';
              setLitCityIds(prev => {
                if (prev.includes(nextCity.id)) return prev;
                return [...prev, nextCity.id];
              });
            }
          }
          setTargetFlight(null);
        }} />;
      case 'events':
        return (
          <EventsTab
            focusActivity={eventsFocus}
            onSelectMedley={() => setFullScreenPage({ type: 'weekendMedley' })}
            onSelectWeightLossPlan={() => setFullScreenPage({ type: 'weightLossPlan' })}
            onSelectTeamRelay={() => setFullScreenPage({ type: 'teamRelay' })}
            onSelectMedalLottery={() => setFullScreenPage({ type: 'medalLottery' })}
          />
        );
      case 'cities':
        return <CitiesTab onCityClick={(city) => setFullScreenPage({ type: 'cityRoutes', data: city })} />;
      case 'profile':
        return <ProfileTab userStats={userStats} />;
      default:
        return <HomeTab userStats={userStats} setUserStats={setUserStats} />;
    }
  };

  const handleGlowExchange = (type: GlowExchangeType) => {
    const exchangeMeta = {
      activityTicket: { title: '串烧补给券', cost: 10, requiredRankLevel: 3, weeklyLimit: 1, oneTime: false },
      rerollCity: { title: '下一城重选券', cost: 3, requiredRankLevel: 0, weeklyLimit: 0, oneTime: false },
      medalMysteryTicket: { title: '勋章盲盒抽奖券', cost: 10, requiredRankLevel: 3, weeklyLimit: 1, oneTime: false },
      silverTrail: { title: '银光路线主题', cost: 8, requiredRankLevel: 2, weeklyLimit: 0, oneTime: true },
      diamondFrame: { title: '钻石头像框', cost: 20, requiredRankLevel: 4, weeklyLimit: 0, oneTime: true },
      starlightBadge: { title: '星耀徽记', cost: 30, requiredRankLevel: 5, weeklyLimit: 0, oneTime: true },
      kingNameplate: { title: '王者铭牌', cost: 50, requiredRankLevel: 6, weeklyLimit: 0, oneTime: true }
    }[type];
    const currentGlowRank = getGlowRank(userStats.lifetimeLightValue ?? userStats.lightValue ?? 0).current;
    const weeklyGlowExchangeIds = userStats.weeklyGlowExchangeIds || [];

    if (exchangeMeta.requiredRankLevel && currentGlowRank.level < exchangeMeta.requiredRankLevel) {
      return { success: false, message: '黄金段位以上可兑换' };
    }

    if (exchangeMeta.weeklyLimit && weeklyGlowExchangeIds.includes(type)) {
      return { success: false, message: '本周已兑换' };
    }

    if (exchangeMeta.oneTime && (userStats.unlockedGlowPerkIds || []).includes(type)) {
      return { success: false, message: '该权益已拥有' };
    }

    if ((userStats.lightValue || 0) < exchangeMeta.cost) {
      return { success: false, message: '光迹值不足' };
    }

    setUserStats(prev => ({
      ...prev,
      lightValue: Math.max(0, (prev.lightValue || 0) - exchangeMeta.cost),
      medalMysteryTickets: type === 'medalMysteryTicket'
        ? (prev.medalMysteryTickets || 0) + 1
        : (prev.medalMysteryTickets || 0),
      weeklyGlowExchangeIds: exchangeMeta.weeklyLimit
        ? [...(prev.weeklyGlowExchangeIds || []), type]
        : (prev.weeklyGlowExchangeIds || []),
      unlockedGlowPerkIds: exchangeMeta.oneTime
        ? [...(prev.unlockedGlowPerkIds || []), type]
        : (prev.unlockedGlowPerkIds || [])
    }));

    if (type === 'activityTicket') {
      setMedleyLotteryChances(prev => prev + 1);
      return { success: true, message: '周末串烧抽奖机会 +1' };
    }

    if (type === 'medalMysteryTicket') {
      return { success: true, message: '已获得勋章盲盒抽奖券' };
    }

    if (exchangeMeta.oneTime) {
      return { success: true, message: `已解锁${exchangeMeta.title}` };
    }

    const currentCityId = CITIES.find(city => city.status === 'in-progress')?.id || litCityIds[litCityIds.length - 1] || '1';
    setActiveTab('home');
    setFullScreenPage(null);
    setPendingSelectionFrom(currentCityId);
    return { success: true, message: '已开启下一城重选' };
  };

  const handleClaimGlowRankReward = (level: number) => {
    const currentGlowRank = getGlowRank(userStats.lifetimeLightValue ?? userStats.lightValue ?? 0).current;
    if (level > currentGlowRank.level) {
      return { success: false, message: '尚未达到该段位' };
    }

    if ((userStats.claimedGlowRankRewardLevels || []).includes(level)) {
      return { success: false, message: '该段位红包已领取' };
    }

    const rewardAmounts: Record<number, string> = {
      1: '0.18',
      2: '0.38',
      3: '0.88',
      4: '1.88',
      5: '5.88',
      6: '8.88'
    };
    const amount = rewardAmounts[level] || '0.18';

    setUserStats(prev => ({
      ...prev,
      claimedGlowRankRewardLevels: [...(prev.claimedGlowRankRewardLevels || []), level],
      glowRankRewardHistory: [
        {
          level,
          amount,
          claimedAt: new Date().toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        },
        ...(prev.glowRankRewardHistory || [])
      ]
    }));

    return { success: true, message: `获得段位红包 ¥${amount}`, amount };
  };

  const handleGlowWheelExchange = (cost: number) => {
    const currentGlowRank = getGlowRank(userStats.lifetimeLightValue ?? userStats.lightValue ?? 0).current;
    const dailyExchangeLimit = getGlowWheelDailyExchangeLimit(currentGlowRank.level);
    const exchangedToday = userStats.dailyGlowWheelExchangeCount || 0;

    if (exchangedToday >= dailyExchangeLimit) {
      return { success: false, message: `今日兑换已达上限（${dailyExchangeLimit} 张）` };
    }

    if ((userStats.lightValue || 0) < cost) {
      return { success: false, message: '光迹值不足' };
    }

    setUserStats(prev => ({
      ...prev,
      lightValue: Math.max(0, (prev.lightValue || 0) - cost),
      glowWheelChances: (prev.glowWheelChances || 0) + 1,
      dailyGlowWheelExchangeCount: (prev.dailyGlowWheelExchangeCount || 0) + 1
    }));

    return { success: true, message: '已兑换 1 张抽奖券' };
  };

  const handleGlowWheelDraw = (amount: number) => {
    if ((userStats.glowWheelChances || 0) <= 0) {
      return { success: false, message: '暂无抽奖机会' };
    }

    setUserStats(prev => ({
      ...prev,
      glowWheelChances: Math.max(0, (prev.glowWheelChances || 0) - 1),
      glowWheelDrawHistory: [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          amount,
          createdAt: new Date().toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        },
        ...(prev.glowWheelDrawHistory || [])
      ].slice(0, 20)
    }));

    return { success: true, message: `抽中 ¥${amount.toFixed(2)}` };
  };

  const handleMedalLotteryDraw = () => {
    if ((userStats.medalMysteryTickets || 0) <= 0) {
      return { success: false, message: '暂无勋章盲盒券，请先兑换抽奖机会' };
    }

    const prizePool = ['2.66 元', '1.66 元', '6 分', '2.66 元', '1.66 元', '6 分'];
    const amount = prizePool[Math.floor(Math.random() * prizePool.length)];
    setUserStats(prev => ({
      ...prev,
      medalMysteryTickets: Math.max(0, (prev.medalMysteryTickets || 0) - 1)
    }));

    return { success: true, message: `抽中 ${amount}`, amount };
  };

  const handleWeightPlanRewardOpen = (day: number) => {
    if (!weightPlanRewardBoxes.includes(day)) {
      return { success: false, message: '完成节点后可开启红包盲盒' };
    }

    const existingRecord = weightPlanRewardHistory.find(record => record.day === day);
    if (existingRecord) {
      return { success: false, message: '该盲盒已开启', amount: existingRecord.amount };
    }

    const rewardPools: Record<number, string[]> = {
      1: ['¥0.18', '¥0.38'],
      7: ['¥0.88', '¥1.88'],
      15: ['¥1.88', '¥5.88'],
      21: ['¥1.88', '¥5.88'],
      30: ['¥5.88', '¥8.88', '¥18.88']
    };
    const pool = rewardPools[day] || ['¥0.18'];
    const amount = pool[Math.floor(Math.random() * pool.length)];
    const record: WeightPlanRewardRecord = {
      day,
      amount,
      openedAt: new Date().toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setWeightPlanOpenedRewardDays(prev => prev.includes(day) ? prev : [...prev, day]);
    setWeightPlanRewardHistory(prev => [record, ...prev]);
    return { success: true, message: `获得红包 ${amount}`, amount };
  };

  return (
    <div className="relative mx-auto flex h-screen w-full max-w-md flex-col overflow-hidden bg-[var(--app-bg)] font-sans text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:mt-10 sm:h-[800px] sm:rounded-[44px] sm:border-[8px] sm:border-[#1d2024]">
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="absolute inset-0 z-[200] bg-[#071226]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <img
              src="./splash.png"
              alt="木卫六"
              className="h-full w-full object-cover"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showIntro && (
          <IntroScreen 
            onComplete={() => {
              setShowIntro(false);
            }} 
          />
        )}
      </AnimatePresence>
      <main className="relative flex-1 overflow-hidden bg-[var(--app-bg)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Bottom Navigation */}
      <nav className="z-50 shrink-0 border-t border-white/[0.08] bg-[#090b0d]/92 px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'events') {
                    setShowEventsBadge(false);
                    setEventsFocus(null);
                  }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`relative flex min-h-12 min-w-[60px] flex-col items-center justify-center gap-1 rounded-[18px] px-2 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  isActive ? 'bg-white/[0.06] text-[var(--accent)]' : 'text-white/30 hover:bg-white/[0.035] hover:text-white/60'
                }`}
              >
                <div className="relative flex h-6 w-6 items-center justify-center">
                  <Icon size={20} strokeWidth={1.8} className="transition-colors" />
                  {tab.id === 'events' && showEventsBadge && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#090b0d] bg-[var(--danger)]" />
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-[-0.01em]">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* Full Screen Pages overlays on top of everything including bottom nav */}
      <AnimatePresence>
        {fullScreenPage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-[100] bg-[#05070A]"
          >
            {fullScreenPage.type === 'cityRoutes' && (
               <CityRoutesView 
                 city={fullScreenPage.data} 
                 onBack={() => setFullScreenPage(null)} 
                 onRouteClick={(routeIndex) => setFullScreenPage({ 
                   type: 'routeDetail', 
                   data: { cityId: fullScreenPage.data.id, routeIndex, image: fullScreenPage.data.image, previousCityData: fullScreenPage.data } 
                 })} 
                 onExploreNext={(currentCityId) => {
                   setPendingSelectionFrom(currentCityId);
                   setFullScreenPage(null);
                   setActiveTab('home');
                 }}
               />
            )}
            {fullScreenPage.type === 'routeDetail' && (
               <RouteDetailView 
                 {...fullScreenPage.data}
                 onBack={() => {
                   if (fullScreenPage.data.isTeamRelayRoute) {
                     setFullScreenPage({ type: 'teamRelay' });
                   } else if (fullScreenPage.data.isWeightPlanRoute) {
                     setFullScreenPage({ type: 'weightLossPlan' });
                   } else if (fullScreenPage.data.isActivityRoute) {
                     setFullScreenPage({ type: 'weekendMedley' });
                   } else {
                     setFullScreenPage({ type: 'cityRoutes', data: fullScreenPage.data.previousCityData });
                   }
                 }}
                 onStart={() => {
                   setUserStats(prev => ({
                     ...prev,
                     dailyTreadmillStarted: true
                   }));
                   setFullScreenPage({ type: 'runPlayback', data: fullScreenPage.data });
                 }}
               />
            )}
            {fullScreenPage.type === 'runPlayback' && (
               <RunPlaybackView 
                 {...fullScreenPage.data}
                 onExit={() => setFullScreenPage({ type: 'routeDetail', data: fullScreenPage.data })}
                  onComplete={(stats) => {
                    const earnedLightValue = stats.calories || Math.floor(stats.distance * 65);
                    // Update user stats
                    const shouldShowDailyRouteTaskGuide = (userStats.dailyCompletedRoutes || 0) === 0;
                    setUserStats(prev => ({
                      ...prev,
                      totalDistance: prev.totalDistance + stats.distance,
                      totalTimeHours: prev.totalTimeHours + (stats.duration / 3600),
                      lightValue: (prev.lightValue || 0) + earnedLightValue,
                      lifetimeLightValue: (prev.lifetimeLightValue ?? prev.lightValue ?? 0) + earnedLightValue,
                      dailyDistance: (prev.dailyDistance || 0) + stats.distance,
                      dailyCompletedRoutes: (prev.dailyCompletedRoutes || 0) + 1
                    }));
                    if (shouldShowDailyRouteTaskGuide) {
                      setShowDailyRouteTaskGuide(true);
                    }

                    if (fullScreenPage.data.isActivityRoute) {
                      const activityKey = `${fullScreenPage.data.cityId}-${fullScreenPage.data.routeIndex}`;
                      const alreadyCompleted = medleyCompletedRouteIds.includes(activityKey);
                      const nextCompleted = alreadyCompleted
                        ? medleyCompletedRouteIds
                        : [...medleyCompletedRouteIds, activityKey];
                      setMedleyCompletedRouteIds(nextCompleted);
                      if (!alreadyCompleted && nextCompleted.length === 3 && !medleyCompletionRewardClaimed) {
                        setMedleyLotteryChances(prevChances => prevChances + 5);
                        setMedleyCompletionRewardClaimed(true);
                      }
                      setFullScreenPage({ type: 'weekendMedley' });
                      return;
                    }

                    if (fullScreenPage.data.isTeamRelayRoute) {
                      const taskId = fullScreenPage.data.teamRelayTaskId || `${fullScreenPage.data.cityId}-${fullScreenPage.data.routeIndex}`;
                      setTeamRelayCompletedTaskIds(prevCompleted => {
                        if (prevCompleted.includes(taskId)) return prevCompleted;
                        const nextCompleted = [...prevCompleted, taskId];
                        if (teamRelayTasks.length > 0 && nextCompleted.length === teamRelayTasks.length && !teamRelayPuzzleAwarded) {
                          setTeamRelayLotteryChances(prevChances => prevChances + 1);
                          setTeamRelayPuzzleAwarded(true);
                        }
                        return nextCompleted;
                      });
                      setFullScreenPage({ type: 'teamRelay' });
                      return;
                    }

                    if (fullScreenPage.data.isWeightPlanRoute) {
                      const day = fullScreenPage.data.weightPlanDay;
                      const milestoneDays = [1, 7, 15, 21, 30];
                      setWeightPlanCompletedDays(prevCompleted => {
                        if (prevCompleted.includes(day)) return prevCompleted;
                        return [...prevCompleted, day].sort((a, b) => a - b);
                      });
                      if (milestoneDays.includes(day)) {
                        setWeightPlanRewardBoxes(prevBoxes => prevBoxes.includes(day) ? prevBoxes : [...prevBoxes, day]);
                      }
                      setFullScreenPage({ type: 'weightLossPlan' });
                      return;
                    }

                    const { previousCityData, routeIndex } = fullScreenPage.data;
                   const realCityData = CITIES.find(c => c.id === previousCityData.id) || previousCityData;
                   const currentCompleted = realCityData.completedRouteIndices || [];
                   
                   if (!currentCompleted.includes(routeIndex)) {
                     realCityData.completedRouteIndices = [...currentCompleted, routeIndex];
                     if (!realCityData.completedRouteTimestamps) {
                       realCityData.completedRouteTimestamps = {};
                     }
                     realCityData.completedRouteTimestamps[routeIndex] = Date.now();
                     realCityData.completed = Math.min(realCityData.completedRouteIndices.length, realCityData.routes);
                     
                     // If this is a newly completed route, increment completedRoutes counter
                     setUserStats(prev => ({ ...prev, completedRoutes: prev.completedRoutes + 1 }));
                   }
                   
                   if (realCityData.completed === realCityData.routes && realCityData.status !== 'lit') {
                     realCityData.status = 'lit';
                     realCityData.justLit = true;
                     // Increment completed cities counter
                     setUserStats(prev => ({
                       ...prev,
                       completedCities: prev.completedCities + 1,
                       weeklyCompletedCities: (prev.weeklyCompletedCities || 0) + 1
                     }));
                   }

                   setCompletedChapters(prev => {
                     const newChapters = [...prev];
                     // Chapter 1: Complete 1 route
                     if (!newChapters.includes(1)) newChapters.push(1);
                     // Chapter 2: Complete 1 city
                     if (realCityData.status === 'lit' && !newChapters.includes(2)) {
                       newChapters.push(2);
                     }
                     
                     const litCount = CITIES.filter(c => c.status === 'lit').length;
                     if (litCount >= 3) {
                       if (!newChapters.includes(3)) newChapters.push(3);
                     }
                     if (litCount >= CITIES.length) {
                       if (!newChapters.includes(4)) newChapters.push(4);
                     }
                     
                     return newChapters;
                   });

                   // Navigate back to cityRoutes with the updated data
                   setFullScreenPage({ type: 'cityRoutes', data: realCityData });
                 }}
               />
            )}
            {fullScreenPage.type === 'litRecords' && (
              <LitRecordsView onBack={() => setFullScreenPage(null)} />
            )}
            {fullScreenPage.type === 'leaderboard' && (
              <LeaderboardView onBack={() => setFullScreenPage(null)} />
            )}
            {fullScreenPage.type === 'glowCenter' && (
              <GlowCenterView
                userStats={userStats}
                onBack={() => setFullScreenPage(null)}
                onExchange={handleGlowExchange}
                onClaimRankReward={handleClaimGlowRankReward}
              />
            )}
            {fullScreenPage.type === 'glowWheel' && (
               <GlowWheelView
                 userStats={userStats}
                 onBack={() => setFullScreenPage({ type: 'glowCenter' })}
                 onExchangeChance={handleGlowWheelExchange}
                 onDraw={handleGlowWheelDraw}
               />
            )}
            {fullScreenPage.type === 'medalLottery' && (
               <MedalLotteryView
                 tickets={userStats.medalMysteryTickets || 0}
                 onBack={() => setFullScreenPage(null)}
                 onGoRun={() => {
                   setFullScreenPage(null);
                   setActiveTab('home');
                 }}
                 onDraw={handleMedalLotteryDraw}
               />
            )}
            {fullScreenPage.type === 'weightLossPlan' && (
               <WeightLossPlanView
                 started={weightPlanStarted}
                 completedDays={weightPlanCompletedDays}
                 rewardBoxes={weightPlanRewardBoxes}
                 openedRewardDays={weightPlanOpenedRewardDays}
                 rewardHistory={weightPlanRewardHistory}
                 onBack={() => setFullScreenPage(null)}
                 onStartPlan={() => setWeightPlanStarted(true)}
                 onOpenReward={handleWeightPlanRewardOpen}
                 onNavigateToRouteDetail={(cityId, routeIndex, image, day) => {
                   setFullScreenPage({
                     type: 'routeDetail',
                     data: {
                       cityId,
                       routeIndex,
                       image,
                       isWeightPlanRoute: true,
                       weightPlanDay: day
                     }
                   });
                 }}
               />
            )}
            {fullScreenPage.type === 'weekendMedley' && (
               <WeekendMedleyView 
                 onBack={() => setFullScreenPage(null)}
                 selectedRouteIds={medleySelectedRouteIds}
                 completedRouteIds={medleyCompletedRouteIds}
                 lotteryChances={medleyLotteryChances}
                 drawHistory={medleyDrawHistory}
                 shareBonusClaimed={medleyShareBonusClaimed}
                 activityStarted={medleyActivityStarted}
                 onUpdateState={(state) => {
                   if (state.selectedRouteIds !== undefined) setMedleySelectedRouteIds(state.selectedRouteIds);
                   if (state.completedRouteIds !== undefined) setMedleyCompletedRouteIds(state.completedRouteIds);
                   if (state.lotteryChances !== undefined) setMedleyLotteryChances(state.lotteryChances);
                   if (state.drawHistory !== undefined) setMedleyDrawHistory(state.drawHistory);
                   if (state.shareBonusClaimed !== undefined) setMedleyShareBonusClaimed(state.shareBonusClaimed);
                   if (state.activityStarted !== undefined) setMedleyActivityStarted(state.activityStarted);
                 }}
                 onNavigateToRouteDetail={(cityId, routeIndex, image) => {
                   setFullScreenPage({
                     type: 'routeDetail',
                     data: {
                       cityId,
                       routeIndex,
                       image,
                       isActivityRoute: true
                     }
                   });
                 }}
               />
            )}
            {fullScreenPage.type === 'teamRelay' && (
               <TeamRelayView
                 onBack={() => setFullScreenPage(null)}
                 started={teamRelayStarted}
                 members={teamRelayMembers}
                 tasks={teamRelayTasks}
                 completedTaskIds={teamRelayCompletedTaskIds}
                 lotteryChances={teamRelayLotteryChances}
                 drawHistory={teamRelayDrawHistory}
                 shareBonusClaimed={teamRelayShareBonusClaimed}
                 cityId={teamRelayCityId}
                 puzzleAwarded={teamRelayPuzzleAwarded}
                 onUpdateState={(state) => {
                   if (state.started !== undefined) setTeamRelayStarted(state.started);
                   if (state.members !== undefined) setTeamRelayMembers(state.members);
                   if (state.tasks !== undefined) setTeamRelayTasks(state.tasks);
                   if (state.completedTaskIds !== undefined) setTeamRelayCompletedTaskIds(state.completedTaskIds);
                   if (state.lotteryChances !== undefined) setTeamRelayLotteryChances(state.lotteryChances);
                   if (state.drawHistory !== undefined) setTeamRelayDrawHistory(state.drawHistory);
                   if (state.shareBonusClaimed !== undefined) setTeamRelayShareBonusClaimed(state.shareBonusClaimed);
                   if (state.cityId !== undefined) setTeamRelayCityId(state.cityId);
                   if (state.puzzleAwarded !== undefined) setTeamRelayPuzzleAwarded(state.puzzleAwarded);
                 }}
                 onNavigateToRouteDetail={(cityId, routeIndex, image, taskId) => {
                   setFullScreenPage({
                     type: 'routeDetail',
                     data: {
                       cityId,
                       routeIndex,
                       image,
                       isTeamRelayRoute: true,
                       teamRelayTaskId: taskId
                     }
                   });
                 }}
               />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDailyRouteTaskGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[140] flex items-center justify-center bg-black/72 p-6 backdrop-blur-md"
            onClick={() => setShowDailyRouteTaskGuide(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="relative w-full max-w-xs overflow-hidden rounded-[28px] border border-cyan-200/20 bg-[#08101a] p-5 text-center shadow-[0_30px_90px_rgba(0,0,0,0.58)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,0.26),transparent_70%)]" />
              <button
                onClick={() => setShowDailyRouteTaskGuide(false)}
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400"
              >
                <X size={15} />
              </button>
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                <Gift size={28} />
                <Sparkles size={15} className="absolute -right-1 -top-1 text-amber-200" />
              </div>
              <p className="relative mt-4 text-[10px] font-black tracking-[0.26em] text-cyan-200">TASK READY</p>
              <h3 className="relative mt-2 text-xl font-black text-white">今日路线任务已完成</h3>
              <p className="relative mt-2 text-xs font-bold leading-6 text-slate-400">
                去任务中心领取光迹值，也可以从任务中心进入光迹值现金抽奖。
              </p>
              <button
                onClick={() => {
                  setShowDailyRouteTaskGuide(false);
                  setFullScreenPage(null);
                  setActiveTab('home');
                  setTaskPanelOpenSignal(prev => prev + 1);
                }}
                className="relative mt-5 h-11 w-full rounded-full bg-gradient-to-r from-cyan-200 to-indigo-200 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(103,232,249,0.22)] active:scale-95"
              >
                去任务中心
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
