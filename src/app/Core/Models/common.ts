/** Tipos comunes del contrato del API que usan varios módulos. */

/** Día de la semana tal como lo envía el API. */
export type DayOfWeek =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

/** Referencia breve a un recurso con nombre (disciplina, grupo…). */
export interface IdName {
  id: number;
  name: string;
}

/** Referencia breve a una persona (por ejemplo, el entrenador de un grupo). */
export interface PersonRef {
  id: number;
  fullName: string;
}

/** Referencia breve a un deportista dentro de una inscripción o un pago. */
export interface AthleteRef {
  id: number;
  firstNames: string;
  lastNames: string;
}

/** Franja semanal de un grupo. Las horas llegan como «HH:mm». */
export interface Schedule {
  id: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}
