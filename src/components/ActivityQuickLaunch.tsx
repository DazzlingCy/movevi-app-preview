import type { LucideIcon } from 'lucide-react';
import { Flame, Gift, Globe2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface ActivityQuickLaunchProps {
  onSelectMedalLottery?: () => void;
  onSelectMedley?: () => void;
  onSelectWeightLossPlan?: () => void;
  onSelectHundredCities?: () => void;
  drawCounts?: ActivityDrawCounts;
}

export interface ActivityDrawCounts {
  medalLottery?: number;
  weekendMedley?: number;
  weightLossPlan?: number;
  hundredCities?: number;
}

interface ActivityEntry {
  id: string;
  title: string;
  meta: string;
  icon: LucideIcon;
  action?: () => void;
  iconClassName: string;
  iconSurfaceClassName: string;
  remainingDraws: number;
}

export default function ActivityQuickLaunch({
  onSelectMedalLottery,
  onSelectMedley,
  onSelectWeightLossPlan,
  onSelectHundredCities,
  drawCounts = {}
}: ActivityQuickLaunchProps) {
  const activities: ActivityEntry[] = [
    {
      id: 'medal-lottery',
      title: '勋章盲盒',
      meta: '每日开放',
      icon: Gift,
      action: onSelectMedalLottery,
      iconClassName: 'text-amber-200',
      iconSurfaceClassName: 'border-amber-300/30 bg-amber-300/15',
      remainingDraws: drawCounts.medalLottery || 0
    },
    {
      id: 'weekend-medley',
      title: '周末串烧',
      meta: '现金奖励',
      icon: Sparkles,
      action: onSelectMedley,
      iconClassName: 'text-emerald-200',
      iconSurfaceClassName: 'border-emerald-300/30 bg-emerald-300/15',
      remainingDraws: drawCounts.weekendMedley || 0
    },
    {
      id: 'weight-loss-plan',
      title: '30天燃脂',
      meta: '今日可跑',
      icon: Flame,
      action: onSelectWeightLossPlan,
      iconClassName: 'text-orange-200',
      iconSurfaceClassName: 'border-orange-300/30 bg-orange-300/15',
      remainingDraws: drawCounts.weightLossPlan || 0
    },
    {
      id: 'hundred-cities',
      title: '百人百城',
      meta: '抽免费旅行',
      icon: Globe2,
      action: onSelectHundredCities,
      iconClassName: 'text-violet-200',
      iconSurfaceClassName: 'border-violet-300/30 bg-violet-300/15',
      remainingDraws: drawCounts.hundredCities || 0
    }
  ];

  return (
    <section
      aria-label="活动快捷入口"
      className="premium-material-strong rounded-[30px] p-3.5"
    >
      <div className="grid grid-cols-4 gap-2">
        {activities.map((activity, index) => {
          const Icon = activity.icon;

          return (
            <motion.button
              key={activity.id}
              type="button"
              aria-label={`${activity.title}，${activity.meta}${activity.remainingDraws > 0 ? `，剩余抽奖 ${activity.remainingDraws} 次` : ''}`}
              onClick={activity.action}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 + index * 0.04, duration: 0.22, ease: 'easeOut' }}
              whileTap={{ scale: 0.97 }}
              className="group relative min-h-[88px] overflow-hidden rounded-[22px] border border-white/[0.075] bg-white/[0.038] px-1 py-2.5 text-center transition-colors duration-200 hover:border-white/[0.14] hover:bg-white/[0.065] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              {activity.remainingDraws > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-2 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#121518] bg-[var(--danger)] px-1 font-mono text-[8px] font-bold leading-none text-white"
                >
                  {activity.remainingDraws > 99 ? '99+' : activity.remainingDraws}
                </span>
              )}
              <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-[15px] border ${activity.iconSurfaceClassName}`}>
                <Icon size={18} strokeWidth={1.9} className={activity.iconClassName} />
              </span>
              <span className="mt-1.5 block whitespace-nowrap text-[11px] font-semibold leading-tight tracking-[-0.01em] text-white/95">
                {activity.title}
              </span>
              <span className="mt-1 block whitespace-nowrap text-[9px] font-medium leading-tight text-white/58">
                {activity.meta}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
