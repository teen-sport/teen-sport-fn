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
