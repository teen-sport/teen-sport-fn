import { ApiError } from '../../Core/Models/api-error';

/**
 * Mensajes para los reportes y el historial de asistencia según el código de error del API (se
 * decide con el `code`, nunca con el texto de `message`).
 */
const MESSAGES: Partial<Record<string, string>> = {
  ACCESS_DENIED: 'No tienes acceso a esta información.',
  NOT_FOUND: 'No encontramos ese deportista.',
  INVALID_DATE_RANGE:
    'El rango de fechas no es válido. La fecha inicial no puede ser posterior a la final.',
  VALIDATION_ERROR: 'Revisa los datos del filtro e intenta de nuevo.',
};

export function reportErrorMessage(error: ApiError): string {
  return MESSAGES[error.code] ?? error.message;
}
