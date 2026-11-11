import { attendanceHistoryRoute, sessionsRoute } from './sessions-route';

describe('sessionsRoute', () => {
  it('gives each role its own sessions route', () => {
    expect(sessionsRoute('ADMIN')).toBe('/admin/sessions');
    expect(sessionsRoute('COACH')).toBe('/coach/sessions');
    expect(sessionsRoute('GUARDIAN')).toBe('/guardian/sessions');
  });

  it('falls back to the coach route when there is no role', () => {
    expect(sessionsRoute(null)).toBe('/coach/sessions');
  });
});

describe('attendanceHistoryRoute', () => {
  it('gives each role its own attendance history route', () => {
    expect(attendanceHistoryRoute('ADMIN')).toBe('/admin/attendance');
    expect(attendanceHistoryRoute('COACH')).toBe('/coach/attendance');
    expect(attendanceHistoryRoute('GUARDIAN')).toBe('/guardian/attendance');
  });
});
