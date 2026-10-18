import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../Models/api-error';

const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const UNKNOWN_ERROR_MESSAGE = 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';

function isApiError(body: unknown): body is ApiError {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const candidate = body as Partial<ApiError>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    if (isApiError(error.error)) {
      return { ...error.error, details: error.error.details ?? [] };
    }
    const offline = error.status === 0;
    return {
      timestamp: new Date().toISOString(),
      status: error.status,
      code: offline ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
      message: offline ? NETWORK_ERROR_MESSAGE : UNKNOWN_ERROR_MESSAGE,
      details: [],
      path: error.url ?? '',
    };
  }
  return {
    timestamp: new Date().toISOString(),
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: UNKNOWN_ERROR_MESSAGE,
    details: [],
    path: '',
  };
}
