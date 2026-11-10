import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { getRouteCategory } from '../data/routeCategories';
import { getRouteCover } from '../data/routeCovers';
import type { DailyRouteRecommendation } from '../journey/routeRecommendations';
import type { JourneyCity, JourneyRoute } from '../journey/types';
import { resolveRecommendationCover } from '../lib/localImages';
import CityImage from './CityImage';
import RouteCardRail from './RouteCardRail';
import StickyHeroNav, { HeroBackButton } from './StickyHeroNav';
import styles from './DailyRouteRecommendationsView.module.css';

type Props = {
  cityImageFor: (city: JourneyCity) => string;
  recommendations: DailyRouteRecommendation[];
  onRouteClick: (route: JourneyRoute, position: number) => void;
} & (
  | { day: string; onBack: () => void; scrollTop: number; sceneName?: never; homeControls?: never; routeIndex?: never; onRouteIndexChange?: never }
  | { sceneName: string; homeControls: ReactNode; routeIndex: number; onRouteIndexChange: (index: number) => void; day?: never; onBack?: never; scrollTop?: never }
);

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'UTC',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

export default function DailyRouteRecommendationsView({ cityImageFor, day, sceneName, homeControls, recommendations, routeIndex, onRouteIndexChange, scrollTop, onBack, onRouteClick }: Props) {
  const pageRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (pageRef.current) pageRef.current.scrollTop = scrollTop ?? 0;
  }, [sceneName, scrollTop]);

  const isScene = sceneName !== undefined;
  const cards = recommendations.map(({ city, route }, index) => {
    const featured = isScene || index === 0;
    return (
      <button type="button" className={`${styles.route}${featured ? ` ${styles.featured}` : ''}`} onClick={() => onRouteClick(route, isScene ? index : (pageRef.current?.scrollTop ?? 0))}>
        <span className={styles.cover}>
          <CityImage
            className={styles.image}
            src={resolveRecommendationCover(getRouteCover(city.name, route.order)?.src, featured ? 'feature' : 'thumbnail') ?? cityImageFor(city)}
            alt=""
            fallbackLabel={route.landmarks[0]}
            loading={index < (isScene ? 2 : 3) ? 'eager' : 'lazy'}
            fetchPriority={index === (routeIndex ?? 0) ? 'high' : 'low'}
          />
        </span>
        {!isScene && index === 0 && <span className={styles.kicker}>今日精选</span>}
        <span className={styles.routeBody}>
          <span className={styles.routeMeta}>
            {city.name}
            <span className={styles.routeType}>{getRouteCategory(city.name, route.order)}</span>
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
    <main ref={pageRef} className={isScene ? `${styles.page} ${styles.sceneHome}` : styles.page} id="main-content">
      {sceneName !== undefined ? <header className={styles.homeBar}>{homeControls}</header> : (
        <StickyHeroNav overlapHero={false}>
          <HeroBackButton label="返回首页" onClick={onBack} />
        </StickyHeroNav>
      )}
      <div className={styles.content}>
        <header className={styles.listHeader}>
          <h1>{sceneName ?? '每日推荐'}</h1>
          {day && <time dateTime={day}>{dateFormatter.format(new Date(day))}</time>}
        </header>
        {!cards.length ? <p className={styles.empty}>{isScene ? '暂无可跑路线' : '今日暂无推荐路线'}</p> : isScene ? (
          <div key={sceneName} className={styles.sceneRail} aria-label="场景推荐路线">
            <RouteCardRail items={cards} initialIndex={routeIndex} onSelect={onRouteIndexChange} />
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
