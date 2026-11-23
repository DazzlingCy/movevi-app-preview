import WeekendRelayWheel from './WeekendRelayWheel';
import { weekendPeriod, periodOpen } from '../journey/weekendRelay';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Circle, CircleCheck, Coins, Users, X } from 'lucide-react';
import { TEAM_SHARED_ROUTE_COINS } from '../journey/coinRewards';
import CityImage from './CityImage';
import Modal from './journey/Modal';
import { resolveLocalImage } from '../lib/localImages';
import { previewPuzzleHistory } from '../journey/puzzleHistory';
import { PUZZLE_LOBBY_LIMIT } from '../journey/puzzleDemo';
import { puzzleProgressFeedback } from '../journey/puzzleFeedback';
import { getSharedRouteTask, type SharedRouteTask } from '../journey/sharedRouteTask';
import { currentPuzzle, periodParticipation, openPuzzleTeams, ownPieces, puzzleComplete, drawsLeft, puzzleAllPieces, sharedPuzzleRoute, canRunPuzzleRoute, canChooseSharedRoute, type RelayDraw, type PuzzleCity, type PuzzleRoute, type PuzzleState, type PuzzleTeam, type PuzzleMember } from '../journey/puzzleTeam';
import styles from './TeamRelayView.module.css';

interface Props {
  state: PuzzleState; cities: PuzzleCity[]; routes: PuzzleRoute[]; storageFailed: boolean;
  onBack: () => void; onCreate: (city: PuzzleCity) => boolean; onJoin: (teamId:string) => boolean; onDraw: (id: string) => RelayDraw | undefined; now: number;
  onRun: (route: PuzzleRoute) => void;
  onChooseSharedRoute: (route: PuzzleRoute) => boolean;
  onSimulatePartner?: (route: PuzzleRoute) => void;
  onSimulateJoin?: () => void;
  preview?: boolean;
  coinBalance: number;
  claimedCoinPeriods: ReadonlySet<string>;
  onClaimCoins: (team: PuzzleTeam) => Promise<number>;
  onGoCoins: () => void;
}
const time = (n: number) => new Date(n).toLocaleString('zh-CN', { timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false });

function MemberAvatar({member}:{member?:PuzzleMember}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[member?.avatarUrl]);
  return <span className={styles.memberAvatar} aria-hidden="true">{member?.avatarUrl&&!failed?<img src={resolveLocalImage(member.avatarUrl)} alt="" onError={()=>setFailed(true)}/>:member?member.name.slice(0,1):<Users size={18}/>}</span>;
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
        const complete=puzzleComplete(t),ended=now>=t.period.endsAt;
        const status=complete?'已完成':t.archived?'旧版记录':ended?'未完成 · '+t.pieces.length+'/3':t.members.length<2?'待组队':'进行中 · '+t.pieces.length+'/3';
        return <article className={styles.historyCard} key={t.id} aria-label={t.city.name+'活动记录'}>
          <div className={styles.historyRecordHeading}>
            <time className={styles.historyDate} dateTime={new Date(joinedAt(t)).toISOString()}>{time(joinedAt(t))}</time>
            <span className={styles.historyStatus} data-state={complete?'complete':t.archived?'archived':ended?'ended':t.members.length<2?'waiting':'active'}>{status}</span>
          </div>
          <CityImage src={t.city.image} alt="" className={styles.historyCityPhoto}/>
          <div className={styles.historyContent}>
            <div className={styles.historyCity}><h2>{t.city.name}</h2></div>
            <div className={styles.historyMembers} aria-label="小队成员">{Array.from({length:Math.max(2,t.members.length)},(_,i)=>{const member=t.members[i];return <div key={member?.id??'empty'}><MemberAvatar member={member}/><span><strong>{member?.name??'等待搭子'}</strong><small>{member?ownPieces(t,member.id).length+' 条':'未加入'}</small></span></div>;})}</div>
            {sharedPuzzleRoute(t)&&<div className={styles.historyCoins}><span><Coins size={14} aria-hidden="true"/>同路奖励 +{TEAM_SHARED_ROUTE_COINS} 金币</span>{claimedCoinPeriods?.has(t.period.id)?<small><Check size={13} aria-hidden="true"/>已领取</small>:onClaimCoins&&<button type="button" disabled={!!pending} onClick={()=>void claim(t)}>{pending===t.id?'领取中…':'领取金币'}</button>}</div>}
          </div>
        </article>;
      })}</div>:<p className={styles.empty}>暂无活动记录</p>}
    </div><div className={styles.toast} role="status" aria-live="polite" data-visible={!!notice}>{notice}</div>
  </main>;
}

const taskButtons: Partial<Record<SharedRouteTask['action'], string>> = {
  create: '创建小队', choose: '选择共同路线', run: '开始跑步', claim: '领取金币',
};
const taskStatuses: Partial<Record<SharedRouteTask['action'], string>> = {
  'waiting-partner': '等待搭子完成', closed: '本期已结束', unavailable: '暂无可用路线', participated: '本期已参与',
};
const sheetTitles={plaza:'加入小队',cities:'选择城市',rules:'活动规则',routes:'接力路线',shared:'选择共同路线',lottery:'幸运大转盘',draws:'待抽奖'};

function SharedRouteReward({task,city,pending,onAction,onChangeRoute}:{task:SharedRouteTask;city?:PuzzleCity;pending:boolean;onAction:()=>void;onChangeRoute?:()=>void}) {
  const {action, route, members} = task;
  const preselect = action === 'waiting-member' && !route && !!onChangeRoute;
  const button = preselect ? taskButtons.choose : taskButtons[action];
  const status = action === 'closed' && !city ? '周五开放'
    : action === 'waiting-partner' && members[0]?.complete ? undefined : taskStatuses[action];
  const claimed = action === 'claimed';
  return <section className={styles.task} data-state={task.action} aria-labelledby="shared-route-reward-title" aria-busy={pending||undefined}>
    <header className={styles.taskHeading}>
      <h2 id="shared-route-reward-title">完成同一路线</h2>
      <span className={styles.taskReward} aria-live="polite">{claimed ? '已领取 ' : '每人 '}<strong>{TEAM_SHARED_ROUTE_COINS}</strong> 金币</span>
    </header>
    {city && <div className={styles.taskTeam}>
      <h3>{city.name}小队</h3>
      <ul className={styles.taskMembers} aria-label="小队成员">
        {members.map(({member,complete},index)=><li key={member?.id??index} data-complete={complete}>
          <MemberAvatar member={member}/>
          <div><strong>{member?.name ?? '搭子待加入'}</strong>{member && route && members[1]?.member && <small>{complete ? '已完成' : '待完成'}</small>}</div>
          {complete && <Check size={16} aria-hidden="true"/>}
        </li>)}
      </ul>
      {route && <div className={styles.taskRoute} role="group" aria-label="共同路线">
        <span>{route.title}</span>
        {onChangeRoute && <button type="button" onClick={onChangeRoute} aria-label="更换共同路线">更换</button>}
      </div>}
    </div>}
    {status && <p className={styles.taskStatus} role="status">{status}</p>}
    {button && <button type="button" className={styles.primary} disabled={pending} onClick={preselect ? onChangeRoute : onAction}
      aria-label={action==='run' && route ? `开始跑步：${route.title}` : undefined}>
      {pending ? '领取中…' : button}
    </button>}
  </section>;
}

function SharedRouteSelection({team,routes,selectedId,onSelect,onConfirm}:{team:PuzzleTeam;routes:PuzzleRoute[];selectedId:string;onSelect:(id:string)=>void;onConfirm:()=>void}) {
  const choices=routes.filter(route=>route.id===team.city.id).slice().sort((a,b)=>a.routeIndex-b.routeIndex);
  return <>
    <fieldset className={styles.routeChoices} role="radiogroup" aria-label="共同路线">{choices.map(route=><label key={route.routeId} data-selected={selectedId===route.routeId}><input type="radio" name="buddy-shared-route" value={route.routeId} checked={selectedId===route.routeId} onChange={()=>onSelect(route.routeId)}/><CityImage src={route.image} alt="" className={styles.routePhoto}/><span><strong>{route.title}</strong><small>{route.distanceKm} km · 约 {route.minutes} 分钟</small></span>{selectedId===route.routeId?<CircleCheck size={20} aria-hidden="true"/>:<Circle size={20} aria-hidden="true"/>}</label>)}</fieldset>
    <p className={styles.note}>有人完成路线后不可更换。</p><button type="button" className={styles.primary} disabled={!choices.some(route=>route.routeId===selectedId)} onClick={onConfirm}>确认共同路线</button></>;
}

function ActivityRules() {
  return <dl className={styles.rules}>
    <div><dt>活动时间</dt><dd>每周五 00:00 至周日 24:00，北京时间。</dd></div>
    <div><dt>组队</dt><dd>创建或加入两人小队，每期一次。满员后出发，不必同时在线。本期内不可退出或换队。</dd></div>
    <div><dt>同路金币</dt><dd>满员后，两人在本期内各自完整完成同一条城市路线，每人可领取 {TEAM_SHARED_ROUTE_COINS} 金币，每期一次，不占日常运动奖励额度。</dd></div>
    <div><dt>共同目标</dt><dd>先选择双方要完成的共同路线。无人完成路线前可更换，有人完成后锁定；后续接力路线不会改变共同目标。</dd></div>
    <div><dt>接力抽奖</dt><dd>两人按 2＋1 完成三条不同路线后，分别获得两次、一次抽奖机会。同路补跑不占接力名额、不增加抽奖次数。</dd></div>
    <div><dt>奖励保留</dt><dd>金币计入福利页钱包，可用于金币抽奖或手动兑换现金。活动结束后，已达成的金币奖励与未用抽奖机会继续保留，未完成的路线不再计入本期。</dd></div>
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

export function RelayRoutesContent({team,routes,now,onRun,onLottery}:{team:PuzzleTeam;routes:PuzzleRoute[];now:number;onRun:(route:PuzzleRoute)=>void;onLottery?:()=>void}) {
  const ownRuns=puzzleAllPieces(team).filter(piece=>piece.memberId==='self'),complete=puzzleComplete(team),active=periodOpen(team.period,now),ready=team.members.length===2;
  const partner=team.members.find(member=>member.id!=='self');
  const cityRoutes=routes.filter(r=>r.id===team.city.id).slice().sort((a,b)=>a.routeIndex-b.routeIndex);
  return <section aria-label={team.city.name+'城市路线'}>
      <div className={styles.routeHeading}><h3>{team.city.name}</h3><span>接力 {team.pieces.length}/3</span></div>
      <ul className={styles.routeList}>{cityRoutes.map(r=>{
        const done=ownRuns.some(p=>p.route.routeId===r.routeId),canRun=canRunPuzzleRoute(team,r,now);
        const partnerDone=team.pieces.some(p=>p.memberId!=='self'&&p.route.routeId===r.routeId);
        return <li className={styles.inlineRoute} key={r.routeId}>
          <CityImage src={r.image} alt="" className={styles.routePhoto}/>
          <div className={styles.routeCopy}><strong>{r.title}</strong><small>{r.distanceKm} km · {r.minutes} 分钟</small></div>
          {done?<span className={styles.routeDone}><Check size={14} aria-hidden="true"/>已完成</span>
            :canRun?<button type="button" onClick={()=>onRun(r)} aria-label={'开始路线：'+r.title}>{partnerDone?'一起跑':'开始'}</button>
              :<span className={styles.routeUnavailable}>{partnerDone?`${partner?.name??'搭子'}已完成`:!active?'本期结束':!ready?'待组队':complete?'已完成':'已达上限'}</span>}
        </li>;
      })}</ul>
      {!cityRoutes.length&&<p className={styles.empty}>暂无可用路线</p>}
      {onLottery&&<button type="button" className={styles.actionRow} onClick={onLottery}><span>幸运大转盘</span><span>{complete?`${drawsLeft(team)} 次`:`${team.pieces.length}/3`}<ChevronRight size={16} aria-hidden="true"/></span></button>}
  </section>;
}

export default function TeamRelayView({state,cities,routes,storageFailed,onBack,onCreate,onJoin,onDraw,now,onRun,onChooseSharedRoute,onSimulatePartner,onSimulateJoin,coinBalance,claimedCoinPeriods,onClaimCoins,onGoCoins,preview=false}:Props) {
  const period=weekendPeriod(now),periodActive=periodOpen(period,now);
  const participation=periodParticipation(state,period.id);
  const team=participation&&!participation.archived?participation:!periodActive?currentPuzzle(state):undefined;
  const myTeams=state.teams.filter(t=>t.members.some(m=>m.id==='self'));
  const ready=!!team&&team.members.length===2;
  const ended=!!team&&now>=team.period.endsAt,canEnroll=periodActive&&!participation;
  const outstandingTeams=myTeams.filter(t=>t.id!==team?.id&&drawsLeft(t)>0).sort((a,b)=>b.period.startsAt-a.period.startsAt);
  const outstandingDraws=outstandingTeams.reduce((sum,t)=>sum+drawsLeft(t),0);
  const canSimulateJoin=preview&&!!onSimulateJoin&&!!team&&!ready&&!ended&&!team.archived&&periodOpen(team.period,now);
  const available=openPuzzleTeams(state,now).filter(t=>!preview||routes.some(r=>r.id===t.city.id)).slice(0,PUZZLE_LOBBY_LIMIT);
  const [historyOpen,setHistoryOpen]=useState(false);
  const creatableCities=cities.filter(city=>routes.some(r=>r.id===city.id));
  const task=getSharedRouteTask(team,now,!!team&&claimedCoinPeriods.has(team.period.id),team?routes.some(route=>route.id===team.city.id&&(!team.sharedRoute||route.routeId===team.sharedRoute.routeId)):creatableCities.length>0,canEnroll);
  const [createCityId,setCreateCityId]=useState('');
  const selectedCity=creatableCities.find(city=>city.id===createCityId);
  const [sheet,setSheet]=useState<'cities'|'rules'|'routes'|'shared'|'lottery'|'plaza'|'join'|'draws'|null>(null);
  const [sharedChoice,setSharedChoice]=useState('');
  const [pendingJoinId,setPendingJoinId]=useState<string|null>(null),[joinOrigin,setJoinOrigin]=useState<'plaza'|null>(null);
  const [message,setMessage]=useState(''),[lotteryId,setLotteryId]=useState<string|null>(null);
  const [claimPending,setClaimPending]=useState(false);
  const claiming=useRef(false);
  const claimCoins=async()=>{
    if(!team||claiming.current||claimedCoinPeriods.has(team.period.id)||!sharedPuzzleRoute(team))return;
    claiming.current=true;setClaimPending(true);
    try{
      const credited=await onClaimCoins(team);
      setMessage(credited?`领取成功，${credited} 金币已存入钱包`:'暂时无法领取，请稍后重试。');
    }catch{setMessage('暂时无法领取，请稍后重试。');}
    finally{claiming.current=false;setClaimPending(false);}
  };
  const pageRef=useRef<HTMLElement>(null);
  const previousTeam=useRef(team);
  useEffect(()=>{
    const feedback=puzzleProgressFeedback(previousTeam.current,team);
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
    if(onCreate(selectedCity)){setSheet(null);setMessage(selectedCity.name+'小队创建成功，等待搭子加入。');}else setMessage('本期已参与或活动尚未开放，请查看当前小队。');
  };
  const openCreate=()=>{setCreateCityId('');setSheet('cities');};
  const requestJoin=(id:string)=>{
    if(!canEnroll)return;
    const target=available.find(t=>t.id===id);
    if(!target||!routes.some(r=>r.id===target.city.id)){setMessage('你还没有该城市的可跑路线，请选择其他小队。');return;}
    setPendingJoinId(id);setJoinOrigin(sheet==='plaza'?'plaza':null);setSheet('join');
  };
  const cancelJoin=()=>{setPendingJoinId(null);setSheet(joinOrigin);};
  const confirmJoin=()=>{
    const target=available.find(t=>t.id===pendingJoinId);
    if(!canEnroll||!target||!routes.some(r=>r.id===target.city.id)){
      cancelJoin();setMessage('小队已满、已过期或你本期已参加，请查看最新列表。');return;
    }
    if(onJoin(target.id)){setPendingJoinId(null);setSheet(null);setMessage('两人组队成功，现在可以开始路线。');}
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
  const pendingCoinPeriods=new Set(myTeams.filter(item=>item.id!==team?.id&&sharedPuzzleRoute(item)&&!claimedCoinPeriods.has(item.period.id)).map(item=>item.period.id));
  const performTask=()=>{
    switch(task.action){
      case 'create':openCreate();break;
      case 'choose':canEditSharedRoute?openSharedRoutes():setSheet('routes');break;
      case 'run':if(task.route)onRun(task.route);break;
      case 'claim':void claimCoins();break;
    }
  };
  const partner=team?.members.find(member=>member.id!=='self');
  const demoRoutes=preview&&team&&partner&&onSimulatePartner?routes.filter(route=>canRunPuzzleRoute(team,route,now,partner.id)
    &&(!ownPieces(team,partner.id).length||team.pieces.some(piece=>piece.memberId!==partner.id&&piece.route.id===route.id&&piece.route.routeId===route.routeId))):[];
  if(historyOpen)return <RelayHistoryView teams={preview?previewPuzzleHistory(myTeams,cities,routes,now):myTeams} now={now} claimedCoinPeriods={claimedCoinPeriods} onClaimCoins={onClaimCoins} onBack={()=>setHistoryOpen(false)}/>;
  return <main ref={pageRef} className={styles.page} id="main-content" aria-labelledby="relay-page-title" data-modal-open={!!sheet}>
    <nav className={styles.nav} aria-label="活动导航"><button type="button" onClick={onBack} aria-label="返回活动"><ChevronLeft size={22}/></button><h1 id="relay-page-title">环球搭子小队</h1><button type="button" onClick={()=>setHistoryOpen(true)}>活动记录</button></nav>
    <div className={styles.body}>
      <div className={styles.periodBar}><span>{date((team?.period??period).startsAt)} — {date((team?.period??period).endsAt-1)}</span><button type="button" onClick={()=>setSheet('rules')}>活动规则<ChevronRight size={12} aria-hidden="true"/></button></div>
      <SharedRouteReward task={task} city={team?.city} pending={claimPending} onAction={performTask}
        onChangeRoute={canEditSharedRoute && task.action !== 'choose' ? openSharedRoutes : undefined}/>
      {!team&&!participation&&<section className={styles.plaza} aria-labelledby="relay-plaza-title">
        <header className={styles.sectionHeading}><h2 id="relay-plaza-title">加入小队</h2><button type="button" onClick={()=>setSheet('plaza')}>查看全部<ChevronRight size={14} aria-hidden="true"/></button></header>
        <RelayPlazaContent teams={available.slice(0,3)} routes={routes} canEnroll={canEnroll} periodActive={periodActive} onJoin={requestJoin}/>
      </section>}
      {pendingCoinPeriods.size>0&&<button type="button" className={styles.pendingNotice} onClick={()=>setHistoryOpen(true)}><Coins size={17} aria-hidden="true"/><span>往期还有 <strong>{pendingCoinPeriods.size*TEAM_SHARED_ROUTE_COINS} 金币</strong> 待领取</span><ChevronRight size={16} aria-hidden="true"/></button>}
      <section className={styles.actions} aria-label="小队功能">
        {team && <button type="button" className={styles.actionRow} onClick={()=>completedRelay ? openLottery(team) : setSheet('routes')}>
          <span>{completedRelay ? currentDraws > 0 ? '去抽奖' : '查看抽奖记录' : '接力路线'}</span>
          <span>{completedRelay ? `剩余 ${currentDraws} 次` : `${team.pieces.length}/3 条`}<ChevronRight size={16} aria-hidden="true"/></span>
        </button>}
        {outstandingDraws>0&&<button type="button" className={styles.actionRow} onClick={()=>outstandingTeams.length===1?openLottery(outstandingTeams[0]):setSheet('draws')}><span>待抽奖</span><span>{outstandingDraws} 次<ChevronRight size={16} aria-hidden="true"/></span></button>}
        <button type="button" className={`${styles.actionRow} ${styles.balanceRow}`} onClick={onGoCoins} aria-label="前往福利页查看金币钱包"><span><Coins size={17} aria-hidden="true"/>我的金币</span><span>{coinBalance.toLocaleString('zh-CN')}<ChevronRight size={16} aria-hidden="true"/></span></button>
        {!!participation&&<button type="button" className={styles.actionRow} onClick={()=>setSheet('plaza')}><span>搭子广场</span><ChevronRight size={16} aria-hidden="true"/></button>}
      </section>
      {storageFailed&&<p role="alert" className={styles.error}>本次进度暂未保存，请保持页面打开。</p>}
    </div>
    {!sheet&&<div className={styles.toast} role="status" aria-live="polite" aria-atomic="true" data-visible={!!message}>{message}</div>}
    {sheet==='join'?<RelayJoinConfirmation team={state.teams.find(t=>t.id===pendingJoinId)} onCancel={cancelJoin} onConfirm={confirmJoin}/>:sheet&&<Modal labelId="relay-sheet-title" onClose={()=>setSheet(null)} backdropClassName={sheet==='cities'?styles.createBackdrop:undefined} className={sheet==='cities'?styles.createDialog:styles.sheet}>
      <div className={styles.sheetHeading}><h2 id="relay-sheet-title">{sheetTitles[sheet]}</h2><button type="button" onClick={()=>setSheet(null)} aria-label="关闭"><X size={20}/></button></div>
      {sheet==='cities'?<><div className={styles.choices} role="group" aria-label="可选城市">{creatableCities.map(city=><button type="button" key={city.id} aria-pressed={createCityId===city.id} className={createCityId===city.id?styles.citySelected:undefined} onClick={()=>setCreateCityId(city.id)}><CityImage src={city.image} alt="" className={styles.choicePhoto}/><span><strong>{city.name}</strong><small>{routes.filter(r=>r.id===city.id).length} 条可跑路线</small></span>{createCityId===city.id&&<Check size={18} aria-hidden="true"/>}</button>)}</div>{!creatableCities.length&&<p className={styles.empty}>暂无可选城市</p>}<p className={styles.note}>本期不可更换城市或小队。</p><button type="button" className={styles.primary} disabled={!selectedCity||!canEnroll} onClick={create}>{selectedCity?`创建${selectedCity.name}小队`:'请选择城市'}</button></>
      :sheet==='plaza'?<RelayPlazaContent teams={available} routes={routes} canEnroll={canEnroll} periodActive={periodActive} onJoin={requestJoin}/>
      :sheet==='draws'?<div className={styles.pendingList}>{outstandingTeams.map(t=><button type="button" key={t.id} onClick={()=>openLottery(t)}><span><strong>{t.city.name}</strong><small>{date(t.period.startsAt)}—{date(t.period.endsAt-1)}</small></span><span>{drawsLeft(t)} 次<ChevronRight size={16} aria-hidden="true"/></span></button>)}</div>
      :sheet==='lottery'&&lotteryTeam?<WeekendRelayWheel team={lotteryTeam} onDraw={onDraw} preview={preview}/>
      :sheet==='routes'&&team?<RelayRoutesContent team={team} routes={routes} now={now} onLottery={()=>openLottery(team)} onRun={route=>{setSheet(null);onRun(route);}}/>
      :sheet==='shared'&&team?<SharedRouteSelection team={team} routes={routes} selectedId={sharedChoice} onSelect={setSharedChoice} onConfirm={confirmSharedRoute}/>
      :sheet==='rules'?<><ActivityRules/>{(canSimulateJoin||demoRoutes.length>0)&&<details className={styles.previewControls}><summary>演示操作</summary>{canSimulateJoin&&<button type="button" aria-label="模拟搭子加入" onClick={()=>{onSimulateJoin?.();setSheet(null);}}>搭子加入</button>}{demoRoutes.map(route=><button type="button" key={route.routeId} aria-label={'模拟好友完成：'+route.title} onClick={()=>{onSimulatePartner?.(route);setSheet(null);}}>搭子完成：{route.title}</button>)}</details>}</>:null}
      <div className={styles.toast} role="status" aria-live="polite" aria-atomic="true" data-visible={!!message}>{message}</div>
    </Modal>}
  </main>;
}
