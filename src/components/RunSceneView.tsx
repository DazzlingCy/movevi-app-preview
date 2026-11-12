import { useLayoutEffect, useRef } from 'react';
import {
  Activity, AlarmClock, BatteryCharging, Building2, CalendarDays, Check,
  CircleDashed, Clock3, CloudRain, CloudSun, Coffee, Droplets, Flame, Footprints, Gauge, Headphones,
  GalleryHorizontalEnd, HeartPulse, House, Landmark, Leaf, Moon, MoonStar, Mountain, MountainSnow,
  Podcast, Route, Signpost, Smile, Snowflake, Sun, Sunrise, Sunset, Target, TimerReset,
  UsersRound, Waves, Wind, Zap, Trees, type LucideIcon,
} from 'lucide-react';
import { CITY_CARD_MODE_LABEL, QUICK_RUN_SCENES, RUN_SCENE_GROUPS, type RunScene } from '../journey/runScenes';
import styles from './RunSceneView.module.css';

const groupIcons = { time: Clock3, outdoors: Mountain, indoors: House, training: Activity, mood: Smile, company: UsersRound };

const sceneIcons = {
  morning: Coffee, sunrise: Sunrise, alarm: AlarmClock, sun: Sun, sunset: Sunset, moon: Moon, night: MoonStar,
  flame: Flame, weekend: CalendarDays, river: Waves, trees: Trees, lake: Droplets,
  mountain: MountainSnow, wind: Wind, track: CircleDashed, city: Building2, rain: CloudRain, leaf: Leaf,
  trail: Signpost, heritage: Landmark, home: House, interval: TimerReset, steps: Footprints, pulse: HeartPulse,
  snow: Snowflake, speed: Zap, distance: Route, pace: Gauge, target: Target,
  clear: CloudSun, smile: Smile, battery: BatteryCharging,
  audio: Headphones, friends: UsersRound, podcast: Podcast,
} satisfies Record<(typeof RUN_SCENE_GROUPS)[number]['scenes'][number]['symbol'] | (typeof QUICK_RUN_SCENES)[number]['symbol'], LucideIcon>;

interface Props {
  selection: RunScene | null;
  onSelect: (scene: RunScene | null) => void;
  onClose: () => void;
}

export default function RunSceneView({ selection, onSelect, onClose }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const swipeDismissed = useRef(false);
  useLayoutEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  return (
    <div id="run-scene-content" className={styles.page} role="dialog" aria-modal="true" aria-labelledby="run-scene-title"
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
          <p>今天想怎么跑？</p>
        </header>
        <div className={styles.scroll}>
          <section className={styles.quickSection} aria-labelledby="run-scene-quick">
            <h2 id="run-scene-quick">常用场景</h2>
            <div className={styles.quick}>
              <button className={styles.cityMode} type="button" aria-pressed={selection === null} aria-description="按城市浏览跑步路线" onClick={() => onSelect(null)}>
                <GalleryHorizontalEnd size={20} strokeWidth={2} aria-hidden="true" />
                <span>{CITY_CARD_MODE_LABEL}</span>
                {selection === null && <Check className={styles.quickCheck} size={16} aria-hidden="true" />}
              </button>
              {QUICK_RUN_SCENES.map(scene => {
                const Icon = sceneIcons[scene.symbol];
                const active = selection === scene;
                return <button key={scene.label} type="button" aria-pressed={active} aria-description={`目标 ${scene.targetMinutes} 分钟，${scene.speedPlan}`} onClick={() => onSelect(scene)}>
                  <Icon size={19} strokeWidth={2} aria-hidden="true" />
                  <span>{scene.label}</span>
                  {active && <Check className={styles.quickCheck} size={16} aria-hidden="true" />}
                </button>;
              })}
            </div>
          </section>
          <div className={styles.catalog}>
            {RUN_SCENE_GROUPS.map(group => {
              const GroupIcon = groupIcons[group.id];
              return <section key={group.id} className={styles.group} aria-labelledby={`run-scene-${group.id}`}>
                <div className={styles.groupHeading}>
                  <GroupIcon size={14} strokeWidth={1.8} aria-hidden="true" />
                  <h2 id={`run-scene-${group.id}`}>{group.title}</h2>
                </div>
                <div className={styles.tags}>
                  {group.scenes.map(scene => {
                    const Icon = sceneIcons[scene.symbol];
                    return <button key={scene.label} type="button" aria-pressed={selection === scene} onClick={() => onSelect(scene)}>
                      <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
                      <span>{scene.label}</span>
                    </button>;
                  })}
                </div>
              </section>;
            })}
          </div>
        </div>
      </div>
      <button className={styles.dismissArea} type="button" onClick={onClose} aria-label="收起跑步模式" />
    </div>
  );
}
