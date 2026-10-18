/** Estado de una inscripción. REJECTED y CANCELLED son finales. */
export type EnrollmentStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'CANCELLED';

/** Estado de pago de una inscripción. Solo pasa a UP_TO_DATE cuando el administrador registra un pago. */
export type PaymentStatus = 'UP_TO_DATE' | 'OVERDUE';

/** Inscripciones que ocupan cupo y bloquean otra inscripción en la misma disciplina. */
export const IN_FORCE_STATUSES: readonly EnrollmentStatus[] = ['PENDING_REVIEW', 'ACTIVE'];

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  PENDING_REVIEW: 'En revisión',
  ACTIVE: 'Activa',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};

/**
 * Al crear una inscripción el pago queda OVERDUE hasta que se registra el primero, por eso se
 * muestra como «Pago pendiente» y no como «En mora», que asusta a quien acaba de inscribirse.
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UP_TO_DATE: 'Al día',
  OVERDUE: 'Pago pendiente',
};
