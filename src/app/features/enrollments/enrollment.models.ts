import { AthleteRef, IdName, Schedule } from '../../Core/Models/common';
import { EnrollmentStatus, PaymentStatus } from '../../Core/Models/enrollment-status';
import { RegisterPaymentRequest } from '../payments/payment.models';

/** Inscripción en los listados (GET /enrollments). */
export interface EnrollmentSummary {
  id: number;
  athlete: AthleteRef;
  group: IdName;
  discipline: IdName;
  /** Mes de inicio «YYYY-MM». */
  period: string;
  status: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  /** El acudiente avisó que pagó y el administrador aún no lo registra. */
  paymentReported: boolean;
  createdAt: string;
}

/** Detalle de una inscripción: el resumen más las franjas del grupo y las notas de la revisión. */
export interface EnrollmentDetail extends EnrollmentSummary {
  schedules: Schedule[];
  /** Último mensaje o motivo escrito al rechazar o cancelar. */
  reviewNotes?: string | null;
  confirmedAt?: string | null;
}

/** Cuerpo de POST /enrollments. */
export interface CreateEnrollmentRequest {
  athleteId: number;
  groupId: number;
  period: string;
}

/**
 * Filtros del listado de inscripciones. La primera página es la 0. El acudiente solo usa `status` y
 * `athleteId`; el resto son filtros del administrador.
 */
export interface EnrollmentQuery {
  page?: number;
  size?: number;
  status?: EnrollmentStatus | null;
  athleteId?: number | null;
  paymentStatus?: PaymentStatus | null;
  /** true = solo las que el acudiente avisó como pagadas y falta registrar. */
  paymentReported?: boolean | null;
  /** Mes de inicio «YYYY-MM». */
  period?: string | null;
  disciplineId?: number | null;
  groupId?: number | null;
}

/** Cuerpo opcional de POST /enrollments/{id}/confirm (E9): cambiar de grupo y/o registrar el primer pago. */
export interface ConfirmEnrollmentRequest {
  groupId?: number;
  payment?: RegisterPaymentRequest;
}

/** Cuerpo opcional de POST /enrollments/{id}/payment-report (E16). */
export interface PaymentReportRequest {
  paymentDate?: string;
  notes?: string;
}
