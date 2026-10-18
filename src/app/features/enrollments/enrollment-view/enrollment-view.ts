import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { IN_FORCE_STATUSES } from '../../../Core/Models/enrollment-status';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { firstError } from '../../../shared/form-errors';
import { formatInstantDate, formatPeriod, formatSchedule } from '../../../shared/format';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { enrollmentErrorMessage } from '../enrollment-errors';
import { EnrollmentDetail } from '../enrollment.models';
import { EnrollmentService } from '../enrollment.service';

/** Explicación, en palabras del acudiente, de lo que significa cada estado. */
const STATUS_HELP: Record<EnrollmentDetail['status'], string> = {
  PENDING_REVIEW:
    'La academia está revisando tu solicitud. Mientras tanto, el cupo queda reservado para tu deportista.',
  ACTIVE: 'La academia confirmó la inscripción. Tu deportista ya hace parte del grupo.',
  REJECTED: 'La academia no aceptó esta solicitud. Si tienes dudas, comunícate con la academia.',
  CANCELLED: 'Esta inscripción se canceló y ya no ocupa cupo.',
};

/**
 * Detalle de una inscripción (E8) con sus dos acciones del acudiente: cancelarla mientras está en
 * revisión (E14) y avisar que ya pagó (E16), esto último solo cuando la inscripción está activa.
 */
@Component({
  selector: 'app-enrollment-view',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge, ConfirmDialog],
  templateUrl: './enrollment-view.html',
  host: { class: 'page-narrow' },
})
export class EnrollmentView {
  private readonly service = inject(EnrollmentService);
  private readonly route = inject(ActivatedRoute).snapshot;
  private readonly enrollmentId = Number(this.route.paramMap.get('id'));

  protected readonly firstError = firstError;
  protected readonly formatPeriod = formatPeriod;
  protected readonly formatSchedule = formatSchedule;
  protected readonly formatInstantDate = formatInstantDate;
  protected readonly statusHelp = STATUS_HELP;

  protected readonly enrollment = signal<EnrollmentDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(
    this.route.queryParamMap.has('requested')
      ? 'Solicitud enviada. Queda en revisión: la academia la confirmará pronto.'
      : null,
  );
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly confirmingCancel = signal(false);

  protected readonly paymentNote = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(255)],
  });

  /** Vigente = en revisión o activa: solo entonces ocupa cupo y admite acciones. */
  protected readonly inForce = computed(() => {
    const current = this.enrollment();
    return !!current && IN_FORCE_STATUSES.includes(current.status);
  });
  /**
   * Solo se avisa un pago cuando la academia ya confirmó la inscripción (antes no hay mensualidad que
   * pagar) y el pago está pendiente: si ya está «al día» no hay nada que avisar. El estado de pago lo
   * cambia el administrador a mano, así que vuelve a «pendiente» cuando él lo marca.
   */
  protected readonly canReportPayment = computed(() => {
    const current = this.enrollment();
    return current?.status === 'ACTIVE' && current.paymentStatus === 'OVERDUE';
  });
  /** El acudiente solo cancela mientras está en revisión; una activa la cancela la academia. */
  protected readonly canCancel = computed(() => this.enrollment()?.status === 'PENDING_REVIEW');

  constructor() {
    this.load();
  }

  protected load(): void {
    if (!Number.isInteger(this.enrollmentId) || this.enrollmentId <= 0) {
      this.loadError.set('La inscripción no existe.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    this.service.get(this.enrollmentId).subscribe({
      next: (enrollment) => {
        this.enrollment.set(enrollment);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }

  protected askToCancel(): void {
    this.actionError.set(null);
    this.confirmingCancel.set(true);
  }

  protected closeCancel(): void {
    this.confirmingCancel.set(false);
  }

  protected cancel(reason: string | undefined): void {
    this.busy.set(true);
    this.service.cancel(this.enrollmentId, reason).subscribe({
      next: (enrollment) => this.finish(enrollment, 'La inscripción se canceló.'),
      error: (error: unknown) => {
        this.actionError.set(enrollmentErrorMessage(toApiError(error)));
        this.confirmingCancel.set(false);
        this.busy.set(false);
      },
    });
  }

  protected reportPayment(): void {
    if (this.busy() || !this.canReportPayment()) {
      return;
    }
    this.actionError.set(null);
    if (this.paymentNote.invalid) {
      this.paymentNote.markAsTouched();
      return;
    }
    this.busy.set(true);
    this.service.reportPayment(this.enrollmentId, this.paymentNote.value).subscribe({
      next: (enrollment) => {
        this.paymentNote.reset('');
        this.finish(
          enrollment,
          'Listo, avisamos a la academia. Cuando verifique tu pago, lo registrará aquí.',
        );
      },
      error: (error: unknown) => {
        this.actionError.set(enrollmentErrorMessage(toApiError(error)));
        this.busy.set(false);
      },
    });
  }

  /** Cierra una acción exitosa: guarda la inscripción que devolvió el servidor y avisa. */
  private finish(enrollment: EnrollmentDetail, notice: string): void {
    this.enrollment.set(enrollment);
    this.notice.set(notice);
    this.confirmingCancel.set(false);
    this.busy.set(false);
  }
}
