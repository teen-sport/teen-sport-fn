import { Component, computed, input } from '@angular/core';
import {
  ENROLLMENT_STATUS_LABELS,
  EnrollmentStatus,
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
} from '../../Core/Models/enrollment-status';
import { ENTITY_STATUS_LABELS, EntityStatus } from '../../Core/Models/role';

/**
 * Insignia de color con el estado de una inscripción, de su pago o de una disciplina, grupo o cuenta
 * (`kind="entity"`). El color ayuda, pero el estado siempre se escribe con texto para que no dependa
 * de distinguir colores.
 */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="tone()">{{ label() }}</span>`,
  styleUrl: './status-badge.css',
})
export class StatusBadge {
  readonly kind = input.required<'enrollment' | 'payment' | 'entity'>();
  readonly value = input.required<EnrollmentStatus | PaymentStatus | EntityStatus>();

  protected readonly label = computed(() => {
    const value = this.value();
    switch (this.kind()) {
      case 'enrollment':
        return ENROLLMENT_STATUS_LABELS[value as EnrollmentStatus] ?? value;
      case 'payment':
        return PAYMENT_STATUS_LABELS[value as PaymentStatus] ?? value;
      default:
        return ENTITY_STATUS_LABELS[value as EntityStatus] ?? value;
    }
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
