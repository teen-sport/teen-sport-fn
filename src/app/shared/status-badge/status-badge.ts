import { Component, computed, input } from '@angular/core';
import {
  ENROLLMENT_STATUS_LABELS,
  EnrollmentStatus,
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
} from '../../Core/Models/enrollment-status';

/**
 * Insignia de color con el estado de una inscripción o de su pago. El color ayuda, pero el estado
 * siempre se escribe con texto para que no dependa de distinguir colores.
 */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="tone()">{{ label() }}</span>`,
  styleUrl: './status-badge.css',
})
export class StatusBadge {
  readonly kind = input.required<'enrollment' | 'payment'>();
  readonly value = input.required<EnrollmentStatus | PaymentStatus>();

  protected readonly label = computed(() => {
    const value = this.value();
    return this.kind() === 'enrollment'
      ? (ENROLLMENT_STATUS_LABELS[value as EnrollmentStatus] ?? value)
      : (PAYMENT_STATUS_LABELS[value as PaymentStatus] ?? value);
  });

  /** Clase de color según el valor: verde = bien, amarillo = por atender, rojo/gris = terminado. */
  protected readonly tone = computed(() => {
    switch (this.value()) {
      case 'ACTIVE':
      case 'UP_TO_DATE':
        return 'badge--good';
      case 'PENDING_REVIEW':
      case 'OVERDUE':
        return 'badge--warn';
      case 'REJECTED':
        return 'badge--bad';
      default:
        return 'badge--muted';
    }
  });
}
