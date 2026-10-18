import { ApiError } from '../../Core/Models/api-error';

/**
 * Mensajes para el administrador según el código de error del API. Igual que en el resto de la
 * aplicación, se decide con el `code` (nunca con el texto de `message`); el texto del servidor solo
 * se usa cuando no hay uno propio.
 */
const MESSAGES: Partial<Record<string, string>> = {
  DUPLICATE_DISCIPLINE: 'Ya existe una disciplina con ese nombre.',
  DISCIPLINE_HAS_ACTIVE_GROUPS:
    'No se puede desactivar: la disciplina tiene grupos activos. Desactiva primero esos grupos.',
  DISCIPLINE_INACTIVE: 'La disciplina está inactiva. Elige una disciplina activa.',
  INVALID_MAX_CAPACITY: 'La capacidad debe estar entre 1 y 15 deportistas.',
  CAPACITY_BELOW_OCCUPIED:
    'La capacidad no puede ser menor que los cupos que ya están ocupados en este grupo.',
  INVALID_COACH: 'El entrenador debe estar activo.',
  GROUP_HAS_ACTIVITY:
    'No se puede desactivar: el grupo tiene inscripciones vigentes o sesiones programadas.',
  COACH_SCHEDULE_CONFLICT:
    'Los horarios del grupo se cruzan con los de otro grupo activo de este entrenador.',
  SCHEDULE_CONFLICT:
    'Ese horario se cruza con otro del grupo o con otro grupo activo del mismo entrenador.',
  INVALID_TIME_RANGE: 'La hora de fin debe ser posterior a la hora de inicio.',
  COACH_HAS_ACTIVE_GROUPS:
    'No se puede desactivar: el entrenador tiene grupos activos. Cámbiale el entrenador a esos grupos primero.',
  CANNOT_DEACTIVATE_SELF: 'No puedes desactivar tu propia cuenta.',
  EMAIL_ALREADY_REGISTERED: 'Ya existe una cuenta con ese correo.',
  ID_NUMBER_ALREADY_REGISTERED: 'Ya existe una cuenta con ese número de documento.',
};

export function adminErrorMessage(error: ApiError): string {
  return MESSAGES[error.code] ?? error.message;
}

/**
 * El mismo error, pero con el mensaje en español propio de la aplicación. Se usa antes de pasarlo a
 * `applyServerError`, para que el texto que sale junto a un campo (o encima del formulario) sea el
 * nuestro y no el del servidor.
 */
export function friendlyError(error: ApiError): ApiError {
  return { ...error, message: adminErrorMessage(error) };
}
