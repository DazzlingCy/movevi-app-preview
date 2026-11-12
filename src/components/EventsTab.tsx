import { useId, useRef, useState, type CSSProperties } from 'react';
import { Check, ChevronLeft, ChevronRight, Coins, Footprints, Gift, Globe2, Route, Users, Wallet, X } from 'lucide-react';
import { COINS_PER_YUAN, DAILY_COIN_CAP, MILEAGE_REWARDS, ROUTE_REWARDS, STARTER_COIN_REWARDS, WITHDRAWAL_TIERS, formatCoinValue, parseWithdrawalCoins, type CoinEntry, type CoinTrack, type WithdrawalTier } from '../journey/coinRewards';
import type { useCoinRewards } from '../journey/useCoinRewards';
import Modal from './journey/Modal';
import styles from './EventsTab.module.css';

interface EventsTabProps {
  rewards: ReturnType<typeof useCoinRewards>;
  onRun: () => void;
  onSelectMedalLottery: () => void;
  onSelectTeamRelay: () => void;
  onSelectHundredCities: () => void;
}

const numberFormat = new Intl.NumberFormat('zh-CN');
const entryDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
});
const trackNames = { mileage: '累计运动里程', route: '路线通关' };
const historyTabs = { history: '金币记录', cashHistory: '现金记录' } as const;
type HistoryTab = keyof typeof historyTabs;
const fallingCoins = [
  { x: 5, drift: -16, delay: 40, size: 19, tilt: -24 },
  { x: 16, drift: -14, delay: 185, size: 12, tilt: 38 },
  { x: 26, drift: -25, delay: 0, size: 17, tilt: -28 },
  { x: 45, drift: -27, delay: 125, size: 13, tilt: 22 },
  { x: 60, drift: 20, delay: 65, size: 15, tilt: -34 },
  { x: 75, drift: 19, delay: 245, size: 16, tilt: 24 },
  { x: 84, drift: 18, delay: 45, size: 19, tilt: 35 },
  { x: 94, drift: 10, delay: 170, size: 12, tilt: -38 },
];

function RewardMilestones({ tiers, value, track, starterClaimed, onClaim }: {
  tiers: readonly { goal: number; coins: number }[];
  value: number;
  track: CoinTrack;
  starterClaimed: boolean;
  onClaim: () => void;
}) {
  const current = tiers.findIndex((tier, index) => value < tier.goal && !(index === 0 && starterClaimed));
  return (
    <ol className={styles.milestones}>
      {tiers.map((tier, index) => {
        const reached = value >= tier.goal || (index === 0 && starterClaimed);
        const claimable = index === 0 && !reached;
        const goal = track === 'route' ? `第 ${tier.goal} 条` : `${tier.goal} km`;
        const tileContent = (
          <>
            <span className={styles.tierGoal}>{goal}</span>
            <span className={styles.tierCoins}>
              <Coins className={styles.tierCoinIcon} size={13} aria-hidden="true" />
              +{tier.coins}<span className={styles.srOnly}> 金币{reached ? '，已入账' : ''}</span>
            </span>
            {(claimable || reached) && (
              <span className={styles.rewardStatus} aria-hidden="true">
                {reached ? <><Check size={10} strokeWidth={2.5} />已领取</> : '领取'}
              </span>
            )}
          </>
        );
        return (
          <li key={tier.goal} data-reached={reached} data-claimable={claimable} aria-current={index === current ? 'step' : undefined}>
            {claimable ? <button type="button" className={styles.rewardTile} aria-label={`领取${trackNames[track]} ${goal} 奖励，${tier.coins} 金币`} onClick={onClaim}>{tileContent}</button>
              : <span className={styles.rewardTile}>{tileContent}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function RewardHistory({ ledger, showCash, showExamples }: { ledger: CoinEntry[]; showCash: boolean; showExamples: boolean }) {
  const entries = ledger.filter(entry => entry.kind !== 'exercise' || entry.reward.mileage + entry.reward.route > 0)
    .sort((a, b) => b.at - a.at);
  const formatAmount = (coins: number) => showCash ? formatCoinValue(coins) : `${numberFormat.format(coins)} 金币`;
  if (!entries.length && showExamples) {
    return (
      <ul className={styles.history}>
        {(['mileage', 'route'] as const).map((track, index) => (
          <li key={track}>
            <div><strong>{trackNames[track]}奖励</strong><small>{entryDate.format(Date.now() - index * 86_400_000)} · 示例记录</small></div>
            <b>+{formatAmount(STARTER_COIN_REWARDS[track].coins)}</b>
          </li>
        ))}
      </ul>
    );
  }
  if (!entries.length) return <p className={styles.empty}>完成有效运动后，奖励明细会显示在这里。</p>;
  return (
    <ul className={styles.history}>
      {entries.map(entry => {
        const coins = entry.kind === 'exercise' ? entry.reward.mileage + entry.reward.route : entry.coins;
        const amount = formatAmount(coins);
        return (
          <li key={entry.id}>
            <div>
              <strong>{entry.kind === 'starter-claim' ? `${trackNames[entry.track]}奖励`
                : entry.kind === 'exercise' ? entry.routeName : entry.kind === 'withdrawal' ? '模拟提现' : '演示余额'}</strong>
              <small>{entryDate.format(entry.at)}</small>
              {entry.kind === 'exercise' && !showCash && <small>里程 +{entry.reward.mileage} · 通关 +{entry.reward.route}</small>}
            </div>
            <b>{entry.kind === 'withdrawal' ? '−' : '+'}{amount}</b>
          </li>
        );
      })}
    </ul>
  );
}

export default function EventsTab({ rewards, onRun, onSelectMedalLottery, onSelectTeamRelay, onSelectHundredCities }: EventsTabProps) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<HistoryTab | null>(null);
  const [earningsOpen, setEarningsOpen] = useState(false);
  const [tier, setTier] = useState<WithdrawalTier | 'custom'>(1);
  const [customAmount, setCustomAmount] = useState('');
  const [notice, setNotice] = useState('');
  const [compact, setCompact] = useState(false);
  const [claimedTrack, setClaimedTrack] = useState<CoinTrack | null>(null);
  const [claimError, setClaimError] = useState('');
  const claiming = useRef(false);
  const tasksHeading = useRef<HTMLHeadingElement>(null);
  const walletRef = useRef<HTMLElement>(null);
  const withdrawalId = useRef<string | null>(null);
  const earningsTrigger = useRef<HTMLElement | null>(null);
  const historyTrigger = useRef<HTMLElement | null>(null);
  const [withdrawn, setWithdrawn] = useState(false);
  const headingId = useId();
  const activities = [
    { name: '勋章盲盒抽奖', description: '用盲盒券兑换抽奖机会', icon: Gift, theme: 'gold', select: onSelectMedalLottery },
    { name: '百人百城计划', icon: Globe2, theme: 'violet', select: onSelectHundredCities },
    { name: '环球搭子小队', description: '双人组队，完成城市路线', icon: Users, theme: 'mint', select: onSelectTeamRelay },
  ];
  const routeCount = Math.min(rewards.today.routes.size, ROUTE_REWARDS.length);
  const amount = tier === 'custom' ? customAmount : tier;
  const withdrawalCoins = parseWithdrawalCoins(amount);
  const canWithdraw = rewards.demo && !withdrawn && withdrawalCoins !== null && rewards.balance >= withdrawalCoins;
  const invalidAmount = tier === 'custom' && customAmount.trim() !== '' && withdrawalCoins === null;
  const insufficientBalance = !withdrawn && withdrawalCoins !== null && withdrawalCoins > rewards.balance;
  const demoCreditLoaded = rewards.ledger.some(entry => entry.kind === 'demo-credit');
  const claimStarter = async (track: CoinTrack) => {
    if (claiming.current) return;
    claiming.current = true;
    setClaimError('');
    try {
      if (await rewards.claimStarter(track)) {
        setClaimedTrack(track);
        return;
      }
      setClaimError('暂时无法领取，请刷新后重试。');
    } catch {
      setClaimError('暂时无法领取，请刷新后重试。');
    } finally {
      claiming.current = false;
    }
  };
  const closeClaim = () => {
    setClaimedTrack(null);
    requestAnimationFrame(() => tasksHeading.current?.focus({ preventScroll: true }));
  };
  const openEarnings = () => {
    earningsTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    withdrawalId.current = null;
    setTier(1);
    setCustomAmount('');
    setWithdrawn(false);
    setNotice('');
    setEarningsOpen(true);
  };
  const closeEarnings = () => {
    setEarningsOpen(false);
    requestAnimationFrame(() => earningsTrigger.current?.focus({ preventScroll: true }));
  };
  const submitWithdrawal = () => {
    if (!canWithdraw || withdrawalCoins === null) return;
    const id = withdrawalId.current ??= `withdraw-${crypto.getRandomValues(new Uint32Array(4)).join('-')}`;
    if (rewards.withdraw(amount, id)) {
      setWithdrawn(true);
      setNotice(`已记录模拟提现 ${formatCoinValue(withdrawalCoins)} 至微信钱包。`);
    } else {
      setNotice('余额已更新或本地记录保存失败，请重试。');
    }
  };
  const openHistory = (kind: HistoryTab, trigger: HTMLElement) => {
    historyTrigger.current = trigger;
    setHistoryTab(kind);
  };
  const closeHistory = () => {
    setHistoryTab(null);
    const trigger = historyTrigger.current;
    historyTrigger.current = null;
    requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  };

  return (
    <>
      <main className={styles.page} id={earningsOpen || historyTab ? undefined : 'main-content'} aria-label="福利" inert={earningsOpen || !!historyTab || rulesOpen || !!claimedTrack}
        onScroll={event => setCompact(event.currentTarget.scrollTop >= (walletRef.current?.offsetHeight ?? Infinity))}>
        <div className={styles.stickyAnchor}>
          {compact && <div className={styles.stickyWallet}>
            <div className={styles.stickyBalances}>
              <button type="button" onClick={event => openHistory('history', event.currentTarget)} aria-label={`金币明细，${numberFormat.format(rewards.balance)} 金币`}>
                <Coins size={17} aria-hidden="true" /><b>{numberFormat.format(rewards.balance)}</b><span>金币</span>
              </button>
              <button type="button" onClick={event => openHistory('cashHistory', event.currentTarget)} aria-label={`现金明细，${formatCoinValue(rewards.balance)}`}>
                <Wallet size={16} aria-hidden="true" /><b>{formatCoinValue(rewards.balance)}</b>
              </button>
            </div>
            <button type="button" onClick={openEarnings}>去提现 <ChevronRight size={15} aria-hidden="true" /></button>
          </div>}
        </div>

        <section ref={walletRef} className={styles.wallet} aria-label="金币钱包">
          <div className={`${styles.walletTop} ${styles.walletSummary}`}>
            <button type="button" onClick={event => openHistory('history', event.currentTarget)}>
              <span><Coins className={styles.walletCoin} size={15} aria-hidden="true" />金币收益 (金币)<ChevronRight size={14} aria-hidden="true" /></span>
              <strong>{numberFormat.format(rewards.balance)}</strong>
            </button>
            <button type="button" onClick={event => openHistory('cashHistory', event.currentTarget)}>
              <span><Wallet className={styles.walletCash} size={15} aria-hidden="true" />现金收益 (元)<ChevronRight size={14} aria-hidden="true" /></span>
              <strong>{formatCoinValue(rewards.balance)}</strong>
            </button>
          </div>
          <div className={styles.walletBottom}><span>0点自动兑换成金币</span><button type="button" onClick={openEarnings}>去提现 <ChevronRight size={15} aria-hidden="true" /></button></div>
        </section>

        <div className={styles.content}>
          <section className={styles.tasks} aria-labelledby="coin-tasks-title">
            <header>
              <div className={styles.tasksSummary}>
                <h2 id="coin-tasks-title" ref={tasksHeading} tabIndex={-1}>运动得福利</h2>
                <p>今日已获 <strong>{rewards.today.earned}</strong> / {DAILY_COIN_CAP} 金币</p>
                <progress className={styles.dailyProgress} aria-label="今日金币奖励进度" value={rewards.today.earned} max={DAILY_COIN_CAP} />
              </div>
              <button className={styles.run} type="button" onClick={onRun}>去跑步</button>
            </header>
            <div className={styles.task}>
              <div className={styles.taskHeading}><span data-theme="mint"><Footprints size={18} aria-hidden="true" /></span><h3>累计运动里程</h3><strong>{(rewards.today.meters / 1000).toLocaleString('zh-CN', { maximumFractionDigits: 3 })} <small>km</small></strong></div>
              <RewardMilestones tiers={MILEAGE_REWARDS} value={rewards.today.meters / 1000} track="mileage" starterClaimed={rewards.starterClaims.has('mileage')} onClaim={() => void claimStarter('mileage')} />
            </div>
            <div className={styles.task}>
              <div className={styles.taskHeading}><span data-theme="gold"><Route size={18} aria-hidden="true" /></span><h3>路线通关</h3><strong>{routeCount}<small> / {ROUTE_REWARDS.length} 条</small></strong></div>
              <RewardMilestones tiers={ROUTE_REWARDS} value={routeCount} track="route" starterClaimed={rewards.starterClaims.has('route')} onClaim={() => void claimStarter('route')} />
            </div>
            {claimError && <p className={styles.claimError} role="alert">{claimError}</p>}
          </section>

          <section className={styles.more} aria-labelledby="more-benefits-title">
            <h2 id="more-benefits-title">更多福利</h2>
            <ul className={styles.benefitList}>
              {activities.map(({ name, description, icon: Icon, theme, select }) => (
                <li key={name}>
                  <button type="button" className={styles.benefitLink} onClick={select}>
                    <span className={styles.benefitIcon} data-theme={theme}><Icon size={17} aria-hidden="true" /></span>
                    <span className={styles.benefitCopy}><strong>{name}</strong>{description && <small>{description}</small>}</span>
                    <ChevronRight className={styles.benefitChevron} size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <p className={styles.footer}><button type="button" onClick={() => setRulesOpen(true)}>活动规则 <ChevronRight size={13} aria-hidden="true" /></button></p>
        </div>
      </main>

      {earningsOpen && (
        <main className={`${styles.page} ${styles.earningsPage}`} id={historyTab ? undefined : 'main-content'} aria-labelledby="earnings-title" inert={!!historyTab || rulesOpen}>
          <header className={styles.earningsHeader}>
            <nav className={styles.earningsNav} aria-label="收益页导航">
              <button type="button" autoFocus onClick={closeEarnings} aria-label="返回福利"><ChevronLeft size={24} aria-hidden="true" /></button>
              <h1 id="earnings-title">我的收益</h1>
              <button type="button" onClick={() => setRulesOpen(true)}>规则</button>
            </nav>
            <div className={`${styles.walletTop} ${styles.earningsBalance}`}>
              <button type="button" onClick={event => openHistory('history', event.currentTarget)}><span>金币收益 (金币)<ChevronRight size={14} aria-hidden="true" /></span><strong>{numberFormat.format(rewards.balance)}</strong></button>
              <button type="button" onClick={event => openHistory('cashHistory', event.currentTarget)}><span>现金收益 (元)<ChevronRight size={14} aria-hidden="true" /></span><strong>{formatCoinValue(rewards.balance)}</strong></button>
            </div>
          </header>

          <section className={styles.withdrawCard} aria-labelledby="withdraw-title">
            <h2 id="withdraw-title"><span><Wallet size={18} aria-hidden="true" /></span>微信提现</h2>
            <p className={styles.sheetNote}>提现后1-3个工作日内到账</p>
            <div className={styles.withdrawTiers} role="group" aria-label="提现档位">
              {WITHDRAWAL_TIERS.map(value => (
                <button key={value} type="button" aria-pressed={tier === value} disabled={withdrawn} onClick={() => {
                  setTier(value);
                  setCustomAmount('');
                }}>
                  <strong>{value.toFixed(2)} <small>元</small></strong>
                </button>
              ))}
            </div>
            <div className={styles.customWithdrawal} data-selected={tier === 'custom'}>
              <label htmlFor="custom-withdrawal-amount">自定义金额（元）</label>
              <input id="custom-withdrawal-amount" type="text" inputMode="decimal" autoComplete="off" placeholder="最低 ¥0.01"
                value={customAmount} onChange={event => {
                  setTier('custom');
                  setCustomAmount(event.target.value);
                }} disabled={withdrawn}
                aria-invalid={invalidAmount || undefined}
                aria-describedby="custom-withdrawal-hint" />
              <small id="custom-withdrawal-hint" role="status">
                {invalidAmount ? '请输入大于 0、最多两位小数的金额。' : tier === 'custom' && insufficientBalance ? '余额不足。' : `可用余额 ${formatCoinValue(rewards.balance)}`}
              </small>
            </div>
            <button className={`${styles.confirm} ${styles.confirmWechat}`} type="button" disabled={!canWithdraw} onClick={submitWithdrawal}>
              立即提现
            </button>
            {rewards.demo && !demoCreditLoaded && <button className={styles.demo} type="button" onClick={() => setNotice(rewards.loadDemoBalance() ? '已载入 ¥1 演示余额。' : '演示余额已载入或本地记录保存失败。')}>载入 ¥1 演示余额</button>}
            <p className={styles.notice} role="status">{notice}</p>
          </section>
        </main>
      )}

      {historyTab && (
        <main className={`${styles.page} ${styles.earningsPage}`} id="main-content" aria-labelledby="history-title" inert={rulesOpen}>
          <header className={`${styles.earningsHeader} ${styles.historyHeader}`}>
            <nav className={styles.earningsNav} aria-label="收益记录导航">
              <button type="button" autoFocus onClick={closeHistory} aria-label="返回"><ChevronLeft size={24} aria-hidden="true" /></button>
              <h1 id="history-title">收益记录</h1>
              <button type="button" onClick={() => setRulesOpen(true)}>说明</button>
            </nav>
            <dl className={styles.historyBalance}>
              <div><dt>金币收益 (金币)</dt><dd>{numberFormat.format(rewards.balance)}</dd></div>
              <div><dt>现金收益 (元)</dt><dd>{formatCoinValue(rewards.balance)}</dd></div>
            </dl>
            <p className={styles.historyRate}>10,000 金币兑 ¥1</p>
          </header>
          <section className={styles.historyCard} aria-label={historyTabs[historyTab]}>
            <div className={styles.historyTabs} role="group" aria-label="记录类型">
              {(['history', 'cashHistory'] as const).map(tab => (
                <button key={tab} type="button" aria-pressed={historyTab === tab} onClick={() => setHistoryTab(tab)}>{historyTabs[tab]}</button>
              ))}
            </div>
            <RewardHistory ledger={rewards.ledger} showCash={historyTab === 'cashHistory'} showExamples={rewards.localPreview || rewards.demo} />
          </section>
        </main>
      )}

      {claimedTrack && (
        <Modal labelId={headingId} onClose={closeClaim} className={styles.claimDialog} backdropClassName={styles.claimBackdrop}>
          <h2 id={headingId}>已获得 <strong>{STARTER_COIN_REWARDS[claimedTrack].coins}</strong> 金币</h2>
          <p>{trackNames[claimedTrack]}奖励已入账</p>
          <div className={styles.claimArt} aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}images/welfare/coin-purse-vermilion.webp`} alt="" width="544" height="363" />
            {fallingCoins.map(({ x, drift, delay, size, tilt }) => (
              <span key={x} className={styles.fallingCoin} style={{
                left: `${x}%`, width: size, animationDelay: `${delay}ms`,
                '--coin-drift': `${drift}px`, '--coin-tilt': `${tilt}deg`,
              } as CSSProperties}>✦</span>
            ))}
          </div>
          <button className={styles.claimDone} type="button" onClick={closeClaim}>收下金币</button>
          <button className={styles.claimClose} type="button" onClick={closeClaim} aria-label="关闭领取结果"><X size={20} aria-hidden="true" /></button>
        </Modal>
      )}

      {rulesOpen && (
        <Modal labelId={headingId} onClose={() => setRulesOpen(false)} className={styles.sheet} backdropClassName={styles.backdrop}>
          <header className={styles.sheetHeader}><h2 id={headingId}>活动规则</h2><button type="button" onClick={() => setRulesOpen(false)} aria-label="关闭活动规则"><X size={21} aria-hidden="true" /></button></header>
          <ol className={styles.rules}>
            <li>
              <strong>里程奖励。</strong>以运动设备记录的有效里程为准。
              当日累计达到 {MILEAGE_REWARDS.map(({ goal, coins }) => `${goal} 公里奖励 ${coins} 金币`).join('、')}。
            </li>
            <li>
              <strong>路线通关奖励。</strong>完整播放一条路线的视频至结束即为通关，提前退出不计。
              同一路线当天只计一次，次日可重新计入。
              当天通关不同路线，{ROUTE_REWARDS.map(({ goal, coins }) => `第 ${goal} 条奖励 ${coins} 金币`).join('、')}。
            </li>
            <li>
              <strong>奖励结算。</strong>里程和通关奖励可叠加，达标后在结算时自动入账，每档每天只发放一次。
              每人每天最多获得 {DAILY_COIN_CAP} 金币。每日任务于北京时间 0 点重置，已入账金币继续保留。
            </li>
            <li>
              <strong>兑换与提现。</strong>{numberFormat.format(COINS_PER_YUAN)} 金币固定兑换 ¥1。
              微信钱包提现可选 {WITHDRAWAL_TIERS.map(amount => `¥${amount}`).join('、')} 或自定义金额。
              提现金额不得超过可提现余额，提交申请后 1–3 个工作日内到账。
            </li>
          </ol>
        </Modal>
      )}
    </>
  );
}
