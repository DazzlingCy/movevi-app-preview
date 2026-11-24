import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Coins, Footprints, Plus, Sparkles, UsersRound, X } from 'lucide-react';
import CityImage from './CityImage';
import Modal from './journey/Modal';
import { resolveLocalImage } from '../lib/localImages';
import {
  formatTeamKm, isPreviewMileageMember, mileageMemberShortfall, mileageTeamPlan, MILEAGE_MEMBER_GOAL,
  MILEAGE_PREVIEW_PARTNER, MILEAGE_TEAM_NAME, MILEAGE_TEAM_TIERS, totalTeamMeters,
  type MileageCommand, type MileageGoal, type MileageLobbyTeam, type MileageMember, type MileageSnapshot, type MileageTarget, type MileageTeam,
} from '../journey/mileageTeams';
import { availableCityRelayRewards, cityRelayRewardId, CITY_RELAY_COINS, CITY_RELAY_STORAGE, readCityRelayAttempts, type CityRelayAttempt } from '../journey/cityRelay';
import styles from './MileageTeamView.module.css';

type MileageRouteCard = { routeId: string; title: string; image: string; distanceKm: number; minutes: number };
export type MileageChoice = MileageTarget & { image?: string; group?: string; routes: readonly MileageRouteCard[] };
type Sheet = 'create' | 'join' | 'history' | 'rules' | 'leave' | 'receipt';
const titles = {create:'创建小队',join:'加入小队',history:'组队记录',rules:'活动规则',leave:'退出小队',receipt:'领取成功'};
const targetType = (kind: MileageTarget['kind']) => kind === 'mode' ? '跑步模式' : '城市';
const targetKey = (target: MileageTarget) => `${target.kind}:${target.id}`;
const date = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' });
type MemberDisplay = { name: string; avatarUrl?: string };
const profileAvatar = `${import.meta.env.BASE_URL}images/journey/mileage-profile-avatar.webp`;
const previewPartner = MILEAGE_PREVIEW_PARTNER;
const chen = { name: '陈子航', avatarUrl: 'https://i.pravatar.cc/100?img=12' };
const xu = { name: '许景行', avatarUrl: 'https://i.pravatar.cc/100?img=13' };
const sampleRecords = [
  { name: '森林', date: '11月22日', meters: 6400, status: '已领取', partner: previewPartner },
  { name: '东京', date: '11月19日', meters: 7200, status: '已领取', partner: chen },
  { name: '海滩', date: '11月16日', meters: 3500, status: '已结束', partner: xu },
  { name: '午间休息', date: '11月13日', meters: 6000, status: '已领取', partner: previewPartner },
  { name: '巴黎', date: '11月10日', meters: 4800, status: '已结束', partner: chen },
];

function displayMember(member: MileageMember): MemberDisplay {
  return isPreviewMileageMember(member.id) && (member.name === '模拟队友' || member.name === previewPartner.name)
    ? previewPartner : member;
}

function TeamAvatar({ name, avatarUrl }: MemberDisplay) {
  const src = resolveLocalImage(avatarUrl);
  const [failedSrc, setFailedSrc] = useState<string>();
  return <span className={styles.avatar} aria-hidden="true">
    {src && src !== failedSrc ? <img src={src} alt="" decoding="async" onError={() => setFailedSrc(src)}/> : name.slice(0,1)}
  </span>;
}

function RecordPartner({ name, avatarUrl }: MemberDisplay) {
  return <small className={styles.recordPartner}><TeamAvatar name={name} avatarUrl={avatarUrl}/>{name}</small>;
}

interface Props {
  snapshot?: MileageSnapshot;
  error: string;
  choices: MileageChoice[];
  reduceMotion: boolean;
  oldClaims: ReadonlySet<string>;
  onBack: () => void;
  onRun: (target: MileageTarget) => void;
  onRetry: () => void;
  onCommand: (command: MileageCommand) => Promise<boolean>;
  onOldClaim: (attempt: CityRelayAttempt, at: number) => Promise<number>;
}

export default function MileageTeamView({snapshot,error,choices,reduceMotion,oldClaims,onBack,onRun,onRetry,onCommand,onOldClaim}:Props) {
  const pageRef=useRef<HTMLElement>(null);
  const [sheet,setSheet]=useState<Sheet>();
  const [joinCandidate,setJoinCandidate]=useState<MileageLobbyTeam>();
  const [receipt,setReceipt]=useState<{ coins: number; fromHistory: boolean }>();
  const [kind,setKind]=useState<MileageTarget['kind']>('mode');
  const [selected,setSelected]=useState<MileageChoice>();
  const [selectedGoal,setSelectedGoal]=useState<MileageGoal>();
  const [busy,setBusy]=useState(false);
  const [chooseAgain,setChooseAgain]=useState(false);
  const [oldRecords]=useState(()=>{
    try { return readCityRelayAttempts(localStorage.getItem(CITY_RELAY_STORAGE)); } catch { return []; }
  });
  const team=chooseAgain && snapshot?.current?.status==='complete'?undefined:snapshot?.current;
  useLayoutEffect(()=>{
    if(pageRef.current)pageRef.current.scrollTop=0;
  },[team?.id]);
  const canBrowse=!!snapshot&&!team;
  const self=team?.members.find(person=>person.id===snapshot?.self);
  const buddy=team?.members.find(person=>person.id!==snapshot?.self);
  const buddyDisplay=buddy&&displayMember(buddy);
  const previewBuddy=buddy&&isPreviewMileageMember(buddy.id);
  const {goalMeters,rewardCoins}=mileageTeamPlan(team??{});
  const waiting=team?.status==='waiting';
  const active=team?.status==='active';
  const complete=team?.status==='complete';
  const claimed=self?.claimedAt!==undefined;
  const actionLayout=canBrowse||team?(active||complete&&!claimed?'double':'single'):undefined;
  const canSimulateOwnMileage=active&&previewBuddy&&self&&self.meters<MILEAGE_MEMBER_GOAL;
  const canSimulateMileage=active&&previewBuddy&&buddy.meters<goalMeters-MILEAGE_MEMBER_GOAL;
  const memberShortfall=active&&snapshot?mileageMemberShortfall(team,snapshot.self):undefined;
  const target=team&&choices.find(choice=>targetKey(choice)===targetKey(team.target));
  const teamRoutes=waiting||active?target?.routes.slice(0,3):undefined;
  const hero=target?.image??'images/welfare/running-buddies-cover.webp';
  const total=team?totalTeamMeters(team):0;
  const goalKm=formatTeamKm(goalMeters);
  const hasUnclaimed=snapshot?.history.some(item=>item.status==='complete'&&item.members.some(person=>person.id===snapshot.self&&person.claimedAt===undefined));
  const targetChoices=choices.filter(item=>item.kind===kind);
  const findChoice=(target:MileageTarget)=>choices.find(choice=>targetKey(choice)===targetKey(target));
  const waitingTeams=snapshot?.lobby??[];
  const previewTeams=snapshot?.previewLobby??[];
  const availableCount=waitingTeams.filter(item=>findChoice(item.target)).length;
  const lobbyTeams=[...waitingTeams,...previewTeams.slice(0,Math.max(0,previewTeams.length-availableCount))];
  const canJoin=!!joinCandidate&&[...waitingTeams,...previewTeams].some(item=>item.id===joinCandidate.id);
  const joinPlan=joinCandidate&&mileageTeamPlan(joinCandidate);
  const closeSheet=()=>{
    setSheet(sheet==='receipt'&&receipt?.fromHistory?'history':undefined);
    setJoinCandidate(undefined);
    setReceipt(undefined);
  };
  const command=async (action:MileageCommand,close=false)=>{
    if(busy)return false;
    setBusy(true);
    try {
      if(!await onCommand(action))return false;
      setChooseAgain(action.action==='leave');
      if(close)closeSheet();
      return true;
    } finally { setBusy(false); }
  };
  const claimReward=async (entry:MileageTeam)=>{
    if(!await command({action:'claim',teamId:entry.id}))return;
    setReceipt({coins:mileageTeamPlan(entry).rewardCoins,fromHistory:sheet==='history'});
    setSheet('receipt');
  };
  const simulateMileageButton=(teamId:string,member:'self'|'partner')=><button type="button"
    className={`${styles.simulateButton} ${styles.simulateMileage}`} disabled={busy}
    aria-label={member==='self'?'模拟我的贡献里程':'模拟队友贡献里程'} title="模拟贡献里程"
    onClick={()=>void command({action:'simulateMileage',teamId,member})}>
    <Plus size={15} aria-hidden="true"/><span>模拟贡献里程</span>
  </button>;
  const openCreate=()=>{setKind('mode');setSelected(undefined);setSelectedGoal(undefined);setSheet('create');};
  const renderLobbyTeam=(item:MileageLobbyTeam)=>{
    const available=findChoice(item.target);
    const plan=mileageTeamPlan(item);
    return <li key={item.id}><button type="button" disabled={!available||busy} onClick={()=>{
      setJoinCandidate(item);
      setSheet('join');
    }}>
      <CityImage src={available?.image} alt="" className={styles.thumb}/>
      <span>
        <strong>{item.target.name}小队</strong>
        <small>{targetType(item.target.kind)} · 队长 {item.captain}</small>
        <small className={styles.lobbyMetrics}>
          <span>{formatTeamKm(plan.goalMeters)} km</span>
          <span className={styles.lobbyReward}><Coins size={12} aria-hidden="true"/> {plan.rewardCoins} 金币</span>
        </small>
      </span>
      <small className={styles.lobbyAvailability}>
        {available?<>1 / 2 人<ChevronRight size={14} aria-hidden="true"/></>:'暂无可跑路线'}
      </small>
    </button></li>;
  };
  const rulesButton=<button type="button" className={styles.rulesLink} onClick={()=>setSheet('rules')}><BookOpen size={17} aria-hidden="true"/>规则</button>;

  return <main ref={pageRef} className={styles.page} id="main-content" aria-labelledby="mileage-title"
    data-modal-open={!!sheet} data-action-layout={actionLayout} data-reduce-motion={reduceMotion}>
    <nav className={styles.nav} aria-label="活动导航">
      <button type="button" onClick={onBack} aria-label="返回活动"><ChevronLeft size={21} aria-hidden="true"/></button>
      <h1 className={styles.navTitle} id="mileage-title">{MILEAGE_TEAM_NAME}</h1>
      <button type="button" onClick={()=>setSheet('history')}>{titles.history}{hasUnclaimed&&<span className={styles.historyDot} aria-label="有奖励待领取"/>}</button>
    </nav>
    <div className={styles.body}>
      <section className={styles.hero} data-team={!!team} aria-labelledby="mileage-hero">
        <div className={styles.heroCover}>
          <div className={styles.heroImage} aria-hidden="true">
            <CityImage src={hero} alt="" className={styles.heroPhoto} loading="eager" fetchPriority="high"/>
          </div>
          <header className={styles.heroCopy}>
            {team?<div className={styles.teamTitle}>
              <h2 id="mileage-hero">{team.target.name}小队</h2>
              {team.status!=='complete'&&<p>{waiting?`${goalKm} km · `:''}达标各领 {rewardCoins} 金币</p>}
            </div>:<p className={styles.coverHeadline}>找个搭子，一起跑</p>}
          </header>
        </div>
        {!team&&<div className={styles.heroGoal}>
          <div className={styles.goalHeading}>
            <h2 id="mileage-hero">小队里程目标</h2>
            <span>每人至少 {formatTeamKm(MILEAGE_MEMBER_GOAL)} km</span>
          </div>
          <ul className={styles.goalDetails} aria-label="目标里程与每人奖励">
            {MILEAGE_TEAM_TIERS.map(tier=><li key={tier.goalMeters}>
              <strong>{formatTeamKm(tier.goalMeters)} <span>km</span></strong>
              <small><Coins size={13} aria-hidden="true"/> {tier.rewardCoins} 金币/人</small>
            </li>)}
          </ul>
        </div>}
      </section>

      {!snapshot?<div className={styles.action}><p role="status">{error||'正在读取小队…'}</p>{error&&<button type="button" className={styles.primary} onClick={onRetry}>重试</button>}</div>
        :team&&<section className={styles.teamPanel} data-complete={complete} aria-labelledby="mileage-progress">
          <header className={styles.teamHeading}>
            <h2 id="mileage-progress" aria-live="polite">
              {complete?<><span className={styles.completeMark} aria-hidden="true"><Check size={14}/></span>小队已达标</>:waiting?'等待队友加入':'小队进度'}
            </h2>
            <strong className={styles.teamTotal}>
              {waiting?'1 / 2 人':complete
                ? <><span>合计</span> {formatTeamKm(total)} <span>km</span></>
                : <>{formatTeamKm(total)} <span>/ {goalKm} km</span></>}
            </strong>
          </header>
          {!waiting&&!complete&&<progress className={styles.progress} value={Math.min(total,goalMeters)} max={goalMeters} aria-label="小队累计里程"/>}
          <ul className={complete?`${styles.memberGrid} ${styles.finishedMembers}`:styles.memberGrid} aria-label="小队成员">
            <li>
              <span><TeamAvatar name="沐小六" avatarUrl={profileAvatar}/>你{canSimulateOwnMileage&&simulateMileageButton(team.id,'self')}</span>
              {waiting?<small>队长</small>:<strong>{formatTeamKm(self?.meters??0)} <small>km</small></strong>}
            </li>
            <li className={waiting?styles.waitingMember:undefined}>
              <span>
                {buddyDisplay?<TeamAvatar {...buddyDisplay}/>:<UsersRound size={15} aria-hidden="true"/>}
                <span className={styles.memberName}>{buddyDisplay?.name??'队友'}</span>
                {canSimulateMileage&&simulateMileageButton(team.id,'partner')}
              </span>
              {buddy?<strong>{formatTeamKm(buddy.meters)} <small>km</small></strong>:<small>待加入</small>}
              {waiting&&<button type="button" className={`${styles.simulateButton} ${styles.simulateJoin}`} disabled={busy}
                onClick={()=>void command({action:'simulatePartner',teamId:team.id})}>模拟加入</button>}
            </li>
          </ul>
          {memberShortfall&&<p className={styles.missing} role="status">{memberShortfall}</p>}
          {complete&&<div className={styles.rewardSummary}>
            <span className={styles.rewardSummaryIcon}><Coins size={18} aria-hidden="true"/></span>
            <strong>{rewardCoins} <span>金币</span></strong>
            <span className={styles.rewardStatus} data-claimed={claimed} role="status">
              {claimed&&<Check size={13} aria-hidden="true"/>}{claimed?'已领取':'待领取'}
            </span>
          </div>}
        </section>}
      {canBrowse?<section className={styles.lobby} aria-labelledby="mileage-lobby">
        <header className={styles.panelHeader}>
          <h2 id="mileage-lobby">等待加入的小队</h2>
          {rulesButton}
        </header>
        {lobbyTeams.length>0
          ? <ul className={`${styles.choices} ${styles.lobbyChoices}`}>{lobbyTeams.map(renderLobbyTeam)}</ul>
          : <p className={styles.empty}>暂无等待中的队伍</p>}
      </section>:teamRoutes?.length?<section className={styles.routePanel} aria-labelledby="mileage-routes">
        <header className={styles.panelHeader}>
          <h2 id="mileage-routes">本队路线</h2>
          {rulesButton}
        </header>
        <ul className={styles.routeList}>
          {teamRoutes.map(route=><li key={route.routeId}>
            <CityImage src={route.image} alt="" className={styles.thumb}/>
            <div>
              <strong>{route.title}</strong>
              <small>{route.distanceKm} km · 约 {route.minutes} 分钟</small>
            </div>
          </li>)}
        </ul>
      </section>:<div className={styles.utilities} data-center={complete}>{rulesButton}</div>}
    </div>

    {actionLayout&&<footer className={styles.actionBar} aria-label="小队操作">
      <div className={styles.actionBarContent}>
        {error&&!sheet&&<p className={styles.error} role="status">{error}</p>}
        {canBrowse&&<button type="button" className={styles.primary} data-tone="create" disabled={busy} onClick={openCreate}>
          <Plus size={20} aria-hidden="true"/>创建小队
        </button>}
        {team&&waiting&&<button type="button" className={styles.outline} data-tone="cancel" disabled={busy}
          onClick={()=>void command({action:'leave',teamId:team.id})}>取消小队</button>}
        {team&&active&&<>
          {!target&&<p className={styles.error} role="status">当前没有可跑的目标路线。</p>}
          <button type="button" className={styles.primary} disabled={!target} onClick={()=>onRun(team.target)}>
            <Footprints size={18} aria-hidden="true"/>去跑步<ArrowRight size={17} aria-hidden="true"/>
          </button>
          <button type="button" className={styles.chooseMode} data-tone="exit" onClick={()=>setSheet('leave')}>退出小队</button>
        </>}
        {team&&complete&&(
          claimed
            ? <button type="button" className={styles.primary} data-tone="regroup" onClick={()=>setChooseAgain(true)}>重新组队</button>
            : <>
              <button type="button" className={styles.primary} data-tone="claim" disabled={busy} onClick={()=>void claimReward(team)}>
                <Coins size={18} aria-hidden="true"/>领取金币
              </button>
              <button type="button" className={styles.chooseMode} data-tone="regroup" disabled={busy}
                onClick={()=>setChooseAgain(true)}>重新组队</button>
            </>
        )}
      </div>
    </footer>}

    {sheet&&sheet!=='receipt'&&<Modal className={sheet==='join'?`${styles.sheet} ${styles.centeredSheet}`:styles.sheet}
      backdropClassName={sheet==='join'?styles.centeredBackdrop:undefined} labelId="mileage-sheet"
      onClose={sheet==='join'&&busy?undefined:closeSheet}>
      <header className={styles.sheetHeader}>
        <h2 id="mileage-sheet">{titles[sheet]}</h2>
        {sheet!=='join'&&<button type="button" onClick={closeSheet} aria-label="关闭"><X size={21}/></button>}
      </header>
      {sheet==='join'&&joinCandidate&&joinPlan&&<>
        <div className={styles.joinTeam}>
          <CityImage src={findChoice(joinCandidate.target)?.image} alt="" className={styles.thumb}/>
          <div>
            <strong>{joinCandidate.target.name}小队</strong>
            <small>{targetType(joinCandidate.target.kind)} · 队长 {joinCandidate.captain}</small>
          </div>
        </div>
        <dl className={styles.joinDetails}>
          <div><dt>目标里程</dt><dd>{formatTeamKm(joinPlan.goalMeters)} km</dd></div>
          <div><dt>达标各领</dt><dd><Coins size={14} aria-hidden="true"/> {joinPlan.rewardCoins} 金币</dd></div>
        </dl>
        {!canJoin&&!error&&<p className={styles.error} role="status">小队已满或已取消，请选择其他小队。</p>}
        <div className={styles.joinActions}>
          <button type="button" className={styles.outline} disabled={busy} onClick={closeSheet}>取消</button>
          <button type="button" className={styles.primary} disabled={!canJoin||busy}
            onClick={()=>void command({action:'join',teamId:joinCandidate.id},true)}>{busy?'加入中…':'确认加入'}</button>
        </div>
      </>}
      {sheet==='create'&&<>
        <div className={styles.tierPicker} role="group" aria-label="小队目标里程">
          <h3>小队目标里程</h3>
          <div className={styles.tierOptions}>
            {MILEAGE_TEAM_TIERS.map(tier=><button key={tier.goalMeters} type="button" aria-pressed={selectedGoal===tier.goalMeters}
              onClick={()=>setSelectedGoal(tier.goalMeters)}>
              <strong>{formatTeamKm(tier.goalMeters)} km</strong><small>{tier.rewardCoins} 金币/人</small>
            </button>)}
          </div>
        </div>
        <div className={styles.modeTabs} role="group" aria-label="目标类型">
          {(['mode','city'] as const).map(item=><button key={item} type="button" aria-pressed={item===kind}
            onClick={()=>{setKind(item);setSelected(undefined);}}>{targetType(item)}</button>)}
        </div>
        <ul key={kind} className={`${styles.choices} ${styles.targetChoices}`} aria-label="可用目标">
          {targetChoices.map(item=><li key={targetKey(item)}><button type="button" aria-pressed={selected&&targetKey(selected)===targetKey(item)}
            onClick={()=>setSelected(item)}>
            <CityImage src={item.image} alt="" className={styles.thumb}/>
            <span><strong>{item.name}</strong>{item.group&&<small>{item.group}</small>}</span>
            {selected&&targetKey(selected)===targetKey(item)&&<Check size={18} aria-hidden="true"/>}
          </button></li>)}
        </ul>
        {!targetChoices.length&&<p className={styles.empty}>暂无可跑的目标</p>}
        <button type="button" className={styles.primary} disabled={!selected||selectedGoal===undefined||busy}
          onClick={()=>selected&&selectedGoal!==undefined&&void command({action:'create',target:{kind:selected.kind,id:selected.id},goalMeters:selectedGoal},true)}>确认创建</button>
      </>}
      {sheet==='rules'&&<dl className={styles.rules}>
        <div><dt>选一个小队目标</dt><dd>创建时选择跑步模式或城市，再选目标里程。组满两人后，双方可以在目标范围内各选路线，按自己的时间跑。</dd></div>
        <div><dt>累计有效里程</dt><dd>组队后开跑，视频播放期间产生的有效里程在运动结束后计入。一场运动计入一轮。</dd></div>
        <div><dt>达标后各领金币</dt><dd>小队累计达到所选档位，且两人各满 {formatTeamKm(MILEAGE_MEMBER_GOAL)} km，可在活动页或组队记录领取。
          {MILEAGE_TEAM_TIERS.map(tier=>`${formatTeamKm(tier.goalMeters)} km 各领 ${tier.rewardCoins} 金币`).join('、')}。</dd></div>
      </dl>}
      {sheet==='leave'&&team&&<div className={styles.action}>
        <p>退出后这轮攒里程结束，双方都可以重新组队。</p>
        <button type="button" className={styles.primary} disabled={busy} onClick={()=>void command({action:'leave',teamId:team.id},true)}>确认退出</button>
        <button type="button" className={styles.chooseMode} onClick={()=>setSheet(undefined)}>继续留队</button>
      </div>}
      {sheet==='history'&&<ul className={styles.history} aria-label="组队记录列表">
          {snapshot?.history.map(item=>{
            const mine=item.members.find(person=>person.id===snapshot.self);
            const partner=item.members.find(person=>person.id!==snapshot.self);
            return <li key={item.id}>
              <div>
                <strong>{item.target.name}小队</strong>
                <small>{date.format(item.createdAt)} · {formatTeamKm(totalTeamMeters(item))} km</small>
                {partner&&<RecordPartner {...displayMember(partner)}/>}
              </div>
              {item.status==='complete'&&mine?.claimedAt===undefined
                ? <button type="button" disabled={busy} onClick={()=>void claimReward(item)}>领 {mileageTeamPlan(item).rewardCoins} 金币</button>
                : <small>{item.status==='complete'?'已领取':'已结束'}</small>}
            </li>;
          })}
          {oldRecords.map(item=>{
            const pending=availableCityRelayRewards(item,Date.now(),oldClaims).reduce((sum,reward)=>sum+CITY_RELAY_COINS[reward],0);
            return <li key={item.id}>
              <span><strong>{item.route?.name}</strong><small>往期搭子跑 · {date.format(item.joinedAt)}</small></span>
              {pending>0?<button type="button" disabled={busy} onClick={()=>void onOldClaim(item,Date.now())}>领 {pending} 金币</button>
                :<small>{oldClaims.has(cityRelayRewardId(item.id,'team'))?'已领取':'等待完赛'}</small>}
            </li>;
          })}
          {sampleRecords.map(item=><li key={item.name}>
            <div>
              <strong>{item.name}小队</strong>
              <small>{item.date} · {formatTeamKm(item.meters)} km</small>
              <RecordPartner {...item.partner}/>
            </div>
            <small>{item.status}</small>
          </li>)}
      </ul>}
      {error&&<p className={styles.error} role="status">{error}</p>}
    </Modal>}
    {sheet==='receipt'&&receipt&&<Modal className={`${styles.sheet} ${styles.centeredSheet} ${styles.receiptSheet}`}
      backdropClassName={styles.centeredBackdrop} labelId="mileage-receipt" onClose={closeSheet}>
      <div className={styles.receiptArt} aria-hidden="true">
        <Sparkles className={styles.receiptSparkle} size={21}/>
        <span className={styles.receiptCoin}><Coins size={38}/></span>
        <Sparkles className={styles.receiptSparkle} size={16}/>
      </div>
      <header className={styles.sheetHeader}><h2 id="mileage-receipt">{titles.receipt}</h2></header>
      <p className={styles.receiptAmount}><strong>+{receipt.coins}</strong> 金币</p>
      <button type="button" className={styles.primary} onClick={closeSheet}>知道了</button>
    </Modal>}
  </main>;
}
