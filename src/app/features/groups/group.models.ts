import { EntityStatus } from '../../Core/Models/role';
import { DayOfWeek, IdName, PersonRef, Schedule } from '../../Core/Models/common';

/** Grupo con sus horarios (GET /groups, para el administrador). */
export interface Group {
  id: number;
  name: string;
  discipline: IdName;
  coach: PersonRef;
  /** Entre 1 y 15 deportistas. */
  maxCapacity: number;
  status: EntityStatus;
  schedules: Schedule[];
}

/** Filtros del listado de grupos. */
export interface GroupQuery {
  disciplineId?: number | null;
  coachId?: number | null;
  status?: EntityStatus | null;
}

/** Cuerpo de POST /groups. El grupo nace activo y sin horarios. */
export interface CreateGroupRequest {
  disciplineId: number;
  coachId: number;
  name: string;
  maxCapacity: number;
}

/** Cuerpo de PUT /groups/{id}. */
export interface UpdateGroupRequest {
  name: string;
  maxCapacity: number;
}

/** Cuerpo de POST /groups/{id}/schedules y PUT /schedules/{id}. Las horas van como «HH:mm». */
export interface ScheduleRequest {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export const MAX_GROUP_CAPACITY = 15;

export type { Schedule };
