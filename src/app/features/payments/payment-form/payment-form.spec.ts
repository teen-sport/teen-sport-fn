import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiError } from '../../../../testing/auth-fixtures';
import { todayInAcademy } from '../../../shared/format';
import { RegisterPaymentRequest } from '../payment.models';
import { PaymentForm } from './payment-form';

describe('PaymentForm', () => {
  let fixture: ComponentFixture<PaymentForm>;
  let emitted: RegisterPaymentRequest[];

  async function setup(monthlyFee: number | null = 120000): Promise<void> {
    TestBed.configureTestingModule({ imports: [PaymentForm] });
    fixture = TestBed.createComponent(PaymentForm);
    fixture.componentRef.setInput('monthlyFee', monthlyFee);
    emitted = [];
    fixture.componentInstance.submitted.subscribe((request) => emitted.push(request));
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = <T extends HTMLElement>(id: string): T => el().querySelector<T>(`#${id}`)!;
  const type = async (id: string, value: string): Promise<void> => {
    const input = field<HTMLInputElement>(id);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  it('proposes the monthly fee and today as the date of the payment', async () => {
    await setup();
    expect(field<HTMLInputElement>('amountPaid').value).toBe('120000');
    expect(field<HTMLInputElement>('paymentDate').value).toBe(todayInAcademy());
    expect(field<HTMLInputElement>('paymentDate').max).toBe(todayInAcademy());
    expect(el().textContent).toContain('Mensualidad de la disciplina');
  });

  it('leaves the amount empty when the monthly fee is unknown', async () => {
    await setup(null);
    expect(field<HTMLInputElement>('amountPaid').value).toBe('');
  });

  it('sends the payment without the optional fields that were left empty', async () => {
    await setup();
    await submit();
    expect(emitted).toEqual([{ amountPaid: 120000, paymentDate: todayInAcademy() }]);
  });

  it('sends the receipt and the note trimmed', async () => {
    await setup();
    await type('amountPaid', '150000');
    await type('receiptReference', '  R-0042 ');
    await type('paymentNotes', ' Pagó en caja ');
    await submit();
    expect(emitted).toEqual([
      {
        amountPaid: 150000,
        paymentDate: todayInAcademy(),
        receiptReference: 'R-0042',
        notes: 'Pagó en caja',
      },
    ]);
  });

  it('does not send an amount lower than the monthly fee', async () => {
    await setup();
    await type('amountPaid', '100000');
    await submit();
    expect(emitted).toEqual([]);
    expect(el().querySelector('#amountPaid-error')?.textContent).toContain(
      'menor que la mensualidad',
    );
    expect(field('amountPaid').getAttribute('aria-invalid')).toBe('true');
  });

  it('requires an amount', async () => {
    await setup(null);
    await submit();
    expect(emitted).toEqual([]);
    expect(el().querySelector('#amountPaid-error')?.textContent).toContain('obligatorio');
  });

  it('does not send a payment dated in the future', async () => {
    await setup();
    await type('paymentDate', '2999-01-01');
    await submit();
    expect(emitted).toEqual([]);
    expect(el().querySelector('#paymentDate-error')?.textContent).toContain('posterior a hoy');
  });

  it('does not send a payment without a date', async () => {
    await setup();
    await type('paymentDate', '');
    await submit();
    expect(emitted).toEqual([]);
    expect(el().querySelector('#paymentDate-error')?.textContent).toContain('obligatorio');
  });

  it('limits the receipt to 50 characters and the note to 255', async () => {
    await setup();
    await type('receiptReference', 'R'.repeat(51));
    await type('paymentNotes', 'n'.repeat(256));
    await submit();
    expect(emitted).toEqual([]);
    expect(el().querySelector('#receiptReference-error')?.textContent).toContain('50');
    expect(el().querySelector('#paymentNotes-error')?.textContent).toContain('255');
  });

  it('disables the button and ignores the submit while busy', async () => {
    await setup();
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    const button = el().querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Guardando');
    await submit();
    expect(emitted).toEqual([]);
  });

  it('uses the label of the button that the screen asks for', async () => {
    await setup();
    fixture.componentRef.setInput('submitLabel', 'Confirmar y registrar pago');
    await fixture.whenStable();
    expect(el().querySelector('button[type=submit]')?.textContent).toContain(
      'Confirmar y registrar pago',
    );
  });

  describe('server errors', () => {
    it.each([
      ['INSUFFICIENT_AMOUNT', 'amountPaid', 'menor que la mensualidad'],
      ['FUTURE_DATE', 'paymentDate', 'posterior a hoy'],
      ['PAYMENT_ALREADY_REGISTERED', 'paymentDate', 'ya tiene un pago registrado'],
    ] as const)('puts %s under its field in our own words', async (code, id, text) => {
      await setup();
      const leftover = fixture.componentInstance.showError(
        apiError({ code, status: 422, message: 'texto del servidor' }),
      );
      await fixture.whenStable();
      expect(leftover).toBeNull();
      expect(el().querySelector(`#${id}-error`)?.textContent).toContain(text);
    });

    it('returns the message of an error that belongs to no field', async () => {
      await setup();
      const leftover = fixture.componentInstance.showError(
        apiError({ code: 'INVALID_STATE', status: 409, message: 'del servidor' }),
      );
      expect(leftover).toContain('ya cambió de estado');
    });
  });

  it('goes back to the proposed values after reset', async () => {
    await setup();
    await type('amountPaid', '150000');
    await type('receiptReference', 'R-1');
    fixture.componentInstance.reset();
    await fixture.whenStable();
    expect(field<HTMLInputElement>('amountPaid').value).toBe('120000');
    expect(field<HTMLInputElement>('receiptReference').value).toBe('');
  });
});
