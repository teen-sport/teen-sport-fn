import { AthleteRef, IdName, PersonRef } from '../../Core/Models/common';

/** Pago que el administrador registró en la academia (GET /payments). */
export interface Payment {
  id: number;
  enrollmentId: number;
  athlete: AthleteRef;
  discipline: IdName;
  /** Mes que cubre el pago «YYYY-MM». */
  period: string;
  /** Monto en pesos colombianos. */
  amountPaid: number;
  /** Fecha del pago «YYYY-MM-DD». */
  paymentDate: string;
  receiptReference?: string | null;
  notes?: string | null;
  registeredBy?: PersonRef | null;
  createdAt: string;
}

/** Filtros del historial de pagos. La primera página es la 0. Las fechas van como «YYYY-MM-DD». */
export interface PaymentQuery {
  page?: number;
  size?: number;
  enrollmentId?: number | null;
  athleteId?: number | null;
  from?: string | null;
  to?: string | null;
}

/**
 * Cuerpo de POST /enrollments/{id}/payments (E17) y del campo `payment` al confirmar una inscripción.
 * El monto no puede ser menor que la mensualidad y la fecha no puede ser futura.
 */
export interface RegisterPaymentRequest {
  amountPaid: number;
  /** Fecha del pago «YYYY-MM-DD». */
  paymentDate: string;
  receiptReference?: string;
  notes?: string;
}
