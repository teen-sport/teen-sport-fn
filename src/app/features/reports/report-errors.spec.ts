import { apiError } from '../../../testing/auth-fixtures';
import { reportErrorMessage } from './report-errors';

describe('reportErrorMessage', () => {
  it.each([
    ['ACCESS_DENIED', 'No tienes acceso'],
    ['NOT_FOUND', 'No encontramos ese deportista'],
    ['INVALID_DATE_RANGE', 'rango de fechas'],
    ['VALIDATION_ERROR', 'Revisa los datos'],
  ] as const)('explains %s in Spanish', (code, text) => {
    expect(reportErrorMessage(apiError({ code, message: 'server text' }))).toContain(text);
  });

  it('uses the text of the server when there is no own message for the code', () => {
    expect(reportErrorMessage(apiError({ code: 'INTERNAL_ERROR', message: 'Falla' }))).toBe(
      'Falla',
    );
  });
});
