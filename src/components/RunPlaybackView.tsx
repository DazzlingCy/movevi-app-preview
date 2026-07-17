import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause, Play, Square, MapPin, ChevronLeft, Zap, Award } from 'lucide-react';
import { getRouteData, CITIES } from '../data/cities';

const MEDALS = [
  { id: 'm1', name: '首航·星际启程', color: 'from-amber-400 via-amber-200 to-yellow-600', text: '🏯' },
  { id: 'm2', name: '江潮·古道点亮', color: 'from-emerald-400 via-teal-200 to-cyan-600', text: '⛩️' },
  { id: 'm3', name: '中轴·紫禁之巅', color: 'from-rose-500 via-orange-300 to-red-700', text: '🏰' },
  { id: 'm4', name: '星火·光能复苏', color: 'from-sky-400 via-indigo-200 to-purple-600', text: '🗼' },
  { id: 'm5', name: '超越·时空引力', color: 'from-fuchsia-500 via-pink-300 to-purple-700', text: '🛸' },
  { id: 'm6', name: '不朽·地球倒影', color: 'from-cyan-400 via-blue-200 to-teal-600', text: '🌍' },
];

const getCityStoryText = (cityName: string, routeIndex: number) => {
  const stories: Record<string, string[]> = {
    '北京': [
      "微光越过积雪的太和殿，你奔跑时泛出的青色轨迹，将故宫角楼与明清轴线的古老能量重新点亮。",
      "那是昆明湖畔清晨最温柔的风。泛起的波纹成了量子引擎的脉搏，用步履重组沉睡千年的星云轨道。",
      "什刹海结冰的湖面闪过赛博彩霓，光迹引擎完美耦合。一幅关于京华烟云的画卷在星轨重新亮起。"
    ],
    '杭州': [
      "西湖断桥在重力波的作用下泛起星光微澜。脚步下的荧光波纹层层叠叠，将雷峰古塔的共振带回母星。",
      "钱塘江潮水澎湃，数字晶格正吸收着你带来的奔跑能谱。江南忆，最忆是今朝，脚步终将重连蔚蓝。",
      "轻舟漫步苏堤，你的跑姿引力场点亮了沉睡千载的柳梢。这是数字极光在绿洲表层完成的全息重设。"
    ],
    '上海': [
      "外滩万国建筑的风华线条被你连成闪烁冷黄流线，陆家嘴三合高塔的引力锚随之朝宇宙发射璀璨华彩。",
      "黄浦江的复古霓虹折射在虚拟视窗中，穿越石库门的微风成了你在太空跑步机上最澎湃的呼气共鸣。",
      "当光轨跨越徐家汇，魔都数字脑中枢发出雀跃回响。在星河深处，我们已再次读出了申城的温度。"
    ],
    '南京': [
      "古老明城墙的粗糙砖石在探测波段中闪烁灵感。你在斑驳古柏下的奔跑，唤醒了金陵十二朝的情深意浓。",
      "玄武湖畔微风轻柔。脚步敲击石阶的声音在十里秦淮河底激发起幽蓝光能，秦淮灯影随足迹重新起伏。",
      "紫金山顶的全息接收塔重新锁定了你的动能。中山门前梧桐在数码荧光的滋补下瞬间开枝散叶，茂密如画。"
    ],
    '西安': [
      "古城墙顶端长明灯重新燃起，每一次步伐与青砖的碰撞都将太白积雪的微光能灌入数字能量塔中。",
      "大雁塔檐角悬挂的量子风铃在这中轴重燃的瞬间，演奏出穿越两千年的大唐雅乐，余音响彻太虚。",
      "丝路起点的全息通道已完全激活。大明宫的断壁残垣瞬间被温润的纳米极光重构，大唐不夜城再度现世。"
    ],
    '东京': [
      "涩谷十字路口上空开始飞散樱花瓣的数码极光。极速的奔跑让红色铁塔迸发出划破重度雾霾的通天火芒。",
      "神乐坂的石板路泛起赛博紫潮，电子风车在光流中盘旋。远古神社与现代合金森林在这里达成了完美交融。",
      "秋叶原的电流幕墙随你的心率亮起五彩电光，你的脚步在虚拟沥青地面踩踏出上世纪遗失的黄金底色。"
    ],
    '巴黎': [
      "塞纳河畔升起一道淡金色的引力断桥。埃菲尔铁塔的发射器在接收你跑步能量后，向全星系播撒法式浪漫。",
      "香榭丽舍那璀璨不灭的诗篇再次被脚步唤醒。卢浮宫玻璃金字塔重新泛起晶莹折射，守护着神圣的文明核心。",
      "凯旋门在星海的粼粼折射中完全醒来。塞纳河的水在量子极光伴奏下，重组出属于浪漫艺术的最强交响。"
    ],
    '伦敦': [
      "大本钟深沉的铜盘在这宏大的重燃交织里，发出悠长的低电频共振，宣告雾都夜晚重新回归星系网络。",
      "泰晤士河潮汐随步伐在屏幕上画出正弦波，西区歌剧院的机械管风琴自动合奏，伦敦塔下的引力锁悄然松开。",
      "伦敦塔桥的重型摆臂在能量网络饱充下平缓地开启。这一刻，沉浮半生的星际水湾终于见识了日不落的朝阳。"
    ],
    '纽约': [
      "曼哈顿摩天幕墙闪烁着瑰丽多姿的全息海报。中央公园的赛博银杏在脚落之处开枝散叶，黄金璀璨。",
      "百老汇霓虹长卷迎着晨跑彻底唤醒。你像是一道光箭刺入这空旷钢骨架构，复苏了这超级服务器的运算核心。",
      "帝国大厦尖端的引力塔彻底接入了你跑步的速度波段，发出一束亮红色的探束，点亮了西半球的太空轨道。"
    ],
    '悉尼': [
      "悉尼歌剧院如一双巨型白贝风帆在星海荧光中缓缓扬帆，达令湾的深蓝粒子因你的奔跑轨迹激荡出灿烂浪花。",
      "海港大桥在极光网络的编织中重获新星级的供能，南十字星的辉光在视网膜映射，南半球港口已全网络通车。"
    ],
    '里约热内卢': [
      "驼背山上的耶稣圣像双臂重新发出千米冷蓝光芒，热情的桑巴鼓点化作你脚边荡漾的霓虹光环，璀璨耀人。",
      "科帕卡巴纳沙滩的极细白沙在你的高频脚频震颤下，化作微小金色飞萤，与大西洋荧光海藻遥相呼应。"
    ],
    '开罗': [
      "吉萨三大金字塔被狂奔扯出的极光缎带团团围绕，守候了三个千年的古陵角点，正以光年速度与宇宙母星校准。",
      "尼罗河沉眠泥沼下的古老能量被探针测出，黄沙之下的圣书体象形文字逐渐浮现出幽绿色的脉冲荧光。"
    ]
  };

  const cityStories = stories[cityName] || [
    "每一次汗水滑落，都是对地球母亲最深情的呼唤。群星静默，而我们在你的奔跑中听到了恒星重燃的心跳。",
    "你不是在奔跑，你是在以不灭的肉体之躯，编织重返蔚蓝星宇的引力丝线。母星的苏醒，正在你脚下成真！"
  ];
  
  return cityStories[routeIndex % cityStories.length];
};

interface RunPlaybackViewProps {
  cityId: string;
  routeIndex: number;
  image: string;
  onExit: () => void;
  onComplete: (stats: { distance: number, duration: number, calories: number }) => void;
}

export default function RunPlaybackView({ cityId, routeIndex, image, onExit, onComplete }: RunPlaybackViewProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [distance, setDistance] = useState(0);
  const [time, setTime] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const city = CITIES.find(c => c.id === cityId || String(c.id) === String(cityId));
  const cityName = city?.name || '北京';
  const routeData = getRouteData(cityId, routeIndex);
  const routeTitle = routeData?.title || '昆明湖畔柳折腰';
  
  const todayDateStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '/');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
        setDistance(prev => prev + 0.003); // Simulate running speed
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculatePace = () => {
    if (distance === 0) return '0.00';
    const paceInMinutes = (time / 60) / distance;
    const paceMinutes = Math.floor(paceInMinutes);
    const paceSeconds = Math.floor((paceInMinutes - paceMinutes) * 60);
    return `${paceMinutes}'${paceSeconds.toString().padStart(2, '0')}"`;
  };

  const handleStop = () => {
    setIsPlaying(false);
    setShowCompletion(true);
  };

  return (
    <div className="w-full h-full bg-black relative overflow-hidden font-sans text-white">
      {/* Background simulating video */}
      <motion.div 
        className="absolute inset-0 z-0 origin-center"
        animate={{
          scale: isPlaying ? [1, 1.1, 1] : 1,
          transition: { duration: 20, repeat: Infinity, ease: 'linear' }
        }}
      >
        <img src={image} alt="Route scenery" className="w-full h-full object-cover opacity-80" />
      </motion.div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 pt-safet px-4 py-6 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onExit} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-medium">
          <MapPin size={14} className="text-[#2ecc71]" />
          <span>路线 {routeIndex}</span>
        </div>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      {/* Center Running Stats */}
      <div className="absolute top-[35%] left-0 right-0 z-10 flex flex-col items-center">
        <div className="text-[90px] font-bold font-mono tracking-tighter leading-none drop-shadow-2xl">
          {distance.toFixed(2)}
        </div>
        <div className="text-sm font-bold tracking-widest text-slate-300 uppercase mt-2 drop-shadow-md bg-black/20 px-4 py-1 rounded-full backdrop-blur-sm">
          公里 (KM)
        </div>
      </div>

      {/* Bottom Stats & Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-safeb bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-32">
        <div className="px-8 pb-10 flex justify-between items-end">
           <div className="flex flex-col items-center">
             <span className="text-3xl font-bold font-mono drop-shadow-md">{formatTime(time)}</span>
             <span className="text-xs text-slate-400 mt-1 font-medium">时间</span>
           </div>
           
           <div className="flex flex-col items-center">
             <span className="text-3xl font-bold font-mono drop-shadow-md">{calculatePace()}</span>
             <span className="text-xs text-slate-400 mt-1 font-medium">配速</span>
           </div>
           
           <div className="flex flex-col items-center">
             <span className="text-3xl font-bold font-mono drop-shadow-md">{Math.floor(distance * 65)}</span>
             <span className="text-xs text-slate-400 mt-1 font-medium">千卡</span>
           </div>
        </div>

        <div className="flex justify-center items-center gap-8 pb-10">
          <button 
            className="w-16 h-16 rounded-full bg-slate-800/80 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-lg active:scale-95 transition-transform"
            onClick={handleStop}
          >
            <Square size={20} className="fill-current text-rose-500" />
          </button>
          
          <button 
            className="w-24 h-24 rounded-full bg-[#2ecc71] shadow-[0_0_30px_rgba(46,204,113,0.5)] flex items-center justify-center text-white active:scale-95 transition-transform"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={36} className="fill-current" /> : <Play size={36} className="fill-current ml-2" />}
          </button>

          <button className="w-16 h-16 rounded-full bg-slate-800/80 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-lg active:scale-95 transition-transform">
            <MapPin size={24} />
          </button>
        </div>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletion && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="absolute inset-0 z-50 bg-[#05070a]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 overflow-y-auto"
           >
              {/* Route Awakened Header Title */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-6"
              >
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs uppercase tracking-[0.25em] font-mono text-cyan-400 font-bold">ROUTE AWAKENED</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-[0.15em] drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2">
                  <Zap size={22} className="text-cyan-400 fill-cyan-400/20" />
                  路线已唤醒
                </h2>
              </motion.div>

              {/* Outer Ticket-shaped Card Container */}
              <motion.div 
                 initial={{ scale: 0.92, y: 15 }}
                 animate={{ scale: 1, y: 0 }}
                 className="w-full max-w-sm flex flex-col relative rounded-[28px] overflow-hidden shadow-[0_20px_50px_rgba(38,177,128,0.15)] border border-[#a3dfcb]/10 mb-8"
              >
                  {/* UPPER SECTION: Mint mint green card */}
                  <div className="bg-gradient-to-br from-[#d4f7ed] to-[#c2f4e6] p-5 pb-6 flex flex-col">
                     {/* User Profile Row */}
                     <div className="flex items-center gap-3 mb-5">
                       {/* Cat Avatar with yellow sunglasses */}
                       <div className="w-11 h-11 rounded-full bg-[#122e26] border border-[#a2dfcb] flex items-center justify-center text-3xl shadow-md select-none overflow-hidden relative">
                         <span className="text-2xl filter drop-shadow">🐈‍⬛</span>
                         <span className="absolute text-[8px] top-5 left-2 rotate-12 bg-black text-yellow-400 font-bold px-0.5 rounded leading-none border border-yellow-400 font-sans">🕶️</span>
                       </div>
                       
                       <div className="flex flex-col text-left">
                         <span className="text-sm font-bold text-[#103027] tracking-wide select-text">隔壁老大鱼</span>
                         <span className="text-[9px] text-[#2c6e5a] tracking-wider uppercase font-mono font-bold">ALPHA RUNNER</span>
                       </div>
                     </div>

                     {/* Three Stats Cards Grid */}
                     <div className="w-full grid grid-cols-3 gap-2.5 mb-5">
                       {/* Stat 1: Distance */}
                       <div className="bg-white/80 border border-[#b2e8da] rounded-2xl p-2.5 text-center shadow-sm flex flex-col justify-center">
                         <div className="text-2xl font-black font-mono text-[#0b3329]" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.7)' }}>
                           {distance.toFixed(2)}
                         </div>
                         <div className="text-[9.5px] text-[#206956] font-bold mt-1 tracking-tight">
                           实际里程/km
                         </div>
                       </div>
                       
                       {/* Stat 2: Duration */}
                       <div className="bg-white/80 border border-[#b2e8da] rounded-2xl p-2.5 text-center shadow-sm flex flex-col justify-center">
                         <div className="text-2xl font-black font-mono text-[#0b3329]" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.7)' }}>
                           {formatTime(time)}
                         </div>
                         <div className="text-[9.5px] text-[#206956] font-bold mt-1 tracking-tight">
                           路线时长
                         </div>
                       </div>
                       
                       {/* Stat 3: Calories */}
                       <div className="bg-white/80 border border-[#b2e8da] rounded-2xl p-2.5 text-center shadow-sm flex flex-col justify-center">
                         <div className="text-2xl font-black font-mono text-[#0b3329]" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.7)' }}>
                           {Math.floor(distance * 65)}
                         </div>
                         <div className="text-[9.5px] text-[#206956] font-bold mt-1 tracking-tight">
                           实际消耗/kcal
                         </div>
                       </div>
                     </div>

                     {/* Rewards Row */}
                     <div className="w-full flex items-center gap-2.5 bg-[#f4fcf9]/40 border border-[#b2e8da]/40 p-2 rounded-2xl backdrop-blur-sm shadow-sm">
                       <div className="bg-[#e4ffa1] text-[#2c3d00] font-extrabold text-[10px] tracking-wide px-2.5 py-1.5 rounded-xl uppercase transform -skew-x-6 shadow-sm border border-[#c5e66b] shrink-0 flex items-center gap-1">
                         <Award size={11} className="text-[#2c3d00] animate-pulse" />
                         <span>获得勋章</span>
                       </div>
                       
                       <div className="flex-1 flex items-center gap-1.5 justify-start overflow-x-auto hide-scrollbar py-0.5">
                         {MEDALS.map((medal, i) => (
                           <div 
                             key={medal.id} 
                             className="relative shrink-0" 
                             title={medal.name}
                           >
                             <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${medal.color} p-[1.5px] shadow-sm flex items-center justify-center animate-pulse`} style={{ animationDelay: `${i * 120}ms` }}>
                               <div className="w-full h-full rounded-full bg-slate-900/60 backdrop-blur-md flex items-center justify-center text-sm shadow-inner">
                                 {medal.text}
                               </div>
                             </div>
                             {i === 0 && (
                               <div className="absolute inset-0 rounded-full border border-yellow-300 animate-ping opacity-55 pointer-events-none" />
                             )}
                           </div>
                         ))}
                       </div>
                     </div>
                  </div>

                  {/* DASHED SEPARATOR & PHYSICAL TICKET NOTCH DESIGN */}
                  <div className="relative h-px bg-transparent">
                     {/* Concave Notches Masking behind screen backdrop */}
                     <div className="absolute left-[-12px] top-[-12px] w-6 h-6 rounded-full bg-[#05070a] z-20 shadow-inner" />
                     <div className="absolute right-[-12px] top-[-12px] w-6 h-6 rounded-full bg-[#05070a] z-20 shadow-inner" />
                     {/* Alignment dashed dividing line */}
                     <div className="absolute left-4 right-4 top-[-1px] border-t-2 border-dashed border-[#a1dfcc] z-10 opacity-70" />
                  </div>

                  {/* LOWER SECTION: White minty tea paper sheet overlay */}
                  <div className="bg-[#f2fbf7] p-6 pt-8 flex text-left relative">
                     {/* Text details fully take lower container width */}
                     <div className="w-full text-left">
                       <h3 className="text-sm font-black text-[#103027] mb-1 tracking-tight select-text">
                         {cityName}路线{routeIndex}：{routeTitle}
                       </h3>
                       <div className="text-[10px] text-[#427365] font-mono tracking-wider font-extrabold mb-3">
                         {todayDateStr}
                       </div>
                       
                       {/* Unique Dynamic Lore Custom Text (在参考图的基础上加一句剧情文案) */}
                       <div className="border-l-2 border-[#80d0b8] pl-3 py-1">
                         <p className="text-[11px] text-[#1e5445] leading-relaxed italic font-medium select-text break-all">
                           {getCityStoryText(cityName, routeIndex)}
                         </p>
                       </div>
                     </div>
                  </div>
              </motion.div>

              {/* Action Buttons Row */}
              <div className="w-full max-w-sm flex items-center gap-4 px-1">
                 {/* Left Button of Screenshot: Red font button (结束训练) */}
                 <button 
                   onClick={() => onComplete({ distance, duration: time, calories: Math.floor(distance * 65) })}
                   className="flex-1 py-3.5 px-6 rounded-2xl bg-[#cb2027] hover:bg-[#b0161c] text-white text-base font-extrabold tracking-wide transition-all shadow-[0_4px_15px_rgba(203,32,39,0.3)] active:scale-95"
                 >
                   结束训练
                 </button>
                 
                 {/* Right Button of Screenshot: Teal/Green button (继续下一路线) */}
                 <button 
                   onClick={() => onComplete({ distance, duration: time, calories: Math.floor(distance * 65) })}
                   className="flex-1 py-3.5 px-6 rounded-2xl bg-[#26b180] hover:bg-[#1f936a] text-white text-base font-extrabold tracking-wide transition-all shadow-[0_4px_15px_rgba(38,177,128,0.3)] active:scale-95"
                 >
                   继续下一路线
                 </button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
