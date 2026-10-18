import { Component, effect, inject, input, output, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../../Core/Models/api-error';
import { applyServerError, firstError } from '../../../shared/form-errors';
import { formatMoney, todayInAcademy } from '../../../shared/format';
import { notBlank, notFutureDate } from '../../../shared/validators';
import { adminEnrollmentErrorMessage } from '../../enrollments/enrollment-errors';
import { RegisterPaymentRequest } from '../payment.models';

/** El API guarda hasta 8 dígitos enteros y 2 decimales. */
const MAX_AMOUNT = 99_999_999.99;

/**
 * Campos de un pago (monto, fecha, comprobante y nota) con su botón de envío. Se usa en dos sitios:
 * al registrar un pago de una inscripción activa y al confirmar una inscripción nueva con su primer
 * pago. No llama al API: avisa con `submitted` y la pantalla que lo usa decide qué petición hacer;
 * si el servidor rechaza el pago, esa pantalla le pasa el error a `showError` para que aparezca bajo
 * el campo que corresponde.
 */
@Component({
  selector: 'app-payment-form',
  imports: [ReactiveFormsModule],
  templateUrl: './payment-form.html',
})
export class PaymentForm {
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Mensualidad de la disciplina: el monto no puede ser menor y se propone como valor inicial. */
  readonly monthlyFee = input<number | null>(null);
  readonly submitLabel = input('Registrar pago');
  readonly busy = input(false);

  readonly submitted = output<RegisterPaymentRequest>();

  protected readonly firstError = firstError;
  protected readonly formatMoney = formatMoney;
  protected readonly today = todayInAcademy();

  protected readonly form = this.fb.group({
    amountPaid: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(MAX_AMOUNT),
    ]),
    paymentDate: this.fb.control(this.today, [Validators.required, notFutureDate]),
    receiptReference: this.fb.control('', [Validators.maxLength(50), notBlank]),
    notes: this.fb.control('', [Validators.maxLength(255), notBlank]),
  });

  constructor() {
    // La mensualidad llega después de abrir la pantalla: cuando llega, pasa a ser el mínimo del monto
    // y, si la persona aún no ha escrito nada, el valor propuesto.
    effect(() => {
      const fee = this.monthlyFee();
      untracked(() => {
        const amount = this.form.controls.amountPaid;
        amount.setValidators([
          Validators.required,
          Validators.min(fee ?? 1),
          Validators.max(MAX_AMOUNT),
        ]);
        if (fee !== null && amount.pristine) {
          amount.setValue(fee);
        } else {
          amount.updateValueAndValidity();
        }
      });
    });
  }

  /**
   * El error del monto. Si es por quedar bajo la mensualidad se dice con el valor en pesos, que se
   * entiende mejor que el «valor mínimo» genérico de los demás formularios.
   */
  protected amountMessage(): string | null {
    const control = this.form.controls.amountPaid;
    const fee = this.monthlyFee();
    if (fee !== null && control.errors?.['min'] && (control.touched || control.dirty)) {
      return `El monto no puede ser menor que la mensualidad (${formatMoney(fee)}).`;
    }
    return firstError(control);
  }

  protected submit(): void {
    if (this.busy()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const receiptReference = value.receiptReference.trim();
    const notes = value.notes.trim();
    this.submitted.emit({
      amountPaid: Number(value.amountPaid),
      paymentDate: value.paymentDate,
      ...(receiptReference ? { receiptReference } : {}),
      ...(notes ? { notes } : {}),
    });
  }

  /**
   * Muestra un error del servidor bajo el campo que lo causó (monto, fecha…). Devuelve el mensaje
   * cuando el error no es de ningún campo, para que la pantalla lo muestre arriba.
   */
  showError(error: ApiError): string | null {
    return applyServerError(
      this.form,
      { ...error, message: adminEnrollmentErrorMessage(error) },
      {
        INSUFFICIENT_AMOUNT: 'amountPaid',
        FUTURE_DATE: 'paymentDate',
        PAYMENT_ALREADY_REGISTERED: 'paymentDate',
      },
    );
  }

  /** Deja el formulario como nuevo (después de registrar un pago). */
  reset(): void {
    this.form.reset({
      amountPaid: this.monthlyFee(),
      paymentDate: todayInAcademy(),
      receiptReference: '',
      notes: '',
    });
  }
}
