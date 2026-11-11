import { apiError } from '../../../testing/auth-fixtures';
import {
  attendanceErrorMessage,
  friendlySessionError,
  ROSTER_CHANGED_CODES,
} from './attendance-errors';

describe('attendanceErrorMessage', () => {
  it.each([
    ['ACCESS_DENIED', 'no es de uno de tus grupos'],
    ['FUTURE_SESSION', 'desde el día de la sesión'],
    ['SESSION_CANCELLED', 'está cancelada'],
    ['INCOMPLETE_ATTENDANCE', 'sin marcar'],
    ['ATHLETE_NOT_IN_ROSTER', 'ya no está'],
    ['GROUP_INACTIVE', 'grupo está inactivo'],
    ['GROUP_WITHOUT_SCHEDULES', 'no tiene horarios'],
    ['DATE_IN_PAST', 'anterior a hoy'],
    ['INVALID_TIME_RANGE', 'hora de fin'],
    ['DUPLICATE_SESSION', 'misma fecha y hora'],
    ['INVALID_STATE', 'están programadas'],
  ] as const)('explains %s in Spanish', (code, text) => {
    expect(attendanceErrorMessage(apiError({ code, message: 'server text' }))).toContain(text);
  });

  it('uses the text of the server when there is no own message for the code', () => {
    expect(attendanceErrorMessage(apiError({ code: 'INTERNAL_ERROR', message: 'Falla' }))).toBe(
      'Falla',
    );
  });

  it('knows which errors mean that the roster changed', () => {
    expect(ROSTER_CHANGED_CODES).toEqual(['INCOMPLETE_ATTENDANCE', 'ATHLETE_NOT_IN_ROSTER']);
  });

  it('puts the own message inside the error so it can be shown next to a field', () => {
    const error = apiError({ code: 'DUPLICATE_SESSION', message: 'server text' });
    expect(friendlySessionError(error)).toEqual({
      ...error,
      message: attendanceErrorMessage(error),
    });
  });
});
