import { AthleteRef, IdName } from '../../Core/Models/common';
import { EnrollmentStatus } from '../../Core/Models/enrollment-status';

/** R1: indicadores de las inscripciones de un mes. Los porcentajes llegan como 66.7, no como 0.667. */
export interface EnrollmentReport {
  /** «YYYY-MM» */
  period: string;
  totalRequests: number;
  /** Cantidad de solicitudes por estado; un estado sin solicitudes puede no venir. */
  byStatus: Partial<Record<EnrollmentStatus, number>>;
  /** Activas sobre el total de solicitudes, en porcentaje. */
  completionRate: number;
  /** Canceladas sobre el total de solicitudes, en porcentaje. */
  abandonmentRate: number;
  /** Horas promedio entre la solicitud y su confirmación; null si no hubo confirmaciones. */
  averageConfirmationHours: number | null;
  byDiscipline: EnrollmentReportDiscipline[];
  payments: { upToDate?: number; overdue?: number };
}

export interface EnrollmentReportDiscipline {
  disciplineId: number;
  name: string;
  requests: number;
  active: number;
}

/** Filtros de R2 (fechas «YYYY-MM-DD»). Sin fechas el servidor usa desde el día 1 del mes hasta hoy. */
export interface AttendanceReportQuery {
  dateFrom?: string;
  dateTo?: string;
  groupId?: number;
  disciplineId?: number;
}

/** R2: cobertura del registro de asistencia (meta de RNF-10: 90 % o más) y asistencia por grupo. */
export interface AttendanceReport {
  scheduledSessions: number;
  completedSessions: number;
  /** Realizadas sobre programadas, en porcentaje. */
  recordingCoverage: number;
  /** Presentes sobre presentes más ausentes, en porcentaje; null si no hay marcas. */
  attendanceRate: number | null;
  byGroup: AttendanceReportGroup[];
}

export interface AttendanceReportGroup {
  groupId: number;
  groupName: string;
  discipline: string;
  scheduledSessions: number;
  completedSessions: number;
  attendanceRate: number | null;
}

/** R3: asistencia de un deportista. Sin fechas abarca todo su historial. */
export interface AthleteAttendanceReport {
  athleteId: number;
  recordedSessions: number;
  present: number;
  absent: number;
  attendanceRate: number | null;
  byGroup: AthleteAttendanceGroup[];
}

export interface AthleteAttendanceGroup {
  groupId: number;
  groupName: string;
  present: number;
  absent: number;
  attendanceRate: number | null;
}

/** Filtros de R4. `minConsecutive` por omisión es 3 en el servidor. */
export interface RecurrentAbsenceQuery {
  minConsecutive?: number;
  groupId?: number;
  dateFrom?: string;
}

/** R4: deportista con varias inasistencias seguidas en su último tramo de sesiones. */
export interface RecurrentAbsence {
  athlete: AthleteRef;
  group: IdName;
  consecutiveAbsences: number;
  /** Fecha de la última vez que asistió; null si nunca asistió. */
  lastAttendance: string | null;
}

/** Meta de RNF-10: al menos este porcentaje de las sesiones debe tener la asistencia registrada. */
export const ATTENDANCE_COVERAGE_TARGET = 90;
