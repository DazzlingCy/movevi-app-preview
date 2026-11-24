import { getJourneyCity, getJourneyRoute, hasPublishedCityRoutes } from './data';
import { RUN_SCENE_TAG_GROUPS } from './runSceneTags';
import { getSceneContentRoute, type RunSceneMode } from './runScenes';
import type { MileageRunRoute, MileageTarget } from './mileageTeams';

export const mileageModes = RUN_SCENE_TAG_GROUPS.flatMap(group =>
  group.tags.flatMap(({ mode }) => 'entries' in mode && mode.entries.some(getSceneContentRoute)
    ? [{ mode, group: group.label }] : []),
).filter(({ mode }, index, list) => list.findIndex(item => item.mode.id === mode.id) === index);

export const findMileageMode = (id: string): RunSceneMode | undefined => mileageModes.find(({ mode }) => mode.id === id)?.mode;

export function resolveMileageTarget(kind: MileageTarget['kind'], id: string): MileageTarget | undefined {
  const item = kind === 'mode' ? findMileageMode(id) : kind === 'city' && hasPublishedCityRoutes(id) ? getJourneyCity(id) : undefined;
  if (!item) return;
  return { kind, id, name: 'label' in item ? item.label : item.name };
}

export function resolveMileageRun({ cityId, routeId, modeId }: MileageRunRoute) {
  if (!modeId) return hasPublishedCityRoutes(cityId) ? getJourneyRoute(cityId, routeId) : undefined;
  return findMileageMode(modeId)?.entries.map(getSceneContentRoute).find(route => route?.cityId === cityId && route.id === routeId);
}
