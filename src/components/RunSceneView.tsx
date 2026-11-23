import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Check, GalleryHorizontalEnd } from 'lucide-react';
import { CITY_CARD_MODE_LABEL, type RunSceneMode } from '../journey/runScenes';
import { RUN_SCENE_TAG_GROUPS, type RunSceneChoice } from '../journey/runSceneTags';
import { RUN_SCENE_TAG_ICONS } from './runSceneTagIcons';
import styles from './RunSceneView.module.css';

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
          <section className={styles.tagGroups} aria-label="标签分类">
            {RUN_SCENE_TAG_GROUPS.map(group => (
              <div className={styles.tagGroup} key={group.id}>
                <h2>{group.label}</h2>
                <div className={styles.tagChoices}>
                  {group.tags.map(({ key, label, mode }) => {
                    const Icon = RUN_SCENE_TAG_ICONS[key];
                    return (
                      <button key={key} type="button" aria-pressed={selection?.id === mode.id}
                        onClick={() => onSelect(mode)}>
                        {typeof Icon === 'number' ? <span className={styles.durationIcon} aria-hidden="true">{Icon}</span>
                          : <Icon size={22} aria-hidden="true" />}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
      <button className={styles.dismissArea} type="button" onClick={onClose} aria-label="收起跑步模式" />
    </div>
  );
}
