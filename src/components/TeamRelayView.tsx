import WeekendRelayWheel from './WeekendRelayWheel';
import { weekendPeriod, periodOpen } from '../journey/weekendRelay';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Circle, CircleCheck, Coins, Footprints, MapPin, Plus, Route, Trees, UserRound, Users, X } from 'lucide-react';
import { getTeamCoinReward, TEAM_DUO_COINS, TEAM_SHARED_ROUTE_COINS } from '../journey/coinRewards';
import CityImage from './CityImage';
import Modal from './journey/Modal';
import { resolveLocalImage } from '../lib/localImages';
import { preferredRunSceneryFormat, runSceneryUrl } from '../lib/runScenery';
import type { RunSceneryFormat } from '../journey/sceneryFormat';
import { previewPuzzleHistory } from '../journey/puzzleHistory';
import { PUZZLE_LOBBY_LIMIT } from '../journey/puzzleDemo';
import { puzzleProgressFeedback } from '../journey/puzzleFeedback';
import { getSharedRouteTask, type SharedRouteTask } from '../journey/sharedRouteTask';
import { currentPuzzle, periodParticipation, openPuzzleTeams, ownPieces, puzzleComplete, duoGoalComplete, drawsLeft, puzzleAllPieces, canRunPuzzleRoute, canChooseSharedRoute, type RelayDraw, type PuzzleCity, type PuzzleRoute, type PuzzleState, type PuzzleTeam, type PuzzleMember, type PuzzlePiece } from '../journey/puzzleTeam';
import { isPuzzleScene } from '../journey/puzzleScenes';
import styles from './TeamRelayView.module.css';

interface Props {
  state: PuzzleState; cities: PuzzleCity[]; routes: PuzzleRoute[]; storageFailed: boolean;
  onBack: () => void; onCreate: (city: PuzzleCity, route?: PuzzleRoute) => boolean; onJoin: (teamId:string) => boolean; onDraw: (id: string) => RelayDraw | undefined; now: number;
  onRun: (route: PuzzleRoute) => void;
  onChooseSharedRoute: (route: PuzzleRoute, memberId?: string) => boolean;
  previewActions?: {
    now: () => number;
    join: () => boolean;
    finish: (teamId: string, piece: PuzzlePiece) => boolean;
    finishPartner: (route: PuzzleRoute) => void;
  };
  preview?: boolean;
  coinBalance: number;
  claimedCoinPeriods: ReadonlySet<string>;
  onClaimCoins: (team: PuzzleTeam) => Promise<number>;
  onGoCoins: () => void;
}
const time = (n: number) => new Date(n).toLocaleString('zh-CN', { timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false });
const trialDurationSeconds = 12;

export function RelayTrialRun({ route, onBack, onFinish }:{route:PuzzleRoute;onBack:()=>void;onFinish:()=>void}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoFormat = useRef<RunSceneryFormat>('mp4');
  const [duration,setDuration] = useState(0);
  const [seconds,setSeconds] = useState(0);
  const [playing,setPlaying] = useState(false);
  const [complete,setComplete] = useState(false);
  const [failed,setFailed] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      videoFormat.current = preferredRunSceneryFormat(video);
      video.src = runSceneryUrl(videoFormat.current);
    }
  }, []);
  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
      return;
    }
    if (failed) {
      setFailed(false);
      video.load();
    }
    void video.play().catch(() => setFailed(true));
  };

  return <main className={styles.page} id="main-content" aria-labelledby="relay-trial-title">
    <nav className={styles.nav} aria-label="体验跑导航">
      <button type="button" onClick={onBack} aria-label="返回小队"><ChevronLeft size={22}/></button>
      <h1 id="relay-trial-title">路线跑步</h1><span aria-hidden="true"/>
    </nav>
    <div className={styles.body}>
      <section className={styles.task} aria-label="当前路线">
        <header className={`${styles.taskHero} ${styles.trialHero}`}>
          <CityImage src={route.image} className={styles.taskPhoto} alt="" loading="eager"/>
          <video ref={videoRef} className={styles.trialVideo} data-loaded={duration>0&&!failed} autoPlay muted playsInline
            aria-label="体验跑视频" onLoadedMetadata={event=>setDuration(Math.min(trialDurationSeconds,event.currentTarget.duration))}
            onTimeUpdate={event=>{
              const video=event.currentTarget;
              setSeconds(Math.min(trialDurationSeconds,Math.floor(video.currentTime)));
              if(video.currentTime>=trialDurationSeconds){video.pause();setComplete(true);}
            }}
            onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}
            onEnded={()=>{setPlaying(false);setComplete(true);}}
            onError={event=>{
              setPlaying(false);
              if (videoFormat.current==='hls') {
                videoFormat.current='mp4';
                event.currentTarget.src=runSceneryUrl('mp4');
              } else setFailed(true);
            }}/>
          <div className={styles.taskHeading}><h2>{route.title}</h2><small>通用体验视频</small></div>
        </header>
        <div className={styles.taskContent}>
          <div className={styles.trialStats}>
            <div><small>路线里程</small><strong>{route.distanceKm.toFixed(2)} km</strong></div>
            <div><small>{complete?'体验用时':'剩余时间'}</small><strong>{duration ? `${Math.ceil(complete?duration:Math.max(0,duration-seconds))} 秒` : '—'}</strong></div>
          </div>
          <progress className={styles.trialProgress} aria-label="体验跑进度" max={duration||1} value={complete?duration:seconds}/>
          {failed&&<p className={styles.taskStatus} role="status">体验视频加载失败，请重试。</p>}
          {complete ? <button className={styles.primary} type="button" onClick={onFinish}>完成</button>
            : <button className={styles.primary} type="button" onClick={toggleVideo}>{failed?'重试播放':playing?'暂停跑步':seconds?'继续跑步':'播放视频'}</button>}
        </div>
      </section>
    </div>
  </main>;
}

function MemberAvatar({member,label=member?.name}:{member?:PuzzleMember;label?:string}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[member?.avatarUrl]);
  return <span className={styles.memberAvatar} aria-hidden="true">{member?.avatarUrl&&!failed?<img src={resolveLocalImage(member.avatarUrl)} alt="" onError={()=>setFailed(true)}/>:label?label.slice(0,1):<Users size={18}/>}</span>;
}

export function RelayHistoryView({teams,now,onBack,claimedCoinPeriods,onClaimCoins}:{teams:PuzzleTeam[];now:number;onBack:()=>void;claimedCoinPeriods?:ReadonlySet<string>;onClaimCoins?:Props['onClaimCoins']}) {
  const [pending,setPending]=useState<string|null>(null),[notice,setNotice]=useState('');
  const claimGuard=useRef(false);
  useEffect(()=>{if(notice){const timer=setTimeout(()=>setNotice(''),3000);return()=>clearTimeout(timer);}},[notice]);
  const claim=async(team:PuzzleTeam)=>{
    if(!onClaimCoins||claimGuard.current)return;
    claimGuard.current=true;setPending(team.id);
    try{const coins=await onClaimCoins(team);setNotice(coins?`领取成功，${coins} 金币已存入钱包`:'暂时无法领取，请稍后重试。');}
    catch{setNotice('暂时无法领取，请稍后重试。');}
    finally{claimGuard.current=false;setPending(null);}
  };
  const joinedAt=(t:PuzzleTeam)=>t.members.find(m=>m.id==='self')?.joinedAt??t.createdAt;
  const history=teams.filter(t=>t.members.some(m=>m.id==='self')).slice().sort((a,b)=>joinedAt(b)-joinedAt(a)||b.createdAt-a.createdAt);
  return <main className={styles.page} id="main-content" aria-labelledby="relay-history-title">
    <nav className={styles.nav} aria-label="活动记录导航"><button type="button" autoFocus onClick={onBack} aria-label="返回活动主页"><ChevronLeft size={22}/></button><h1 id="relay-history-title">活动记录</h1><span aria-hidden="true"/></nav>
    <div className={styles.body}>
      {history.length?<div className={styles.historyList}>{history.map(t=>{
        const complete=puzzleComplete(t)||duoGoalComplete(t),ended=now>=t.period.endsAt;
        const progress=`${t.pieces.length}/${t.mode==='duo'?2:3}`;
        const reward=getTeamCoinReward(t);
        const status=complete?'已完成':t.archived?'旧版记录':ended?'未完成 · '+progress:t.members.length<2?'待组队':'进行中 · '+progress;
        return <article className={styles.historyCard} key={t.id} aria-label={t.city.name+'活动记录'}>
          <div className={styles.historyRecordHeading}>
            <time className={styles.historyDate} dateTime={new Date(joinedAt(t)).toISOString()}>{time(joinedAt(t))}</time>
            <span className={styles.historyStatus} data-state={complete?'complete':t.archived?'archived':ended?'ended':t.members.length<2?'waiting':'active'}>{status}</span>
          </div>
          <CityImage src={t.sharedRoute?.image ?? t.city.image} alt="" className={styles.historyCityPhoto}/>
          <div className={styles.historyContent}>
            <div className={styles.historyCity}><h2>{t.city.name}</h2></div>
            <div className={styles.historyMembers} aria-label="小队成员">{Array.from({length:Math.max(2,t.members.length)},(_,i)=>{const member=t.members[i];return <div key={member?.id??'empty'}><MemberAvatar member={member}/><span><strong>{member?.name??'等待搭子'}</strong><small>{member?ownPieces(t,member.id).length+' 条':'未加入'}</small></span></div>;})}</div>
            {reward&&<div className={styles.historyCoins}><span><Coins size={14} aria-hidden="true"/>{t.mode==='duo'?'双倍奖励':'同路奖励'} +{reward.coins.toLocaleString('zh-CN')} 金币</span>{claimedCoinPeriods?.has(t.period.id)?<small><Check size={13} aria-hidden="true"/>已领取</small>:onClaimCoins&&<button type="button" disabled={!!pending} onClick={()=>void claim(t)}>{pending===t.id?'领取中…':'领取金币'}</button>}</div>}
          </div>
        </article>;
      })}</div>:<p className={styles.empty}>暂无活动记录</p>}
    </div><div className={styles.toast} role="status" aria-live="polite" data-visible={!!notice}>{notice}</div>
  </main>;
}

const taskButtons: Partial<Record<SharedRouteTask['action'], string>> = {
  create: '匹配搭子', choose: '确定共同路线', 'choose-scene-route': '选择路线开跑', run: '开始跑步',
};
const taskStatuses: Partial<Record<SharedRouteTask['action'], string>> = {
  'waiting-partner': '等待搭子完赛', closed: '本期未开放', unavailable: '暂无可用路线', participated: '本期已参与',
};
const sheetTitles={plaza:'加入小队',target:'更换挑战目标',rules:'活动规则',routes:'选择路线',shared:'选择共同路线',lottery:'幸运大转盘',draws:'待抽奖'};

function ChallengeTicket({goal,route,routeCount,joined,coins,claimed,onChange}:{
  goal?:PuzzleCity; route?:PuzzleRoute; routeCount:number; joined:boolean; coins:number; claimed:boolean; onChange?:()=>void;
}) {
  const scene=!!goal&&isPuzzleScene(goal.id);
  const GoalIcon=scene?Trees:MapPin;
  return <section className={styles.ticket} data-joined={joined} aria-labelledby="relay-goal-title">
    <div className={styles.ticketCover}>
      {goal&&<CityImage src={route?.image??goal.image} alt="" className={styles.ticketPhoto} loading="eager"/>}
      {onChange&&<button type="button" className={styles.ticketChange} onClick={onChange}>{scene?'换场景':'换路线'}<ChevronRight size={14} aria-hidden="true"/></button>}
      <div className={styles.ticketTitle}>
        {goal&&<span><GoalIcon size={14} aria-hidden="true"/>{scene?'同一场景':goal.name}</span>}
        <h2 id="relay-goal-title">{route?.title??goal?.name??'暂无可选目标'}</h2>
        {route&&<p>{route.distanceKm} km <span aria-hidden="true">·</span> 约 {route.minutes} 分钟</p>}
        {scene&&<p>各选一条路线 <span aria-hidden="true">·</span> 共 {routeCount} 条</p>}
      </div>
    </div>
    <div className={styles.ticketReward}>
      <span className={styles.rewardIcon}>{claimed?<Check size={21}/>:<Coins size={21}/>}</span>
      <div><strong>{claimed?'金币已到账':'双人完赛奖励'}</strong><span>{claimed?'已存入金币余额':'两人都完赛后领取'}</span></div>
      <p><strong>{coins.toLocaleString('zh-CN')}</strong><span>{claimed?'金币':'金币 / 人'}</span></p>
    </div>
  </section>;
}

function TeamCheckpoints({members,matching}:{members:SharedRouteTask['members'];matching:boolean}) {
  const completed=members.filter(item=>item.complete).length;
  return <section className={styles.checkpoints} aria-labelledby="relay-progress-title">
    <header><h2 id="relay-progress-title">完赛进度</h2><span><strong>{completed}</strong> / 2 人</span></header>
    <ul className={styles.runners} aria-label="小队成员">
      {members.map(({member,complete},index)=>{
        const name=index===0?'你':member?.name??'搭子';
        const status=complete?'已完赛':member?'待跑步':matching?'匹配中':'未加入';
        return <li className={styles.runner} key={index} data-complete={complete}>
          <span className={styles.runnerMarks}>
            {index===0&&!member?.avatarUrl?<span className={styles.memberAvatar} aria-hidden="true"><UserRound size={17}/></span>:<MemberAvatar member={member}/>}
            {complete?<Check size={18} aria-hidden="true"/>:member?<Footprints size={17} aria-hidden="true"/>:<Plus size={17} aria-hidden="true"/>}
          </span>
          <span className={styles.runnerName}>{name}</span><span className={styles.runnerStatus}>{status}</span>
        </li>;
      })}
    </ul>
  </section>;
}

function isRouteGoal(goal:PuzzleCity|PuzzleRoute):goal is PuzzleRoute {
  return 'routeId' in goal;
}

function TargetPicker({cities,routes,scene,selected,onSelect}:{cities:PuzzleCity[];routes:PuzzleRoute[];scene:boolean;selected?:PuzzleRoute|PuzzleCity;onSelect:(goal:PuzzleRoute|PuzzleCity)=>void}) {
  const options:(PuzzleRoute|PuzzleCity)[]=scene?cities:routes;
  return <div className={styles.targetList} role="group" aria-label={scene?'可选场景':'可选路线'}>
    {options.length===0&&<p className={styles.empty}>暂无可选目标</p>}
    {options.map(goal=>{
      const isRoute=isRouteGoal(goal);
      const active=selected?.id===goal.id&&(!isRoute||isRouteGoal(selected)&&selected.routeId===goal.routeId);
      return <button type="button" key={isRoute?`${goal.id}:${goal.routeId}`:goal.id} aria-pressed={!!active} onClick={()=>onSelect(goal)}>
        <CityImage src={goal.image} alt="" className={styles.targetPhoto}/>
        <span><strong>{isRoute?goal.title:goal.name}</strong><small>{isRoute?`${goal.name} · ${goal.distanceKm} km · ${goal.minutes} 分钟`:`${routes.filter(route=>route.id===goal.id).length} 条路线`}</small></span>
        {active?<CircleCheck size={21} aria-hidden="true"/>:<ChevronRight size={18} aria-hidden="true"/>}
      </button>;
    })}
  </div>;
}

function SharedRouteSelection({team,routes,selectedId,onSelect,onConfirm}:{team:PuzzleTeam;routes:PuzzleRoute[];selectedId:string;onSelect:(id:string)=>void;onConfirm:()=>void}) {
  const choices=routes.filter(route=>route.id===team.city.id).slice().sort((a,b)=>a.routeIndex-b.routeIndex);
  return <>
    <fieldset className={styles.routeChoices} role="radiogroup" aria-label="共同路线">{choices.map(route=><label key={route.routeId} data-selected={selectedId===route.routeId}><input type="radio" name="buddy-shared-route" value={route.routeId} checked={selectedId===route.routeId} onChange={()=>onSelect(route.routeId)}/><CityImage src={route.image} alt="" className={styles.routePhoto}/><span><strong>{route.title}</strong><small>{route.distanceKm} km · 约 {route.minutes} 分钟</small></span>{selectedId===route.routeId?<CircleCheck size={20} aria-hidden="true"/>:<Circle size={20} aria-hidden="true"/>}</label>)}</fieldset>
    <p className={styles.note}>有人完成路线后不可更换。</p><button type="button" className={styles.primary} disabled={!choices.some(route=>route.routeId===selectedId)} onClick={onConfirm}>确认共同路线</button></>;
}

function ActivityRules() {
  return <dl className={styles.rules}>
    <div><dt>组队</dt><dd>每周五至周日开放。每期可创建或加入一个两人小队。</dd></div>
    <div><dt>各自跑完</dt><dd>同一路线需跑完同一条视频。选同一场景时，两人可以跑该场景下的不同路线。满员即可出发，双方可以分开跑。</dd></div>
    <div><dt>领取金币</dt><dd>两人都完赛后，每人可领 {TEAM_DUO_COINS.toLocaleString('zh-CN')} 金币，每期一次。活动结束后仍可在活动记录领取。</dd></div>
  </dl>;
}

function LobbyTeam({team,eligible,canEnroll,periodActive,onJoin}:{team:PuzzleTeam;eligible:boolean;canEnroll:boolean;periodActive:boolean;onJoin:(id:string)=>void}) {
  return <button type="button" className={styles.lobbyTeam} disabled={!canEnroll||!eligible} onClick={()=>onJoin(team.id)} aria-label={'加入'+team.city.name+' · '+team.members[0].name+'的小队'} data-team-id={team.id}>
    <CityImage src={team.city.image} alt="" className={styles.lobbyCityPhoto}/>
    <span><strong>{team.city.name}</strong><span className={styles.lobbyHost}><MemberAvatar member={team.members[0]}/>{team.members[0].name}</span></span>
    <span className={styles.lobbyAction}>{!eligible?'未解锁':canEnroll?'加入':periodActive?'已参与':'未开放'}<ChevronRight size={14} aria-hidden="true"/></span>
  </button>;
}

export function RelayPlazaContent({teams,routes,canEnroll,periodActive,onJoin}:{teams:PuzzleTeam[];routes:PuzzleRoute[];canEnroll:boolean;periodActive:boolean;onJoin:(id:string)=>void}) {
  return teams.length?<div className={styles.lobbyList}>{teams.map(t=><Fragment key={t.id}><LobbyTeam team={t} eligible={routes.some(r=>r.id===t.city.id)} canEnroll={canEnroll} periodActive={periodActive} onJoin={onJoin}/></Fragment>)}</div>:<p className={styles.empty}>暂无可加入的小队</p>;
}

export function RelayJoinConfirmation({onCancel,onConfirm,team}:{onCancel:()=>void;onConfirm:()=>void;team?:PuzzleTeam}) {
  return <Modal labelId="relay-join-title" onClose={onCancel} backdropClassName={styles.createBackdrop} className={styles.joinDialog}>
    <h2 id="relay-join-title">{team?'加入'+team.city.name+'小队':'加入小队'}</h2>
    {team&&<div className={styles.joinTeam}><MemberAvatar member={team.members[0]}/><span><strong>{team.members[0].name}</strong>{team.sharedRoute && <small>{team.sharedRoute.title}</small>}</span></div>}
    <p>加入后，本期不可换队。</p>
    <div className={styles.joinActions}><button type="button" onClick={onCancel}>取消</button><button type="button" onClick={onConfirm}>加入小队</button></div>
  </Modal>;
}

export function RelayRoutesContent({team,routes,now,onRun,onLottery,memberId='self'}:{team:PuzzleTeam;routes:PuzzleRoute[];now:number;onRun:(route:PuzzleRoute)=>void;onLottery?:()=>void;memberId?:string}) {
  const ownRuns=puzzleAllPieces(team).filter(piece=>piece.memberId===memberId),complete=puzzleComplete(team),active=periodOpen(team.period,now),ready=team.members.length===2;
  const scene=team.mode==='duo'&&isPuzzleScene(team.city.id);
  const partner=team.members.find(member=>member.id!==memberId);
  const cityRoutes=routes.filter(r=>r.id===team.city.id).slice().sort((a,b)=>a.routeIndex-b.routeIndex);
  return <section aria-label={team.city.name+(scene?'场景路线':'城市路线')}>
      <div className={styles.routeHeading}><h3>{team.city.name}</h3><span>{scene?'任选一条':`接力 ${team.pieces.length}/3`}</span></div>
      <ul className={styles.routeList}>{cityRoutes.map(r=>{
        const done=ownRuns.some(p=>p.route.routeId===r.routeId),canRun=canRunPuzzleRoute(team,r,now,memberId);
        const partnerDone=team.pieces.some(p=>p.memberId!==memberId&&p.route.routeId===r.routeId);
        return <li className={styles.inlineRoute} key={r.routeId}>
          <CityImage src={r.image} alt="" className={styles.routePhoto}/>
          <div className={styles.routeCopy}><strong>{r.title}</strong><small>{r.distanceKm} km · {r.minutes} 分钟</small></div>
          {done?<span className={styles.routeDone}><Check size={14} aria-hidden="true"/>已完成</span>
            :canRun?<button type="button" onClick={()=>onRun(r)} aria-label={'开始路线：'+r.title}>{partnerDone&&!scene?'跟跑':'开始'}</button>
              :<span className={styles.routeUnavailable}>{partnerDone?`${partner?.name??'搭子'}已完成`:!active?'本期结束':!ready?'待组队':complete?'已完成':'已达上限'}</span>}
        </li>;
      })}</ul>
      {!cityRoutes.length&&<p className={styles.empty}>暂无可用路线</p>}
      {onLottery&&<button type="button" className={styles.actionRow} onClick={onLottery}><span>幸运大转盘</span><span>{complete?`${drawsLeft(team)} 次`:`${team.pieces.length}/3`}<ChevronRight size={16} aria-hidden="true"/></span></button>}
  </section>;
}

export default function TeamRelayView({state,cities,routes,storageFailed,onBack,onCreate,onJoin,onDraw,now,onRun,onChooseSharedRoute,previewActions,coinBalance,claimedCoinPeriods,onClaimCoins,onGoCoins,preview=false}:Props) {
  const period=weekendPeriod(now),periodActive=periodOpen(period,now);
  const participation=periodParticipation(state,period.id);
  const team=participation&&!participation.archived?participation:!periodActive?currentPuzzle(state):undefined;
  const myTeams=state.teams.filter(t=>t.members.some(m=>m.id==='self'));
  const canEnroll=periodActive&&!participation;
  const outstandingTeams=myTeams.filter(t=>t.id!==team?.id&&drawsLeft(t)>0).sort((a,b)=>b.period.startsAt-a.period.startsAt);
  const outstandingDraws=outstandingTeams.reduce((sum,t)=>sum+drawsLeft(t),0);
  const available=openPuzzleTeams(state,now).filter(t=>!preview||routes.some(r=>r.id===t.city.id)).slice(0,PUZZLE_LOBBY_LIMIT);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [trial,setTrial]=useState<{teamId:string;piece:PuzzlePiece}|null>(null);
  const claimed=!!team&&claimedCoinPeriods.has(team.period.id);
  const creatableCities=cities.filter(city=>routes.some(route=>route.id===city.id));
  const sceneChoices=creatableCities.filter(city=>isPuzzleScene(city.id));
  const routeChoices=routes.filter(route=>!isPuzzleScene(route.id));
  const [sceneSelected,setSceneMode]=useState(false);
  const sceneMode=sceneSelected||(!routeChoices.length&&sceneChoices.length>0);
  const [routeChoice,setRouteChoice]=useState<PuzzleRoute>();
  const [sceneChoice,setSceneChoice]=useState<PuzzleCity>();
  const selectedRoute=sceneMode?undefined:routeChoices.find(route=>route.id===routeChoice?.id&&route.routeId===routeChoice.routeId)??routeChoices[0];
  const selectedCity=sceneMode?sceneChoices.find(city=>city.id===sceneChoice?.id)??sceneChoices[0]:creatableCities.find(city=>city.id===selectedRoute?.id);
  const task=getSharedRouteTask(team,now,claimed,team?routes.some(route=>route.id===team.city.id&&(!team.sharedRoute||route.routeId===team.sharedRoute.routeId)):!!selectedCity,canEnroll);
  const [sheet,setSheet]=useState<'target'|'rules'|'routes'|'shared'|'lottery'|'plaza'|'join'|'draws'|null>(null);
  const [sharedChoice,setSharedChoice]=useState('');
  const [pendingJoinId,setPendingJoinId]=useState<string|null>(null),[joinOrigin,setJoinOrigin]=useState<'plaza'|null>(null);
  const [message,setMessage]=useState(''),[lotteryId,setLotteryId]=useState<string|null>(null);
  const [claimPending,setClaimPending]=useState(false);
  const claiming=useRef(false);
  const matching=!!previewActions&&team?.mode==='duo'&&task.action==='waiting-member';
  const ownRun=team?.pieces.find(piece=>piece.memberId==='self');
  const partnerRoute=ownRun&&team&&isPuzzleScene(team.city.id)
    ? routes.find(route=>route.id===team.city.id&&route.routeId!==ownRun.route.routeId)??ownRun.route
    : ownRun?.route;
  useEffect(()=>{
    if(!previewActions||team?.mode!=='duo')return;
    if(matching){
      const timer=window.setTimeout(previewActions.join,1400);
      return ()=>window.clearTimeout(timer);
    }
    if(task.action==='waiting-partner'&&partnerRoute){
      const timer=window.setTimeout(()=>previewActions.finishPartner(partnerRoute),5000);
      return ()=>window.clearTimeout(timer);
    }
  },[previewActions,team,matching,task.action,partnerRoute]);
  const claimCoins=async()=>{
    if(!team||claiming.current||task.action!=='claim')return;
    claiming.current=true;setClaimPending(true);
    try{
      const credited=await onClaimCoins(team);
      setMessage(credited?`领取成功，${credited.toLocaleString('zh-CN')} 金币已存入钱包`:'暂时无法领取，请稍后重试。');
    }catch{setMessage('暂时无法领取，请稍后重试。');}
    finally{claiming.current=false;setClaimPending(false);}
  };
  const pageRef=useRef<HTMLElement>(null);
  const previousTeam=useRef(team);
  useEffect(()=>{
    const feedback=team?.mode==='duo'?undefined:puzzleProgressFeedback(previousTeam.current,team);
    if(team&&team.id!==previousTeam.current?.id){
      pageRef.current?.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }
    previousTeam.current=team;
    if(feedback)setMessage(feedback);
  },[team]);
  const lotteryTeam=myTeams.find(t=>t.id===lotteryId)??team;
  const date=(n:number)=>new Date(n).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit'});
  useEffect(()=>{if(message){const timer=setTimeout(()=>setMessage(''),3600);return()=>clearTimeout(timer);}},[message]);
  const create=()=>{
    if(!selectedCity||!canEnroll)return;
    if(onCreate(selectedCity,selectedRoute))setSheet(null);
    else setMessage('本期已参与或活动尚未开放，请查看当前小队。');
  };
  const requestJoin=(id:string)=>{
    if(!canEnroll)return;
    const target=available.find(t=>t.id===id);
    if(!target||!routes.some(r=>r.id===target.city.id)){setMessage('暂无这个小队的可跑路线，请选择其他小队。');return;}
    setPendingJoinId(id);setJoinOrigin(sheet==='plaza'?'plaza':null);setSheet('join');
  };
  const cancelJoin=()=>{setPendingJoinId(null);setSheet(joinOrigin);};
  const confirmJoin=()=>{
    const target=available.find(t=>t.id===pendingJoinId);
    if(!canEnroll||!target||!routes.some(r=>r.id===target.city.id)){
      cancelJoin();setMessage('小队已满、已过期或你本期已参加，请查看最新列表。');return;
    }
    if(onJoin(target.id)){setPendingJoinId(null);setSheet(null);setMessage('组队成功。');}
    else {cancelJoin();setMessage('小队已满、已过期或你本期已参加，请查看最新列表。');}
  };
  const openLottery=(t:PuzzleTeam)=>{setLotteryId(t.id);setSheet('lottery');};
  const canEditSharedRoute = !!team && canChooseSharedRoute(team, now) && creatableCities.some(city => city.id === team.city.id);
  const openSharedRoutes=()=>{setSharedChoice(team?.sharedRoute?.routeId??'');setSheet('shared');};
  const confirmSharedRoute=()=>{
    if(!team)return;
    if(!canChooseSharedRoute(team,now)){setSheet(null);setMessage('有人已完成路线，共同目标已锁定。');return;}
    const selected=routes.find(route=>route.id===team.city.id&&route.routeId===sharedChoice);
    if(!selected)return;
    if(team.sharedRoute?.routeId===selected.routeId){setSheet(null);return;}
    if(onChooseSharedRoute(selected)){setSheet(null);setMessage(`共同路线已确定：${selected.title}`);}
    else setMessage('路线状态已更新，请重新选择。');
  };
  const completedRelay=!!team&&puzzleComplete(team);
  const currentDraws=team?drawsLeft(team):0;
  const pendingCoins=myTeams.filter(item=>item.id!==team?.id&&!claimedCoinPeriods.has(item.period.id))
    .reduce((sum,item)=>sum+(getTeamCoinReward(item)?.coins??0),0);
  const startRoute=(route:PuzzleRoute)=>{
    setSheet(null);
    if(!previewActions||team?.mode!=='duo'){
      onRun(route);
      return;
    }
    const startedAt=previewActions.now();
    if(!canRunPuzzleRoute(team,route,startedAt)){
      setMessage('路线状态已更新，请重新选择。');
      return;
    }
    setMessage('');
    setTrial({teamId:team.id,piece:{id:crypto.randomUUID(),memberId:'self',slot:team.pieces.length,
      startedAt,finishedAt:startedAt,route,distanceKm:route.distanceKm}});
  };
  const performTask=()=>{
    switch(task.action){
      case 'create':create();break;
      case 'choose':canEditSharedRoute?openSharedRoutes():setSheet('routes');break;
      case 'choose-scene-route':setSheet('routes');break;
      case 'run':if(task.route)startRoute(task.route);break;
      case 'claim':void claimCoins();break;
    }
  };
  if(trial&&previewActions)return <RelayTrialRun route={trial.piece.route} onBack={()=>setTrial(null)} onFinish={()=>{
    const accepted=previewActions.finish(trial.teamId,{...trial.piece,finishedAt:previewActions.now()});
    setTrial(null);
    if(!accepted)setMessage('本次完赛未记录，请查看小队进度。');
  }}/>;
  if(historyOpen)return <RelayHistoryView teams={preview?previewPuzzleHistory(myTeams,cities,routes,now):myTeams} now={now} claimedCoinPeriods={claimedCoinPeriods} onClaimCoins={onClaimCoins} onBack={()=>setHistoryOpen(false)}/>;
  const goal=team?.city??selectedCity;
  const goalRoute=team?task.route:selectedRoute;
  const canChooseWhileWaiting=task.action==='waiting-member'&&!task.route&&canEditSharedRoute&&!matching;
  const primaryLabel=task.action==='claim'?`领取 ${(team?.mode==='duo'?TEAM_DUO_COINS:TEAM_SHARED_ROUTE_COINS).toLocaleString('zh-CN')} 金币`
    : task.action==='create'&&!previewActions?'发起挑战'
    : canChooseWhileWaiting ? taskButtons.choose
    : taskButtons[task.action];
  const runPrimary=()=>{
    if(canChooseWhileWaiting)openSharedRoutes();
    else performTask();
  };
  const status=task.action==='waiting-member'?(matching?'正在匹配搭子…':'等待搭子加入'):taskStatuses[task.action];
  const canShowActions=!!team||outstandingDraws>0;
  return <main ref={pageRef} className={styles.page} id="main-content" aria-labelledby="relay-page-title" data-modal-open={!!sheet}>
    <nav className={styles.nav} aria-label="活动导航"><button type="button" onClick={onBack} aria-label="返回活动"><ChevronLeft size={22}/></button><h1 id="relay-page-title">环球搭子小队</h1><button type="button" onClick={()=>setHistoryOpen(true)}>活动记录</button></nav>
    <div className={styles.body}>
      <div className={styles.periodBar}><span>{date((team?.period??period).startsAt)} — {date((team?.period??period).endsAt-1)}</span><button type="button" onClick={()=>setSheet('rules')}>规则<ChevronRight size={13} aria-hidden="true"/></button></div>
      {!team&&<div className={styles.goalModes} role="group" aria-label="挑战类型">
        <button type="button" aria-pressed={!sceneMode} disabled={!routeChoices.length} onClick={()=>setSceneMode(false)}><Route size={17} aria-hidden="true"/>同一路线</button>
        <button type="button" aria-pressed={sceneMode} disabled={!sceneChoices.length} onClick={()=>setSceneMode(true)}><Trees size={17} aria-hidden="true"/>同一场景</button>
      </div>}
      <ChallengeTicket goal={goal} route={goalRoute} routeCount={routes.filter(route=>route.id===goal?.id).length} joined={!!team}
        coins={team&&team.mode!=='duo'?TEAM_SHARED_ROUTE_COINS:TEAM_DUO_COINS} claimed={task.action==='claimed'}
        onChange={!team&&selectedCity?()=>setSheet('target'):canEditSharedRoute&&task.route?openSharedRoutes:undefined}/>
      {team&&<TeamCheckpoints members={task.members} matching={matching}/>}
      <div className={styles.challengeActions} data-state={task.action} aria-busy={claimPending||undefined}>
        {status&&<p className={styles.taskStatus} role="status">{status}</p>}
        {primaryLabel&&<button type="button" className={styles.primary} disabled={claimPending} onClick={runPrimary}>
          {task.action==='claim'&&<Coins size={19} aria-hidden="true"/>}{claimPending?'领取中…':primaryLabel}
          {task.action!=='claim'&&<ArrowRight size={17} aria-hidden="true"/>}
        </button>}
        {!team&&canEnroll&&<button type="button" className={styles.joinLink} onClick={()=>setSheet('plaza')}><Users size={17} aria-hidden="true"/>加入小队<ChevronRight size={15} aria-hidden="true"/></button>}
      </div>
      {pendingCoins>0&&<button type="button" className={styles.pendingNotice} onClick={()=>setHistoryOpen(true)}><Coins size={17} aria-hidden="true"/><span>往期还有 <strong>{pendingCoins.toLocaleString('zh-CN')} 金币</strong> 待领取</span><ChevronRight size={16} aria-hidden="true"/></button>}
      {canShowActions&&<section className={styles.actions} aria-label="小队与钱包">
        {team && team.mode!=='duo' && <button type="button" className={styles.actionRow} onClick={()=>completedRelay ? openLottery(team) : setSheet('routes')}>
          <span>{completedRelay ? currentDraws > 0 ? '去抽奖' : '查看抽奖记录' : '接力路线'}</span>
          <span>{completedRelay ? `剩余 ${currentDraws} 次` : `${team.pieces.length}/3 条`}<ChevronRight size={16} aria-hidden="true"/></span>
        </button>}
        {outstandingDraws>0&&<button type="button" className={styles.actionRow} onClick={()=>outstandingTeams.length===1?openLottery(outstandingTeams[0]):setSheet('draws')}><span>待抽奖</span><span>{outstandingDraws} 次<ChevronRight size={16} aria-hidden="true"/></span></button>}
        {!!team&&<button type="button" className={`${styles.actionRow} ${styles.balanceRow}`} onClick={onGoCoins} aria-label="前往福利页查看金币钱包"><span><Coins size={17} aria-hidden="true"/>我的金币</span><span>{coinBalance.toLocaleString('zh-CN')}<ChevronRight size={16} aria-hidden="true"/></span></button>}
      </section>}
      {storageFailed&&<p role="alert" className={styles.error}>本次进度暂未保存，请保持页面打开。</p>}
    </div>
    {!sheet&&<div className={styles.toast} role="status" aria-live="polite" aria-atomic="true" data-visible={!!message}>{message}</div>}
    {sheet==='join'?<RelayJoinConfirmation team={state.teams.find(t=>t.id===pendingJoinId)} onCancel={cancelJoin} onConfirm={confirmJoin}/>:sheet&&<Modal labelId="relay-sheet-title" onClose={()=>setSheet(null)} className={styles.sheet}>
      <div className={styles.sheetHeading}><h2 id="relay-sheet-title">{sheetTitles[sheet]}</h2><button type="button" onClick={()=>setSheet(null)} aria-label="关闭"><X size={20}/></button></div>
      {sheet==='target'?<TargetPicker cities={sceneChoices} routes={sceneMode?routes:routeChoices} scene={sceneMode} selected={selectedRoute??selectedCity} onSelect={option=>{
        if(isRouteGoal(option))setRouteChoice(option);
        else setSceneChoice(option);
        setSheet(null);
      }}/>
      :sheet==='plaza'?<RelayPlazaContent teams={available} routes={routes} canEnroll={canEnroll} periodActive={periodActive} onJoin={requestJoin}/>
      :sheet==='draws'?<div className={styles.pendingList}>{outstandingTeams.map(t=><button type="button" key={t.id} onClick={()=>openLottery(t)}><span><strong>{t.city.name}</strong><small>{date(t.period.startsAt)}—{date(t.period.endsAt-1)}</small></span><span>{drawsLeft(t)} 次<ChevronRight size={16} aria-hidden="true"/></span></button>)}</div>
      :sheet==='lottery'&&lotteryTeam?<WeekendRelayWheel team={lotteryTeam} onDraw={onDraw} preview={preview}/>
      :sheet==='routes'&&team?<RelayRoutesContent team={team} routes={routes} now={now} onLottery={team.mode==='duo'?undefined:()=>openLottery(team)} onRun={startRoute}/>
      :sheet==='shared'&&team?<SharedRouteSelection team={team} routes={routes} selectedId={sharedChoice} onSelect={setSharedChoice} onConfirm={confirmSharedRoute}/>
      :sheet==='rules'?<ActivityRules/>:null}
      <div className={styles.toast} role="status" aria-live="polite" aria-atomic="true" data-visible={!!message}>{message}</div>
    </Modal>}
  </main>;
}
