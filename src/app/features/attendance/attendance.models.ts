import { AthleteRef, IdName, PersonRef } from '../../Core/Models/common';
import { AttendanceStatus, SessionStatus } from '../../Core/Models/session-status';

/** Sesión de entrenamiento tal como la devuelve GET /sessions (A3). */
export interface TrainingSession {
  id: number;
  group: IdName;
  discipline: IdName;
  coach: PersonRef;
  /** «YYYY-MM-DD» */
  date: string;
  /** «HH:mm» */
  startTime: string;
  endTime: string;
  status: SessionStatus;
  attendanceRecorded: boolean;
  /** Notas libres; en una sesión cancelada guarda el motivo de la cancelación. */
  notes?: string | null;
  /** Solo en las respuestas para el acudiente: sus deportistas que asisten a esta sesión. */
  athletes?: SessionAthlete[];
}

/** Deportista del acudiente que asiste a una sesión. */
export interface SessionAthlete {
  id: number;
  firstNames: string;
}

/** Filtros del calendario de sesiones. Las fechas son «YYYY-MM-DD» y el rango incluye los dos extremos. */
export interface SessionQuery {
  from?: string;
  to?: string;
  groupId?: number;
  status?: SessionStatus | null;
}

/** Deportista de la lista de una sesión. `status` es null mientras no se haya marcado. */
export interface AttendanceRosterEntry {
  athleteId: number;
  firstNames: string;
  lastNames: string;
  status: AttendanceStatus | null;
}

/** Lista de asistencia de una sesión (A7 y respuesta de A8). */
export interface AttendanceRoster {
  sessionId: number;
  group: IdName;
  date: string;
  status: SessionStatus;
  attendanceRecorded: boolean;
  records: AttendanceRosterEntry[];
}

/** Una marca del cuerpo de A8. */
export interface AttendanceMark {
  athleteId: number;
  status: AttendanceStatus;
}

/** Cuerpo de PUT /sessions/{id}/attendance: una marca por cada deportista de la lista. */
export interface RecordAttendanceRequest {
  records: AttendanceMark[];
}

/** Cuerpo de POST /sessions (A1): una sesión suelta, aunque no coincida con un horario del grupo. */
export interface CreateSessionRequest {
  groupId: number;
  /** «YYYY-MM-DD», no anterior a hoy. */
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

/** Cuerpo de PUT /sessions/{id} (A5): nueva fecha y horas. Las notas reemplazan a las anteriores. */
export interface UpdateSessionRequest {
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

/** Cuerpo de POST /sessions/generate (A2): crea una sesión por cada franja semanal del grupo en el rango. */
export interface GenerateSessionsRequest {
  groupId: number;
  dateFrom: string;
  dateTo: string;
  notify: boolean;
}

/** Resultado de A2: `skipped` son las que ya existían con la misma fecha y hora de inicio. */
export interface GenerateSessionsResponse {
  created: number;
  skipped: number;
  sessions: TrainingSession[];
}

/** Una marca de asistencia del historial (A9). */
export interface AttendanceRecord {
  id: number;
  sessionId: number;
  /** Fecha de la sesión, «YYYY-MM-DD». */
  date: string;
  group: IdName;
  discipline: IdName;
  athlete: AthleteRef;
  status: AttendanceStatus;
  /** Momento en que se registró (fecha y hora con zona). */
  recordedAt: string;
}

/** Filtros del historial de asistencia. Las fechas incluyen los dos extremos. */
export interface AttendanceRecordQuery {
  page?: number;
  size?: number;
  athleteId?: number;
  groupId?: number;
  from?: string;
  to?: string;
  status?: AttendanceStatus | null;
}
