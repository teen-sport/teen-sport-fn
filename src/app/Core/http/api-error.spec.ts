import { HttpErrorResponse } from '@angular/common/http';
import { apiError } from '../../../testing/auth-fixtures';
import { toApiError } from './api-error';

describe('toApiError', () => {
  it('keeps the body sent by the API', () => {
    const body = apiError({
      code: 'INVALID_CREDENTIALS',
      status: 401,
      message: 'Correo o contraseña incorrectos.',
    });
    const result = toApiError(new HttpErrorResponse({ status: 401, error: body }));
    expect(result.code).toBe('INVALID_CREDENTIALS');
    expect(result.message).toBe('Correo o contraseña incorrectos.');
  });

  it('reports a network failure when there is no response', () => {
    const result = toApiError(new HttpErrorResponse({ status: 0 }));
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.message).toContain('No se pudo conectar con el servidor');
  });

  it('falls back to an unknown error for bodies outside the contract', () => {
    const result = toApiError(new HttpErrorResponse({ status: 502, error: '<html></html>' }));
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toContain('error inesperado');
    expect(toApiError(new Error('boom')).code).toBe('UNKNOWN_ERROR');
  });
});
