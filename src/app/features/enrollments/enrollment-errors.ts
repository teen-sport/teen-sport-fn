import { ApiError } from '../../Core/Models/api-error';

/**
 * Mensajes para el acudiente según el código de error del API. El cliente decide con el `code`, nunca
 * con el texto de `message`; el texto del servidor solo se usa cuando no hay uno propio.
 */
const MESSAGES: Partial<Record<string, string>> = {
  DUPLICATE_ENROLLMENT: 'Este deportista ya tiene una inscripción vigente en esta disciplina.',
  NO_AVAILABLE_SPOTS: 'Ya no quedan cupos en este grupo. Elige otro grupo u otro mes.',
  PERIOD_IN_PAST: 'El mes elegido ya pasó. Elige el mes actual o uno posterior.',
  AGE_OUT_OF_RANGE: 'El deportista debe tener entre 12 y 17 años.',
  GROUP_INACTIVE: 'Este grupo ya no está disponible para inscripciones.',
  DISCIPLINE_INACTIVE: 'Esta disciplina ya no está disponible para inscripciones.',
  PAYMENT_ALREADY_REGISTERED: 'La academia ya registró un pago de este mes para esta inscripción.',
  INVALID_STATE:
    'Esta inscripción ya cambió de estado y no admite esa acción. Actualiza la página para ver su estado actual.',
};

export function enrollmentErrorMessage(error: ApiError): string {
  return MESSAGES[error.code] ?? error.message;
}

/**
 * Mensajes para el administrador. Varios códigos significan otra cosa para él que para el acudiente
 * (por ejemplo, un grupo sin cupo se resuelve eligiendo otro grupo, no otro mes); los que no tienen
 * texto propio usan el del acudiente y, en último caso, el del servidor.
 */
const ADMIN_MESSAGES: Partial<Record<string, string>> = {
  NO_AVAILABLE_SPOTS: 'El grupo elegido no tiene cupos libres en ese mes. Elige otro grupo.',
  GROUP_INACTIVE: 'El grupo elegido está inactivo. Elige un grupo activo.',
  GROUP_OTHER_DISCIPLINE: 'El grupo debe ser de la misma disciplina de la inscripción.',
  INSUFFICIENT_AMOUNT: 'El monto no puede ser menor que la mensualidad de la disciplina.',
  FUTURE_DATE: 'La fecha del pago no puede ser posterior a hoy.',
  PAYMENT_ALREADY_REGISTERED:
    'Esa inscripción ya tiene un pago registrado en el mes de esa fecha. Solo se admite un pago por mes: usa una fecha de otro mes.',
  USE_PAYMENT_REGISTRATION:
    'Una inscripción vuelve a estar al día solo cuando se registra un pago.',
  NOT_FOUND: 'No se encontró la inscripción o el grupo. Actualiza la página e inténtalo de nuevo.',
};

export function adminEnrollmentErrorMessage(error: ApiError): string {
  return ADMIN_MESSAGES[error.code] ?? enrollmentErrorMessage(error);
}
