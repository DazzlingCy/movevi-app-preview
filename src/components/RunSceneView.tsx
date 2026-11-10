import { useLayoutEffect, useRef } from 'react';
import {
  Activity, AlarmClock, BatteryCharging, BriefcaseBusiness, Building2, CalendarDays, Check,
  CircleDashed, Clock3, CloudRain, CloudSun, Coffee, Droplets, Flag, Flame, Footprints, Gauge, Headphones,
  GalleryHorizontalEnd, HeartPulse, House, Landmark, Leaf, MessageCircle, Moon, MoonStar, Mountain, MountainSnow, PartyPopper,
  PawPrint, Podcast, Route, Signpost, Smile, Snowflake, Sun, Sunrise, Sunset, Target, TimerReset, Trophy,
  UsersRound, Waves, Wind, Zap, Trees, type LucideIcon,
} from 'lucide-react';
import { QUICK_RUN_SCENES, RUN_SCENE_GROUPS, type RunScene } from '../journey/runScenes';
import styles from './RunSceneView.module.css';

const groupIcons = { time: Clock3, outdoors: Mountain, indoors: House, training: Activity, mood: Smile, company: UsersRound };
const quickIcons = [Footprints, BriefcaseBusiness];
const sceneIcons = {
  morning: Coffee, sunrise: Sunrise, alarm: AlarmClock, sun: Sun, sunset: Sunset, moon: Moon, night: MoonStar,
  flame: Flame, weekend: CalendarDays, river: Waves, trees: Trees, lake: Droplets,
  mountain: MountainSnow, wind: Wind, track: CircleDashed, city: Building2, rain: CloudRain, leaf: Leaf,
  trail: Signpost, heritage: Landmark, home: House, interval: TimerReset, steps: Footprints, pulse: HeartPulse,
  snow: Snowflake, speed: Zap, distance: Route, pace: Gauge, target: Target, finish: Flag, trophy: Trophy,
  clear: CloudSun, smile: Smile, battery: BatteryCharging, dialogue: MessageCircle, celebrate: PartyPopper,
  audio: Headphones, friends: UsersRound, pet: PawPrint, podcast: Podcast,
} satisfies Record<(typeof RUN_SCENE_GROUPS)[number]['scenes'][number]['symbol'], LucideIcon>;

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
              <button className={styles.cityMode} type="button" aria-pressed={selection === null} onClick={() => onSelect(null)}>
                <span className={styles.quickIcon}><GalleryHorizontalEnd size={22} strokeWidth={1.7} aria-hidden="true" /></span>
                <span className={styles.quickCopy}><strong>城市卡片模式</strong><small>按城市浏览跑步路线</small></span>
                {selection === null && <Check className={styles.quickCheck} size={15} aria-hidden="true" />}
              </button>
              {QUICK_RUN_SCENES.map(({ scene, hint }, index) => {
                const Icon = quickIcons[index];
                const active = selection === scene;
                return <button key={scene.label} type="button" aria-pressed={active} onClick={() => onSelect(scene)}>
                  <span className={styles.quickIcon}><Icon size={18} strokeWidth={1.7} aria-hidden="true" /></span>
                  <span className={styles.quickCopy}><strong>{scene.label}</strong><small>{hint}</small></span>
                  {active && <Check className={styles.quickCheck} size={15} aria-hidden="true" />}
                </button>;
              })}
            </div>
          </section>
          {RUN_SCENE_GROUPS.map(group => {
            const GroupIcon = groupIcons[group.id];
            return <section key={group.id} className={styles.group} aria-labelledby={`run-scene-${group.id}`}>
              <div className={styles.groupHeading}>
                <GroupIcon size={15} strokeWidth={1.7} aria-hidden="true" />
                <h2 id={`run-scene-${group.id}`}>{group.title}</h2>
              </div>
              <div className={styles.tags}>
                {group.scenes.map(scene => {
                  const Icon = sceneIcons[scene.symbol];
                  return <button key={scene.label} type="button" aria-pressed={selection === scene} onClick={() => onSelect(scene)}>
                    <Icon size={19} strokeWidth={1.65} aria-hidden="true" />
                    <span>{scene.label}</span>
                  </button>;
                })}
              </div>
            </section>;
          })}
        </div>
      </div>
      <button className={styles.dismissArea} type="button" onClick={onClose} aria-label="收起跑步模式" />
    </div>
  );
}
