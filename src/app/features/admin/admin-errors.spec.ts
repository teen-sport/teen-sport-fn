import { ApiError } from '../../Core/Models/api-error';
import { adminErrorMessage, friendlyError } from './admin-errors';

function apiError(code: ApiError['code'], message = 'Mensaje del servidor'): ApiError {
  return { timestamp: '', status: 409, code, message, details: [], path: '' };
}

describe('adminErrorMessage', () => {
  it.each([
    ['DISCIPLINE_HAS_ACTIVE_GROUPS', 'grupos activos'],
    ['GROUP_HAS_ACTIVITY', 'inscripciones vigentes'],
    ['COACH_HAS_ACTIVE_GROUPS', 'grupos activos'],
    ['SCHEDULE_CONFLICT', 'se cruza'],
    ['CAPACITY_BELOW_OCCUPIED', 'cupos'],
  ] as const)('explains %s in Spanish', (code, fragment) => {
    expect(adminErrorMessage(apiError(code))).toContain(fragment);
  });

  it('decides by code, not by the server text', () => {
    expect(adminErrorMessage(apiError('DUPLICATE_DISCIPLINE', 'cualquier texto'))).toBe(
      'Ya existe una disciplina con ese nombre.',
    );
  });

  it('falls back to the server message for codes without its own text', () => {
    expect(adminErrorMessage(apiError('INTERNAL_ERROR', 'Falla interna'))).toBe('Falla interna');
  });

  it('keeps every other field of the error when it only swaps the message', () => {
    const original = apiError('INVALID_COACH', 'x');
    expect(friendlyError(original)).toEqual({
      ...original,
      message: 'El entrenador debe estar activo.',
    });
  });
});
