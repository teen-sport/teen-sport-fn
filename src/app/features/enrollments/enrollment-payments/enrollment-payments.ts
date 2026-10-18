import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toApiError } from '../../../Core/http/api-error';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import {
  currentPeriod,
  formatDate,
  formatMoney,
  formatPeriod,
  periodRange,
} from '../../../shared/format';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { PaymentForm } from '../../payments/payment-form/payment-form';
import { Payment, RegisterPaymentRequest } from '../../payments/payment.models';
import { PaymentService } from '../../payments/payment.service';
import { adminEnrollmentErrorMessage } from '../enrollment-errors';
import { EnrollmentDetail } from '../enrollment.models';

/** Más de 50 pagos de una misma inscripción serían más de cuatro años de mensualidades. */
const HISTORY_SIZE = 50;

/**
 * Pagos de una inscripción activa, para el administrador: registrar un pago (E17), marcar la
 * inscripción en mora (E18) y ver los pagos ya registrados (E19). Avisa con `changed` para que la
 * pantalla de detalle vuelva a pedir la inscripción (el pago cambia su estado de pago).
 */
@Component({
  selector: 'app-enrollment-payments',
  imports: [PaymentForm, StatusBadge, ConfirmDialog],
  templateUrl: './enrollment-payments.html',
})
export class EnrollmentPayments {
  private readonly service = inject(PaymentService);

  readonly enrollment = input.required<EnrollmentDetail>();
  readonly monthlyFee = input<number | null>(null);
  readonly changed = output<string>();

  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly formatPeriod = formatPeriod;

  protected readonly payments = signal<Payment[] | null>(null);
  protected readonly historyError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly confirmingOverdue = signal(false);

  /** Mes actual y siguiente «YYYY-MM», según la zona de la academia. */
  protected readonly thisMonth = currentPeriod();
  protected readonly nextMonth = periodRange(0, 1)[1].value;

  /**
   * El pago de este mes, si ya existe. El API admite un solo pago por mes calendario (el de la fecha
   * del pago), así que con uno registrado no se puede registrar otro con fecha de este mes.
   */
  protected readonly paymentThisMonth = computed(
    () =>
      this.payments()?.find((payment) => payment.paymentDate.startsWith(this.thisMonth)) ?? null,
  );

  protected readonly overdueMessage = computed(() => {
    const base =
      'El acudiente verá «Pago pendiente». Vuelve a estar al día cuando registres un pago.';
    return this.paymentThisMonth()
      ? `${base} Ojo: este mes ya tiene un pago registrado y solo se admite uno por mes, así que no podrás registrar otro hasta ${formatPeriod(this.nextMonth)}.`
      : base;
  });

  private readonly paymentForm = viewChild(PaymentForm);

  constructor() {
    // Se pide el historial al abrir y cada vez que la pantalla cambia de inscripción.
    effect(() => {
      const id = this.enrollment().id;
      untracked(() => this.loadHistory(id));
    });
  }

  protected loadHistory(id: number = this.enrollment().id): void {
    this.historyError.set(null);
    this.service.list({ enrollmentId: id, page: 0, size: HISTORY_SIZE }).subscribe({
      next: (result) => this.payments.set(result.content),
      error: (error: unknown) => this.historyError.set(toApiError(error).message),
    });
  }

  protected register(request: RegisterPaymentRequest): void {
    if (this.busy()) {
      return;
    }
    this.actionError.set(null);
    this.busy.set(true);
    this.service.register(this.enrollment().id, request).subscribe({
      next: () => {
        this.busy.set(false);
        this.paymentForm()?.reset();
        this.loadHistory();
        this.changed.emit('Pago registrado. La inscripción quedó al día.');
      },
      error: (error: unknown) => {
        this.actionError.set(this.paymentForm()?.showError(toApiError(error)) ?? null);
        this.busy.set(false);
      },
    });
  }

  protected askOverdue(): void {
    this.actionError.set(null);
    this.confirmingOverdue.set(true);
  }

  protected closeOverdue(): void {
    this.confirmingOverdue.set(false);
  }

  protected markOverdue(): void {
    this.busy.set(true);
    this.service.markOverdue(this.enrollment().id).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmingOverdue.set(false);
        this.changed.emit(
          'La inscripción quedó en mora. Vuelve a estar al día al registrar un pago.',
        );
      },
      error: (error: unknown) => {
        this.actionError.set(adminEnrollmentErrorMessage(toApiError(error)));
        this.confirmingOverdue.set(false);
        this.busy.set(false);
      },
    });
  }
}
