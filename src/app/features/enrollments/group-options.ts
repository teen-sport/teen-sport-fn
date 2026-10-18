import { GroupAvailability } from '../catalog/catalog.models';

/** «Sin cupos», «1 cupo libre», «5 cupos libres». */
export function spotsLabel(availableSpots: number): string {
  if (availableSpots <= 0) {
    return 'sin cupos';
  }
  return availableSpots === 1 ? '1 cupo libre' : `${availableSpots} cupos libres`;
}

/** El texto de un grupo en las listas de elegir grupo: «Fútbol sub-15 · 5 cupos libres». */
export function groupOptionLabel(group: GroupAvailability): string {
  return `${group.groupName} · ${spotsLabel(group.availableSpots)}`;
}
