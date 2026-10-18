import { apiError } from '../../../testing/auth-fixtures';
import { adminEnrollmentErrorMessage, enrollmentErrorMessage } from './enrollment-errors';

describe('enrollmentErrorMessage', () => {
  it.each([
    ['DUPLICATE_ENROLLMENT', 'ya tiene una inscripción vigente'],
    ['NO_AVAILABLE_SPOTS', 'Ya no quedan cupos'],
    ['PERIOD_IN_PAST', 'ya pasó'],
    ['AGE_OUT_OF_RANGE', 'entre 12 y 17 años'],
    ['GROUP_INACTIVE', 'ya no está disponible'],
    ['PAYMENT_ALREADY_REGISTERED', 'ya registró un pago'],
    ['INVALID_STATE', 'ya cambió de estado'],
  ] as const)('explains %s in the words of the guardian', (code, text) => {
    expect(enrollmentErrorMessage(apiError({ code, message: 'texto del servidor' }))).toContain(
      text,
    );
  });

  it('falls back to the message of the server for any other code', () => {
    expect(
      enrollmentErrorMessage(apiError({ code: 'INTERNAL_ERROR', message: 'Error del servidor.' })),
    ).toBe('Error del servidor.');
  });

  it('uses the connection message of the client when there is no server', () => {
    expect(
      enrollmentErrorMessage(apiError({ code: 'NETWORK_ERROR', message: 'No se pudo conectar.' })),
    ).toBe('No se pudo conectar.');
  });
});

describe('adminEnrollmentErrorMessage', () => {
  it.each([
    ['NO_AVAILABLE_SPOTS', 'Elige otro grupo'],
    ['GROUP_INACTIVE', 'inactivo'],
    ['GROUP_OTHER_DISCIPLINE', 'misma disciplina'],
    ['INSUFFICIENT_AMOUNT', 'menor que la mensualidad'],
    ['FUTURE_DATE', 'posterior a hoy'],
    ['PAYMENT_ALREADY_REGISTERED', 'ya tiene un pago registrado'],
    ['USE_PAYMENT_REGISTRATION', 'se registra un pago'],
    ['NOT_FOUND', 'No se encontró'],
  ] as const)('explains %s in the words of the administrator', (code, text) => {
    expect(
      adminEnrollmentErrorMessage(apiError({ code, message: 'texto del servidor' })),
    ).toContain(text);
  });

  it('reuses the message of the guardian when the administrator has none of his own', () => {
    expect(
      adminEnrollmentErrorMessage(apiError({ code: 'INVALID_STATE', message: 'del servidor' })),
    ).toContain('ya cambió de estado');
  });

  it('falls back to the message of the server for any other code', () => {
    expect(
      adminEnrollmentErrorMessage(
        apiError({ code: 'INTERNAL_ERROR', message: 'Error del servidor.' }),
      ),
    ).toBe('Error del servidor.');
  });
});
