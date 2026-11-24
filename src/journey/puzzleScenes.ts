import { getSceneContentRoute, RUN_SCENES, runSceneImage } from './runScenes';
import type { PuzzleCity, PuzzleRoute } from './puzzleTeam';

const scenes = RUN_SCENES.map(scene => ({
  id: `scene:${scene.id}`,
  name: scene.label,
  routes: scene.entries.flatMap(entry => {
    const route = getSceneContentRoute(entry);
    return route ? [{ entry, route }] : [];
  }),
}));

export const isPuzzleScene = (id: string) => scenes.some(scene => scene.id === id);

export function getPuzzleSceneRoute({ id, routeId }: Pick<PuzzleRoute, 'id' | 'routeId'>) {
  return scenes.find(scene => scene.id === id)?.routes.find(item => item.route.id === routeId);
}

export function getPuzzleScenes() {
  const cities: PuzzleCity[] = [];
  const routes: PuzzleRoute[] = [];
  for (const scene of scenes) {
    if (!scene.routes.length) continue;
    const city = { id: scene.id, name: scene.name, image: runSceneImage(scene.routes[0].entry) };
    cities.push(city);
    for (const { route, entry } of scene.routes) {
      routes.push({
        ...city, routeId: route.id, routeIndex: route.order, title: route.name, image: runSceneImage(entry),
        distanceKm: route.distanceKm, minutes: route.durationMinutes,
      });
    }
  }
  return { cities, routes };
}
