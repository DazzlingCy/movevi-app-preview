import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, Info, Medal, Trophy } from 'lucide-react';
import Modal from './journey/Modal';
import styles from './MedalLotteryView.module.css';

interface MedalLotteryViewProps {
  tickets: number;
  onBack: () => void;
  onGoRun: () => void;
  onDraw: () => { success: boolean; message: string; amount?: string };
}

const rewardItems = [
  { level: '一等奖', amount: '2.66 元', count: '50 份' },
  { level: '二等奖', amount: '1.66 元', count: '50 份' },
  { level: '三等奖', amount: '6 分', count: '50 份' },
  { level: '四等奖', amount: '2.66 元', count: '50 份' },
  { level: '五等奖', amount: '1.66 元', count: '50 份' },
  { level: '六等奖', amount: '6 分', count: '50 份' },
];

const stepItems = [
  { label: '完成路线', description: '跑完一条路线获得勋章', action: '去跑步' },
  { label: '兑换机会', description: '使用勋章盲盒券兑换抽奖机会', action: '兑换抽奖' },
  { label: '抽取奖励', description: '消耗抽奖机会抽取现金奖励', action: '去抽奖' },
  { label: '奖励提现', description: '中奖后前往小程序完成提现', action: '去提现' },
];

export default function MedalLotteryView({ tickets, onBack, onGoRun, onDraw }: MedalLotteryViewProps) {
  const [toast, setToast] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const headingId = useId();
  const remainingPool = 999;

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = (message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  };

  const handleDraw = () => {
    const response = onDraw();
    if (response.success && response.amount) setResult(response.amount);
    showToast(response.message);
  };
  const stepActions = [onGoRun, undefined, handleDraw, () => showToast('请在木卫六小程序完成提现')];

  return (
    <div className={styles.page}>
      <div className={styles.screen} inert={result !== null}>
        <header className={styles.nav}>
          <button type="button" className={styles.iconButton} onClick={onBack} aria-label="返回福利">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <h1>勋章抽奖</h1>
          <button type="button" className={styles.iconButton} aria-label="活动说明">
            <Info size={19} aria-hidden="true" />
          </button>
        </header>

        <main className={styles.scroll} id="main-content">
          <section className={styles.hero} aria-labelledby={`${headingId}-event`}>
            <div className={styles.heroIntro}>
              <div>
                <h2 id={`${headingId}-event`}>跑遍全世界<span>勋章盲盒</span></h2>
                <p>完成路线获得勋章，兑换机会抽现金红包。</p>
              </div>
              <div className={styles.emblem} aria-hidden="true"><Medal size={41} strokeWidth={1.55} /></div>
            </div>

            <dl className={styles.stats}>
              <div className={styles.ticketBalance}><dt>我的抽奖券</dt><dd>{tickets.toLocaleString('zh-CN')} <small>张</small></dd></div>
              <div><dt>报名人数</dt><dd>1,237</dd></div>
              <div><dt>剩余红包</dt><dd>{remainingPool}</dd></div>
            </dl>

            <div className={styles.actions}>
              <button type="button" className={styles.secondary}>兑换抽奖</button>
              <button type="button" className={styles.primary} onClick={handleDraw}>立即抽奖</button>
            </div>
          </section>

          <section className={styles.schedule} aria-label="活动时间">
            <CalendarDays size={20} aria-hidden="true" />
            <div>
              <h2>第 16 期 <span>2025/09/01 – 2025/09/30</span></h2>
              <p>下期于本期结束后 1–3 个工作日开放</p>
            </div>
          </section>

          <section className={styles.details} aria-labelledby={`${headingId}-steps`}>
            <h2 id={`${headingId}-steps`}>参与步骤</h2>
            <ol className={styles.steps}>
              {stepItems.map(({ label, description, action }, index) => (
                <li key={label}>
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <div><h3>{label}</h3><p>{description}</p></div>
                  <button type="button" className={styles.textButton} onClick={stepActions[index]}>{action}</button>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.details} aria-labelledby={`${headingId}-rules`}>
            <h2 id={`${headingId}-rules`}>参与规则</h2>
            <p className={styles.poolSummary}>完成路线获得勋章，使用勋章兑换抽奖机会。</p>
          </section>

          <section className={styles.details} aria-labelledby={`${headingId}-pool`}>
            <div className={styles.sectionHeading}>
              <h2 id={`${headingId}-pool`}>第 16 期奖池</h2>
              <button type="button" className={styles.textButton}>往期奖励</button>
            </div>
            <p className={styles.poolSummary}>共 1,000 份红包，剩余 {remainingPool} 份</p>
          </section>

          <section className={styles.details} aria-labelledby={`${headingId}-prizes`}>
            <div className={styles.sectionHeading}>
              <h2 id={`${headingId}-prizes`}>第 16 期奖励</h2>
              <button type="button" className={styles.textButton}>中奖概率</button>
            </div>
            <table className={styles.prizes}>
              <thead><tr><th scope="col">奖项</th><th scope="col">金额</th><th scope="col">份数</th></tr></thead>
              <tbody>
                {rewardItems.map(({ level, amount, count }) => (
                  <tr key={level}><th scope="row">{level}</th><td>{amount}</td><td>{count}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>

      {result && (
        <Modal labelId={`${headingId}-result`} onClose={() => setResult(null)} className={`${styles.dialog} ${styles.result}`} backdropClassName={styles.backdrop}>
          <Trophy size={32} aria-hidden="true" />
          <h2 id={`${headingId}-result`}>恭喜抽中</h2>
          <strong>{result}</strong>
          <button type="button" className={styles.primary} onClick={() => setResult(null)}>收下奖励</button>
        </Modal>
      )}
      {toast && <p className={styles.toast} role="status">{toast}</p>}
    </div>
  );
}
