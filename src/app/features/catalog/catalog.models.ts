import { EntityStatus } from '../../Core/Models/role';
import { IdName, PersonRef, Schedule } from '../../Core/Models/common';

/** Disciplina del catálogo (GET /disciplines). Quien no es administrador solo recibe las activas. */
export interface Discipline {
  id: number;
  name: string;
  description?: string | null;
  /** Mensualidad en pesos colombianos. */
  monthlyFee: number;
  status: EntityStatus;
}

/** Disciplina con su mensualidad, dentro de la disponibilidad de un grupo. */
export interface DisciplineFee extends IdName {
  monthlyFee: number;
}

/** Un grupo con sus cupos en un mes (GET /availability). */
export interface GroupAvailability {
  groupId: number;
  groupName: string;
  discipline: DisciplineFee;
  coach: PersonRef;
  schedules: Schedule[];
  maxCapacity: number;
  occupiedSpots: number;
  /** Cupos que todavía se pueden reservar desde ese mes. */
  availableSpots: number;
}
