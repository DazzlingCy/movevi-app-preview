import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { getRouteCategory } from '../data/routeCategories';
import { getRouteCover } from '../data/routeCovers';
import type { DailyRouteRecommendation } from '../journey/routeRecommendations';
import type { RunScene } from '../journey/runScenes';
import type { JourneyCity, JourneyRoute } from '../journey/types';
import { resolveRecommendationCover } from '../lib/localImages';
import CityImage from './CityImage';
import RouteCardRail from './RouteCardRail';
import StickyHeroNav, { HeroBackButton } from './StickyHeroNav';
import treadmillCover from './run-scene-treadmill.svg';
import styles from './DailyRouteRecommendationsView.module.css';

type Props = {
  cityImageFor: (city: JourneyCity) => string;
  recommendations: DailyRouteRecommendation[];
  onRouteClick: (route: JourneyRoute, position: number) => void;
} & (
  | { day: string; onBack: () => void; scrollTop: number; scene?: never; homeControls?: never; routeIndex?: never; onRouteIndexChange?: never; onOpenRunScenes?: never }
  | { scene: RunScene; homeControls: ReactNode; routeIndex: number; onRouteIndexChange: (index: number) => void; onOpenRunScenes: () => void; day?: never; onBack?: never; scrollTop?: never }
);

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'UTC',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

function getSceneBackdropStyle(scene: RunScene): CSSProperties {
  const { backdrop, backdropHue } = scene;
  const image = backdrop === 'treadmill' ? treadmillCover
    : resolveRecommendationCover(getRouteCover(...backdrop)?.src, 'feature');
  return {
    '--scene-background-hue': backdropHue,
    '--scene-background-image': image ? `url("${image}")` : 'none',
  } as CSSProperties;
}

export default function DailyRouteRecommendationsView({ cityImageFor, day, scene, homeControls, recommendations, routeIndex, onRouteIndexChange, onOpenRunScenes, scrollTop, onBack, onRouteClick }: Props) {
  const pageRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (pageRef.current) pageRef.current.scrollTop = scrollTop ?? 0;
  }, [scene, scrollTop]);

  const isScene = scene !== undefined;
  const backdropStyle = scene && getSceneBackdropStyle(scene);
  const priorityIndex = routeIndex ?? 0;
  const cards = recommendations.map(({ city, route }, index) => {
    const featured = isScene || index === 0;
    const category = getRouteCategory(city.name, route.order);
    const cover = getRouteCover(city.name, route.order)?.src;
    return (
      <button type="button" className={`${styles.route}${featured ? ` ${styles.featured}` : ''}`} onClick={() => onRouteClick(route, isScene ? index : (pageRef.current?.scrollTop ?? 0))}>
        <span className={styles.cover}>
          <CityImage
            className={styles.image}
            src={cover ?? cityImageFor(city)}
            optimizedSrc={resolveRecommendationCover(cover, featured ? 'feature' : 'thumbnail')}
            alt=""
            fallbackLabel={route.landmarks[0]}
            loading={(isScene ? Math.abs(index - priorityIndex) <= 1 : index < 3) ? 'eager' : 'lazy'}
            fetchPriority={index === priorityIndex ? 'high' : 'low'}
          />
        </span>
        {isScene ? (
          <span className={`${styles.routeType} ${styles.sceneType}`}>{category}</span>
        ) : index === 0 && <span className={styles.kicker}>今日精选</span>}
        <span className={styles.routeBody}>
          <span className={styles.routeMeta}>
            {city.name}
            {!isScene && <span className={styles.routeType}>{category}</span>}
          </span>
          <strong>{isScene ? route.name.replace('·', '') : route.name}</strong>
          {featured && <span className={styles.landmarks}>{route.landmarks.join(' · ')}</span>}
        </span>
        <span className={styles.metrics}>{route.distanceKm.toFixed(1)} km · 约 {route.durationMinutes} 分钟</span>
        <span className={styles.action}>{featured ? '查看路线' : '查看'}</span>
      </button>
    );
  });

  return (
    <main ref={pageRef} className={isScene ? `${styles.page} ${styles.sceneHome}` : styles.page} style={backdropStyle} id="main-content">
      {scene ? <header className={styles.homeBar}>{homeControls}</header> : (
        <StickyHeroNav overlapHero={false}>
          <HeroBackButton label="返回首页" onClick={onBack} />
        </StickyHeroNav>
      )}
      <div className={styles.content}>
        <header className={styles.listHeader}>
          <h1>{scene?.label ?? '每日推荐'}</h1>
          {day && <time dateTime={day}>{dateFormatter.format(new Date(day))}</time>}
        </header>
        {scene && (
          <p className={styles.scenePlan}>目标 {scene.targetMinutes} 分钟 <span aria-hidden="true">·</span> {scene.speedPlan}</p>
        )}
        {!cards.length ? <p className={styles.empty}>{isScene ? '暂无可跑路线' : '今日暂无推荐路线'}</p> : scene ? (
          <div key={`routes-${scene.label}`} className={styles.sceneRail} aria-label="场景推荐路线">
            <RouteCardRail items={cards} initialIndex={routeIndex} onSelect={onRouteIndexChange} onSwipePastStart={onOpenRunScenes} />
          </div>
        ) : (
          <ul className={styles.routes} aria-label="每日推荐路线">
            {cards.map((card, index) => <li key={recommendations[index].route.id}>{card}</li>)}
          </ul>
        )}
      </div>
    </main>
  );
}
