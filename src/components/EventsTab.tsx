import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Gift, Globe2, ChevronRight, Sparkles, MessageSquare, Calendar, Users, Flame } from 'lucide-react';

interface EventsTabProps {
  focusActivity?: 'hundred' | null;
  onSelectMedley?: () => void;
  onSelectTeamRelay?: () => void;
  onSelectMedalLottery?: () => void;
  onSelectWeightLossPlan?: () => void;
}

export default function EventsTab({ focusActivity, onSelectMedley, onSelectTeamRelay, onSelectMedalLottery, onSelectWeightLossPlan }: EventsTabProps) {
  const hundredCitiesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusActivity !== 'hundred') return;

    const frame = window.requestAnimationFrame(() => {
      hundredCitiesRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusActivity]);

  return (
    <div className="w-full h-full bg-[#05070A] overflow-y-auto pb-24 text-slate-100 font-sans hide-scrollbar relative">
      <div className="sticky top-0 z-20 bg-black/40 backdrop-blur-md pt-safeb flex items-center justify-center p-3.5 border-b border-white/10">
        <h1 className="text-sm font-bold tracking-widest uppercase text-cyan-400">热门活动</h1>
      </div>

      <div className="p-3.5 flex flex-col gap-3.5">
        {/* Banner 0: 周末城市记忆串烧 */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onSelectMedley}
          className="relative w-full h-[170px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group border border-emerald-500/30"
        >
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600&h=400" 
            alt="周末城市记忆串烧" 
            className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-emerald-900/20 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent pointer-events-none" />
          
          <div className="absolute top-3 right-3 bg-emerald-500/30 backdrop-blur-md text-[9px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-full text-[#a1f2da] flex items-center gap-1 shadow-lg border border-emerald-500/50">
            <Calendar size={10} className="animate-pulse" />
            每周末开放
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3.5">
            <div className="w-8 h-8 bg-emerald-500/20 backdrop-blur-md rounded-lg flex items-center justify-center mb-2 border border-emerald-500/30 shadow-inner">
               <Sparkles size={16} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
            <h2 className="text-base font-bold mb-0.5 tracking-wide text-emerald-100 flex items-center gap-2">
              <span>周末城市记忆串烧</span>
              <span className="text-[8px] bg-amber-400/20 border border-amber-400/40 text-amber-300 font-extrabold px-1.5 py-0.5 rounded-md uppercase font-mono tracking-normal leading-none scale-90 origin-left">第一期</span>
            </h2>
            <div className="flex items-center justify-between">
              <p className="text-emerald-200/60 text-[11px] max-w-[65%] leading-relaxed line-clamp-2">
                选取3个城市经典记忆路线，完成后可抽取现金奖励！
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/25 border border-emerald-500/40 text-[#a2dfcb] text-[10px] font-semibold flex items-center gap-1.5 transition-colors shadow-lg active:scale-95 cursor-default"
                >
                  <MessageSquare size={11} />
                  讨论
                </button>
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 backdrop-blur flex items-center justify-center border border-emerald-500/30 group-hover:bg-emerald-500/30 transition-colors">
                  <ChevronRight size={14} className="text-emerald-200" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Banner 1: 城市拼图小队 */}
        {/* Banner: 30-day weight loss plan */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={onSelectWeightLossPlan}
          className="relative w-full h-[170px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group border border-rose-400/30"
        >
          <img
            src="https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&q=80&w=600&h=400"
            alt="30天燃脂计划"
            className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-rose-950/20 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-transparent to-rose-500/10 pointer-events-none" />

          <div className="absolute top-3 right-3 bg-rose-400/20 backdrop-blur-md text-[9px] tracking-widest font-extrabold px-2.5 py-1 rounded-full text-rose-100 flex items-center gap-1 shadow-lg border border-rose-300/40">
            <Calendar size={10} />
            30天计划
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3.5">
            <div className="w-8 h-8 bg-orange-400/20 backdrop-blur-md rounded-lg flex items-center justify-center mb-2 border border-orange-300/30 shadow-inner">
              <Flame size={16} className="text-orange-300 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
            </div>
            <h2 className="text-base font-bold mb-0.5 tracking-wide text-orange-50">
              30天燃脂计划
            </h2>
            <div className="flex items-center justify-between">
              <p className="text-orange-100/65 text-[11px] max-w-[72%] leading-relaxed line-clamp-2">
                每天推荐 1 条燃脂路线，完成关键节点即可开启现金红包盲盒。
              </p>
              <div className="w-7 h-7 rounded-full bg-orange-400/10 backdrop-blur flex items-center justify-center border border-orange-300/30 group-hover:bg-orange-400/25 transition-colors">
                <ChevronRight size={14} className="text-orange-100" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onSelectTeamRelay}
          className="relative order-last w-full h-[170px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group border border-cyan-500/30"
        >
          <img 
            src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&q=80&w=600&h=400" 
            alt="城市拼图小队" 
            className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-cyan-900/20 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent pointer-events-none" />
          
          <div className="absolute top-3 right-3 bg-cyan-500/20 backdrop-blur-sm text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full text-cyan-200 flex items-center gap-1 shadow-lg border border-cyan-500/50">
            <Users size={10} className="animate-pulse" />
            2人小队
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3.5">
            <div className="w-8 h-8 bg-cyan-500/20 backdrop-blur-md rounded-lg flex items-center justify-center mb-2 border border-cyan-500/30 shadow-inner">
               <Users size={16} className="text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            </div>
            <h2 className="text-base font-bold mb-0.5 tracking-wide text-cyan-100 flex items-center gap-2">
              <span>城市拼图小队</span>
              <span className="text-[8px] bg-cyan-400/20 border border-cyan-400/40 text-cyan-200 font-extrabold px-1.5 py-0.5 rounded-md uppercase font-mono tracking-normal leading-none scale-90 origin-left">多人协作</span>
            </h2>
            <div className="flex items-center justify-between">
              <p className="text-cyan-200/60 text-[11px] max-w-[65%] leading-relaxed line-clamp-2">
                创建或加入 2 人小队，完成随机城市路线拼图，点亮全城后瓜分现金奖励。
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="px-2.5 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-[10px] font-semibold flex items-center gap-1.5 transition-colors shadow-lg active:scale-95 cursor-default"
                >
                  <MessageSquare size={11} />
                  讨论
                </button>
                <div className="w-7 h-7 rounded-full bg-cyan-500/10 backdrop-blur flex items-center justify-center border border-cyan-500/30 group-hover:bg-cyan-500/30 transition-colors">
                  <ChevronRight size={14} className="text-cyan-200" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Banner 2: 勋章盲盒抽奖 */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onSelectMedalLottery}
          className="relative order-first w-full h-[170px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group border border-amber-500/30"
        >
          <img 
            src="https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&q=80&w=600&h=400" 
            alt="勋章抽奖" 
            className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-amber-900/20 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent pointer-events-none" />
          
          <div className="absolute top-3 right-3 bg-amber-500/20 backdrop-blur-sm text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full text-amber-200 flex items-center gap-1 shadow-lg border border-amber-500/50">
            <Sparkles size={10} className="animate-pulse" />
            每日开放
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3.5">
            <div className="w-8 h-8 bg-amber-500/20 backdrop-blur-md rounded-lg flex items-center justify-center mb-2 border border-amber-500/30 shadow-inner">
               <Gift size={16} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            </div>
            <h2 className="text-base font-bold mb-0.5 tracking-wide text-amber-100">勋章盲盒抽奖</h2>
            <div className="flex items-center justify-between">
              <p className="text-amber-200/60 text-[11px] max-w-[65%] line-clamp-2">消耗勋章，解锁全球城市路线，获取专属勋章抽取现金奖励</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[10px] font-semibold flex items-center gap-1.5 transition-colors shadow-lg active:scale-95 cursor-default"
                >
                  <MessageSquare size={11} />
                  讨论
                </button>
                <div className="w-7 h-7 rounded-full bg-amber-500/10 backdrop-blur flex items-center justify-center border border-amber-500/30 group-hover:bg-amber-500/30 transition-colors">
                  <ChevronRight size={14} className="text-amber-200" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Banner 3: 百人百城计划 */}
        <motion.div
          ref={hundredCitiesRef}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative w-full h-[200px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group border border-purple-500/30"
        >
          <img 
            src="https://images.unsplash.com/photo-1506501139174-099022df5260?auto=format&fit=crop&q=80&w=600&h=500" 
            alt="百人百城计划" 
            className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-purple-900/20 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent pointer-events-none" />
          
          <div className="absolute top-3 right-3 bg-purple-500/20 backdrop-blur-sm text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full text-purple-200 flex items-center gap-1 shadow-lg border border-purple-500/50">
            抽免费旅行
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3.5">
            <div className="w-8 h-8 bg-purple-500/20 backdrop-blur-md rounded-lg flex items-center justify-center mb-2 border border-purple-500/30 shadow-inner">
               <Globe2 size={16} className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            </div>
            <h2 className="text-base font-bold mb-0.5 tracking-wide text-purple-100">百人百城计划</h2>
            <div className="flex items-center justify-between">
              <p className="text-purple-200/60 text-[11px] max-w-[65%] leading-relaxed line-clamp-2">集结全球跑者，共同解锁全球100个标志性城市赛道，瓜分百万奖池。</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="px-2.5 py-1 rounded-full bg-purple-500/20 hover:bg-purple-500/25 border border-purple-500/40 text-purple-200 text-[10px] font-semibold flex items-center gap-1.5 transition-colors shadow-lg active:scale-95 cursor-default"
                >
                  <MessageSquare size={11} />
                  讨论
                </button>
                <div className="w-7 h-7 rounded-full bg-purple-500/10 backdrop-blur flex items-center justify-center border border-purple-500/30 group-hover:bg-purple-500/30 transition-colors">
                  <ChevronRight size={14} className="text-purple-200" />
                </div>
              </div>
            </div>

            <div className="w-full h-1 bg-white/5 mt-3 rounded-full overflow-hidden border border-white/5">
               <motion.div 
                 initial={{ width: 0 }} 
                 animate={{ width: "13.68%" }} 
                 transition={{ duration: 1.5, delay: 0.5 }}
                 className="h-full bg-purple-400" 
               />
            </div>
            <p className="text-[9px] text-purple-300/50 font-mono mt-1 w-full text-right">奖金池 1368/10000</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
