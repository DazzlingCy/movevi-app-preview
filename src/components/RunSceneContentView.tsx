import type { CSSProperties, ReactNode } from 'react';
import { getSceneContentRoute, runSceneImage, type RunScene, type SceneContent } from '../journey/runScenes';
import type { JourneyRoute } from '../journey/types';
import RouteCardRail from './RouteCardRail';
import styles from './DailyRouteRecommendationsView.module.css';

interface Props {
  scene: RunScene;
  homeControls: ReactNode;
  routeIndex: number;
  onRouteIndexChange: (index: number) => void;
  onOpenRunScenes: () => void;
  onRouteClick: (entry: SceneContent, route: JourneyRoute, position: number) => void;
}

export default function RunSceneContentView({ scene, homeControls, routeIndex, onRouteIndexChange, onOpenRunScenes, onRouteClick }: Props) {
  const backdropStyle = { '--scene-background-hue': scene.backdropHue } as CSSProperties;
  const cards = scene.entries.map((entry, index) => {
    const route = getSceneContentRoute(entry);
    if (!route) return null;
    return (
      <article key={entry.image} className={styles.route + ' ' + styles.featured + ' ' + styles.sceneCard}>
        <span className={styles.cover}>
          <img className={styles.image} src={runSceneImage(entry)} alt="" width="550" height="960" decoding="async"
            loading={Math.abs(index - routeIndex) <= 1 ? 'eager' : 'lazy'} fetchPriority={index === routeIndex ? 'high' : 'low'} />
        </span>
        <span className={styles.routeType + ' ' + styles.sceneType}>{scene.label}</span>
        <span className={styles.routeBody}>
          <strong>{entry.title}</strong>
          <span className={styles.landmarks}>{route.name.replace(/\s*·\s*/, ' · ')}</span>
        </span>
        <span className={styles.metrics}>{route.distanceKm.toFixed(1)} km · 约 {route.durationMinutes} 分钟</span>
        <button className={styles.action} type="button" onClick={() => onRouteClick(entry, route, index)} aria-label={`查看${entry.title}路线`}>查看路线</button>
      </article>
    );
  });

  return (
    <main className={styles.page + ' ' + styles.sceneHome} style={backdropStyle} id="main-content">
      <header className={styles.homeBar}>{homeControls}</header>
      <div className={styles.content}>
        <header className={styles.listHeader}><h1>{scene.label}</h1></header>
        <div key={scene.id} className={styles.sceneRail} aria-label={scene.label + '场景'}>
          <RouteCardRail items={cards} initialIndex={routeIndex} onSelect={onRouteIndexChange} onSwipePastStart={onOpenRunScenes} />
        </div>
      </div>
    </main>
  );
}

