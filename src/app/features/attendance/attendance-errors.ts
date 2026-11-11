import { ApiError } from '../../Core/Models/api-error';

/**
 * Mensajes de sesiones y asistencia según el código de error del API. Igual que en el resto de la
 * aplicación se decide con el `code`, nunca con el texto de `message`.
 */
const MESSAGES: Partial<Record<string, string>> = {
  ACCESS_DENIED: 'Esta sesión no es de uno de tus grupos.',
  NOT_FOUND: 'La sesión no existe.',
  FUTURE_SESSION: 'La asistencia se puede registrar desde el día de la sesión, no antes.',
  SESSION_CANCELLED: 'La sesión está cancelada y no admite asistencia.',
  INCOMPLETE_ATTENDANCE:
    'La lista cambió y ahora hay deportistas sin marcar. Revisa la lista y guarda de nuevo.',
  ATHLETE_NOT_IN_ROSTER:
    'La lista cambió y alguien ya no está en ella. Revisa la lista y guarda de nuevo.',
  INVALID_DATE_RANGE: 'El rango de fechas no es válido. Revisa las fechas.',
  GROUP_INACTIVE: 'El grupo está inactivo. Elige un grupo activo.',
  GROUP_WITHOUT_SCHEDULES:
    'El grupo no tiene horarios semanales, así que no hay nada que generar. Agrégale horarios primero.',
  DATE_IN_PAST: 'La fecha no puede ser anterior a hoy.',
  INVALID_TIME_RANGE: 'La hora de fin debe ser posterior a la hora de inicio.',
  DUPLICATE_SESSION: 'Ese grupo ya tiene una sesión con la misma fecha y hora de inicio.',
  INVALID_STATE: 'Solo se pueden cambiar o cancelar las sesiones que están programadas.',
};

/** Códigos que significan que la lista cambió desde que se cargó: hay que volver a pedirla. */
export const ROSTER_CHANGED_CODES: readonly string[] = [
  'INCOMPLETE_ATTENDANCE',
  'ATHLETE_NOT_IN_ROSTER',
];

export function attendanceErrorMessage(error: ApiError): string {
  return MESSAGES[error.code] ?? error.message;
}

/**
 * El mismo error con el mensaje en español propio de la aplicación. Se usa antes de pasarlo a
 * `applyServerError`, para que el texto que sale junto a un campo sea el nuestro y no el del servidor.
 */
export function friendlySessionError(error: ApiError): ApiError {
  return { ...error, message: attendanceErrorMessage(error) };
}
