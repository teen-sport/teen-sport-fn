import { apiError } from '../../../testing/auth-fixtures';
import { enrollmentErrorMessage } from './enrollment-errors';

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
