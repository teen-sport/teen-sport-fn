import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toApiError } from '../../../Core/http/api-error';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { firstError } from '../../../shared/form-errors';
import { notBlank } from '../../../shared/validators';
import { GroupAvailability } from '../../catalog/catalog.models';
import { PaymentForm } from '../../payments/payment-form/payment-form';
import { RegisterPaymentRequest } from '../../payments/payment.models';
import { adminEnrollmentErrorMessage } from '../enrollment-errors';
import { ConfirmEnrollmentRequest, EnrollmentDetail } from '../enrollment.models';
import { EnrollmentService } from '../enrollment.service';
import { groupOptionLabel } from '../group-options';

/**
 * Revisión de una solicitud en estado «En revisión»: el administrador la confirma (con otro grupo y/o
 * con el primer pago, si quiere) o la rechaza con un motivo. No muestra el resultado por su cuenta:
 * avisa con `changed` y la pantalla de detalle vuelve a pedir la inscripción al servidor.
 */
@Component({
  selector: 'app-enrollment-review',
  imports: [ReactiveFormsModule, ConfirmDialog, PaymentForm],
  templateUrl: './enrollment-review.html',
})
export class EnrollmentReview {
  private readonly service = inject(EnrollmentService);

  readonly enrollment = input.required<EnrollmentDetail>();
  /** Mensualidad de la disciplina, para proponer el monto del pago. */
  readonly monthlyFee = input<number | null>(null);
  /** Grupos activos de la disciplina con sus cupos (el actual se descarta de las opciones). */
  readonly groups = input<GroupAvailability[]>([]);
  readonly changed = output<string>();

  protected readonly firstError = firstError;
  protected readonly groupOptionLabel = groupOptionLabel;

  /** Vacío = dejarla en el grupo que pidió el acudiente. */
  protected readonly groupId = new FormControl('', { nonNullable: true });
  protected readonly withPayment = new FormControl(false, { nonNullable: true });
  protected readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, notBlank, Validators.maxLength(500)],
  });

  protected readonly otherGroups = computed(() =>
    this.groups().filter((group) => group.groupId !== this.enrollment().group.id),
  );

  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly confirmingReject = signal(false);

  private readonly paymentForm = viewChild(PaymentForm);

  /** E9. Con `payment`, el servidor confirma y registra el pago juntos o no hace nada. */
  protected confirm(payment?: RegisterPaymentRequest): void {
    if (this.busy()) {
      return;
    }
    this.actionError.set(null);
    const request: ConfirmEnrollmentRequest = {
      ...(this.groupId.value ? { groupId: Number(this.groupId.value) } : {}),
      ...(payment ? { payment } : {}),
    };
    this.busy.set(true);
    this.service.confirm(this.enrollment().id, request).subscribe({
      next: () => {
        this.busy.set(false);
        this.changed.emit(
          payment
            ? 'Inscripción confirmada y pago registrado.'
            : 'Inscripción confirmada. Queda con el pago pendiente hasta que registres el primero.',
        );
      },
      error: (error: unknown) => {
        const apiError = toApiError(error);
        // Un error del pago se muestra bajo su campo; cualquier otro, arriba de la tarjeta.
        const message = payment
          ? (this.paymentForm()?.showError(apiError) ?? null)
          : adminEnrollmentErrorMessage(apiError);
        this.actionError.set(message);
        this.busy.set(false);
      },
    });
  }

  /** El rechazo es definitivo: primero se valida el motivo y luego se pide confirmación. */
  protected askToReject(): void {
    this.actionError.set(null);
    if (this.reason.invalid) {
      this.reason.markAsTouched();
      return;
    }
    this.confirmingReject.set(true);
  }

  protected closeReject(): void {
    this.confirmingReject.set(false);
  }

  protected reject(): void {
    this.busy.set(true);
    this.service.reject(this.enrollment().id, this.reason.value).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmingReject.set(false);
        this.changed.emit('La solicitud se rechazó y el cupo quedó libre.');
      },
      error: (error: unknown) => {
        this.actionError.set(adminEnrollmentErrorMessage(toApiError(error)));
        this.confirmingReject.set(false);
        this.busy.set(false);
      },
    });
  }
}
