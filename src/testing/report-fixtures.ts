import {
  AthleteAttendanceReport,
  AttendanceReport,
  EnrollmentReport,
  RecurrentAbsence,
} from '../app/features/reports/report.models';

/** R3: Sofía (deportista 1) con 8 sesiones registradas: 6 presentes y 2 ausentes. */
export function athleteReport(
  overrides: Partial<AthleteAttendanceReport> = {},
): AthleteAttendanceReport {
  return {
    athleteId: 1,
    recordedSessions: 8,
    present: 6,
    absent: 2,
    attendanceRate: 75,
    byGroup: [{ groupId: 4, groupName: 'Sub-15 A', present: 6, absent: 2, attendanceRate: 75 }],
    ...overrides,
  };
}

/** R2: 20 sesiones programadas hasta hoy, 19 con asistencia (95 %). */
export function attendanceReport(overrides: Partial<AttendanceReport> = {}): AttendanceReport {
  return {
    scheduledSessions: 20,
    completedSessions: 19,
    recordingCoverage: 95,
    attendanceRate: 84.2,
    byGroup: [
      {
        groupId: 4,
        groupName: 'Sub-15 A',
        discipline: 'Fútbol',
        scheduledSessions: 12,
        completedSessions: 12,
        attendanceRate: 88.5,
      },
      {
        groupId: 9,
        groupName: 'Sub-17',
        discipline: 'Fútbol',
        scheduledSessions: 8,
        completedSessions: 7,
        attendanceRate: null,
      },
    ],
    ...overrides,
  };
}

/** R1: noviembre de 2026 con 10 solicitudes. */
export function enrollmentReport(overrides: Partial<EnrollmentReport> = {}): EnrollmentReport {
  return {
    period: '2026-11',
    totalRequests: 10,
    byStatus: { PENDING_REVIEW: 2, ACTIVE: 6, REJECTED: 1, CANCELLED: 1 },
    completionRate: 60,
    abandonmentRate: 10,
    averageConfirmationHours: 18.5,
    byDiscipline: [
      { disciplineId: 2, name: 'Fútbol', requests: 7, active: 5 },
      { disciplineId: 3, name: 'Baloncesto', requests: 3, active: 1 },
    ],
    payments: { upToDate: 4, overdue: 2 },
    ...overrides,
  };
}

/** R4: Juan Quintero con 3 ausencias seguidas en el grupo Sub-15 A. */
export function recurrentAbsence(overrides: Partial<RecurrentAbsence> = {}): RecurrentAbsence {
  return {
    athlete: { id: 2, firstNames: 'Juan', lastNames: 'Quintero' },
    group: { id: 4, name: 'Sub-15 A' },
    consecutiveAbsences: 3,
    lastAttendance: '2026-10-27',
    ...overrides,
  };
}
