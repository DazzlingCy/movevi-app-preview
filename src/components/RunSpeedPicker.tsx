import { useId, useState, type ReactNode } from 'react';
import { Activity, Gauge, Minus, Plus, X } from 'lucide-react';
import { RUN_SPEED_LIMITS, type RunSpeed } from '../journey/runSpeed';
import Modal from './journey/Modal';
import styles from './RunSpeedPicker.module.css';

interface StartProps {
  onClose: () => void;
  onConfirm: (speed: RunSpeed) => void;
  smartSpeedDescription?: string;
}
const quickSpeeds = [1, 2, 3, 4, 5, 6];

function SpeedDialog({ title, drawer = false, onClose, children }: {
  title: string;
  drawer?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <Modal labelId={titleId} onClose={onClose} className={`${styles.sheet} ${drawer ? styles.adjustSheet : styles.startSheet}`}
      backdropClassName={drawer ? styles.adjustBackdrop : styles.startBackdrop}>
      <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" className={styles.close} aria-label="关闭速度选择" onClick={onClose}><X size={19} aria-hidden="true" /></button>
      </header>
      {children}
    </Modal>
  );
}
export default function RunSpeedPicker({ onClose, onConfirm, smartSpeedDescription = '按路线节奏自动调速' }: StartProps) {
  const [mode, setMode] = useState<RunSpeed['mode']>('custom');

  return (
    <SpeedDialog title="选择跑步速度" onClose={onClose}>
      <form onSubmit={event => {
        event.preventDefault();
        onConfirm(mode === 'smart' ? { mode } : { mode, kmh: RUN_SPEED_LIMITS.initial });
      }}>
        <div className={styles.options} role="group" aria-label="速度方式">
          <button type="button" aria-pressed={mode === 'custom'} onClick={() => setMode('custom')}>
            <span className={styles.optionIcon} aria-hidden="true"><Gauge size={20} /></span>
            <span><strong>自定义速度</strong><small>跑步中手动调速</small></span>
          </button>
          <button type="button" aria-pressed={mode === 'smart'} onClick={() => setMode('smart')}>
            <span className={styles.optionIcon} aria-hidden="true"><Activity size={20} /></span>
            <span><strong>智能变速</strong><small>{smartSpeedDescription}</small></span>
          </button>
        </div>
        <button type="submit" className={styles.confirm}>确认开跑</button>
      </form>
    </SpeedDialog>
  );
}

export function RunSpeedDrawer({ currentKmh, onClose, onSpeedChange }: {
  currentKmh: number;
  onClose: () => void;
  onSpeedChange: (kmh: number) => void;
}) {
  const rangeId = useId();
  const [draft, setDraft] = useState<string>();
  const { min, max } = RUN_SPEED_LIMITS;
  const draftKmh = Number(draft);
  const invalid = draft !== undefined && !(draftKmh >= min && draftKmh <= max);
  const commitSpeed = () => {
    if (draft === undefined) return;
    setDraft(undefined);
    if (!invalid && draftKmh !== currentKmh) onSpeedChange(draftKmh);
  };
  const stepSpeed = (delta: number) => {
    const next = Math.round((currentKmh + delta) * 10) / 10;
    onSpeedChange(Math.max(min, Math.min(max, next)));
  };

  return (
    <SpeedDialog title="调整跑步速度" drawer onClose={() => { commitSpeed(); onClose(); }}>
      <div className={styles.stepper}>
        <button type="button" aria-label="减速" disabled={currentKmh <= min} onClick={() => stepSpeed(-.1)}>
          <Minus size={22} aria-hidden="true" />
        </button>
        <div className={styles.speedValue}>
          <input type="number" inputMode="decimal" min={min} max={max} step="any" aria-label="当前速度（km/h）"
            aria-invalid={invalid || undefined} aria-describedby={invalid ? rangeId : undefined}
            value={draft ?? currentKmh.toFixed(1)} onChange={event => setDraft(event.target.value)}
            onBlur={commitSpeed} onKeyDown={event => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }} />
          <span aria-hidden="true">km/h</span>
        </div>
        <button type="button" aria-label="加速" disabled={currentKmh >= max} onClick={() => stepSpeed(.1)}>
          <Plus size={22} aria-hidden="true" />
        </button>
      </div>
      {invalid && <p className={styles.rangeHint} id={rangeId} role="status">请输入 {min}–{max} km/h</p>}
      <div className={styles.presetGroup} role="group" aria-label="快捷速度">
        <h3>快捷速度</h3>
        <div className={styles.presets}>
          {quickSpeeds.map(preset => <button key={preset} type="button" aria-label={`${preset} km/h`} aria-pressed={currentKmh === preset}
            onClick={() => onSpeedChange(preset)}>{preset}</button>)}
        </div>
      </div>
    </SpeedDialog>
  );
}
