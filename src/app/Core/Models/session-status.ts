/** Estado de una sesión de entrenamiento. COMPLETED y CANCELLED son finales. */
export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

/** Marca de asistencia de un deportista en una sesión. */
export type AttendanceStatus = 'PRESENT' | 'ABSENT';

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  SCHEDULED: 'Programada',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Presente',
  ABSENT: 'Ausente',
};
