import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Armchair, Check, GalleryHorizontalEnd, House, TrendingUp } from 'lucide-react';
import { CITY_CARD_MODE_LABEL, type RunSceneMode } from '../journey/runScenes';
import { RUN_SCENE_SIDEBAR_TAGS, type RunSceneChoice } from '../journey/runSceneTags';
import styles from './RunSceneView.module.css';

const tagArtwork = {
  'purpose:改善久坐状态': { Icon: Armchair, cover: 'desk-break' },
  'lifestyle:周末居家': { Icon: House, cover: 'weekend-at-home' },
  'training:坡度训练': { Icon: TrendingUp, cover: 'incline-training' },
};

interface Props {
  selection: RunSceneMode | null;
  cityAccent: string;
  onSelect: (scene: RunSceneChoice | null) => void;
  onClose: () => void;
}

export default function RunSceneView({ selection, cityAccent, onSelect, onClose }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const swipeDismissed = useRef(false);
  const themeColor = selection ? `hsl(${selection.backdropHue} 50% 36%)` : cityAccent;
  useLayoutEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  return (
    <div id="run-scene-content" className={styles.page} role="dialog" aria-modal="true" aria-labelledby="run-scene-title"
      style={{ '--drawer-theme': themeColor } as CSSProperties}
      onKeyDown={event => { if (event.key === 'Escape') onClose(); }}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        swipeDismissed.current = false;
        swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerCancel={() => { swipe.current = null; }}
      onPointerUp={event => {
        const start = swipe.current;
        swipe.current = null;
        if (!start || start.id !== event.pointerId) return;
        const distance = event.clientX - start.x;
        if (distance < 64 || distance <= Math.abs(event.clientY - start.y) * 1.4) return;
        swipeDismissed.current = true;
        onClose();
      }}
      onClickCapture={event => {
        if (event.detail && swipeDismissed.current) event.stopPropagation();
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1 id="run-scene-title" ref={headingRef} tabIndex={-1}>跑步模式</h1>
        </header>
        <div className={styles.scroll}>
          <button className={styles.cityMode} type="button" aria-pressed={selection === null} aria-description="按城市浏览跑步路线" onClick={() => onSelect(null)}>
            <GalleryHorizontalEnd size={20} strokeWidth={2} aria-hidden="true" />
            <span>{CITY_CARD_MODE_LABEL}</span>
            {selection === null && <Check className={styles.quickCheck} size={16} aria-hidden="true" />}
          </button>
          <section className={styles.tagChoices} aria-label="跑步标签">
            {RUN_SCENE_SIDEBAR_TAGS.map(({ key, label, mode }) => {
              const { Icon, cover } = tagArtwork[key];
              const active = selection?.id === mode.id;
              return (
                <button key={key} className={styles.tagCard} type="button" aria-pressed={active} onClick={() => onSelect(mode)}>
                  <img className={styles.tagCover} src={`${import.meta.env.BASE_URL}images/run-scenes/mode-covers/${cover}.webp`} alt="" decoding="async" />
                  <span className={styles.tagLabel}><Icon size={19} aria-hidden="true" />{label}</span>
                  {active && <Check className={styles.tagSelection} size={24} aria-hidden="true" />}
                </button>
              );
            })}
          </section>
        </div>
      </div>
      <button className={styles.dismissArea} type="button" onClick={onClose} aria-label="收起跑步模式" />
    </div>
  );
}
