import {
  AttendanceRecord,
  AttendanceRoster,
  AttendanceRosterEntry,
  TrainingSession,
} from '../app/features/attendance/attendance.models';

/** Sesión tal como la devuelve GET /sessions. Por defecto, la del martes 10 de noviembre de 2026. */
export function trainingSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 31,
    group: { id: 4, name: 'Sub-15 A' },
    discipline: { id: 2, name: 'Fútbol' },
    coach: { id: 5, fullName: 'Carlos Ruiz' },
    date: '2026-11-10',
    startTime: '16:00',
    endTime: '17:30',
    status: 'SCHEDULED',
    attendanceRecorded: false,
    notes: null,
    ...overrides,
  };
}

export function rosterEntry(overrides: Partial<AttendanceRosterEntry> = {}): AttendanceRosterEntry {
  return {
    athleteId: 1,
    firstNames: 'Sofía',
    lastNames: 'Pérez',
    age: 14,
    guardian: { firstNames: 'Marta', lastNames: 'Gómez', phone: '3001234567' },
    status: null,
    ...overrides,
  };
}

/** Lista de asistencia de la sesión 31 con tres deportistas sin marcar. */
export function attendanceRoster(overrides: Partial<AttendanceRoster> = {}): AttendanceRoster {
  return {
    sessionId: 31,
    group: { id: 4, name: 'Sub-15 A' },
    date: '2026-11-10',
    status: 'SCHEDULED',
    attendanceRecorded: false,
    records: [
      rosterEntry({ athleteId: 1, firstNames: 'Sofía', lastNames: 'Pérez' }),
      rosterEntry({ athleteId: 2, firstNames: 'Juan', lastNames: 'Quintero' }),
      rosterEntry({ athleteId: 3, firstNames: 'Valeria', lastNames: 'Ramírez' }),
    ],
    ...overrides,
  };
}

/** Marca del historial (A9). Por defecto, Sofía Pérez presente el martes 10 de noviembre de 2026. */
export function attendanceRecord(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: 1,
    sessionId: 31,
    date: '2026-11-10',
    group: { id: 4, name: 'Sub-15 A' },
    discipline: { id: 2, name: 'Fútbol' },
    athlete: { id: 1, firstNames: 'Sofía', lastNames: 'Pérez' },
    status: 'PRESENT',
    recordedAt: '2026-11-10T22:30:00Z',
    ...overrides,
  };
}
