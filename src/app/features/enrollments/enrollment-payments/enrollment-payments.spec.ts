import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import { enrollmentDetail, page, payment } from '../../../../testing/guardian-fixtures';
import { todayInAcademy } from '../../../shared/format';
import { EnrollmentPayments } from './enrollment-payments';

const API = environment.apiBaseUrl;

describe('EnrollmentPayments', () => {
  let fixture: ComponentFixture<EnrollmentPayments>;
  let backend: HttpTestingController;
  let notices: string[];

  async function setup(
    overrides: Parameters<typeof enrollmentDetail>[0] = {},
    history = [payment()],
  ): Promise<void> {
    TestBed.configureTestingModule({
      imports: [EnrollmentPayments],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(EnrollmentPayments);
    backend = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput(
      'enrollment',
      enrollmentDetail({ status: 'ACTIVE', ...overrides }),
    );
    fixture.componentRef.setInput('monthlyFee', 120000);
    notices = [];
    fixture.componentInstance.changed.subscribe((notice) => notices.push(notice));
    await fixture.whenStable();
    answerHistory(history);
    await fixture.whenStable();
  }

  const historyRequest = () => backend.expectOne((req) => req.url === `${API}/payments`);
  function answerHistory(content = [payment()]): void {
    const request = historyRequest();
    expect(request.request.params.get('enrollmentId')).toBe('21');
    request.flush(page(content));
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const buttonByText = (text: string): HTMLButtonElement | undefined =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );
  const submitPayment = async (): Promise<void> => {
    el().querySelector('app-payment-form form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  it('lists the payments already registered for the enrollment', async () => {
    await setup();
    const rows = el().querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Noviembre de 2026');
    expect(rows[0].textContent).toContain('3 de noviembre de 2026');
    expect(rows[0].textContent).toContain('120.000');
    expect(rows[0].textContent).toContain('R-0042');
    expect(rows[0].textContent).toContain('Admin TeenSport');
  });

  it('says so when there are no payments yet', async () => {
    await setup({}, []);
    expect(el().querySelector('.empty-state')?.textContent).toContain('todavía no tiene pagos');
  });

  it('shows the error of the history and tries again', async () => {
    TestBed.configureTestingModule({
      imports: [EnrollmentPayments],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(EnrollmentPayments);
    backend = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('enrollment', enrollmentDetail({ status: 'ACTIVE' }));
    await fixture.whenStable();
    historyRequest().flush(
      apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor.' }),
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();
    expect(el().querySelector('[role=alert]')?.textContent).toContain('Error del servidor.');
    buttonByText('Reintentar')!.click();
    answerHistory();
    await fixture.whenStable();
    expect(el().querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('highlights that the guardian reported a payment', async () => {
    await setup({ paymentReported: true });
    expect(el().querySelector('.notice')?.textContent).toContain('avisó que ya pagó');
  });

  describe('registering a payment', () => {
    it('sends the payment, reloads the history and tells the screen', async () => {
      await setup();
      await submitPayment();
      const request = backend.expectOne(`${API}/enrollments/21/payments`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ amountPaid: 120000, paymentDate: todayInAcademy() });
      request.flush(payment({ id: 32 }), { status: 201, statusText: 'Created' });
      await fixture.whenStable();
      answerHistory([payment({ id: 32 }), payment()]);
      await fixture.whenStable();
      expect(notices).toEqual(['Pago registrado. La inscripción quedó al día.']);
      expect(el().querySelectorAll('tbody tr')).toHaveLength(2);
    });

    it.each([
      ['INSUFFICIENT_AMOUNT', 422, 'amountPaid', 'menor que la mensualidad'],
      ['FUTURE_DATE', 422, 'paymentDate', 'posterior a hoy'],
      ['PAYMENT_ALREADY_REGISTERED', 409, 'paymentDate', 'ya tiene un pago registrado'],
    ] as const)('puts %s under its field', async (code, status, id, text) => {
      await setup();
      await submitPayment();
      backend
        .expectOne(`${API}/enrollments/21/payments`)
        .flush(apiError({ status, code, message: 'del servidor' }), { status, statusText: code });
      await fixture.whenStable();
      expect(el().querySelector(`#${id}-error`)?.textContent).toContain(text);
      expect(el().querySelector('[role=alert]')).toBeNull();
      expect(notices).toEqual([]);
    });

    it('shows above the form an error that belongs to no field', async () => {
      await setup();
      await submitPayment();
      backend
        .expectOne(`${API}/enrollments/21/payments`)
        .flush(apiError({ status: 409, code: 'INVALID_STATE', message: 'del servidor' }), {
          status: 409,
          statusText: 'Conflict',
        });
      await fixture.whenStable();
      expect(el().querySelector('[role=alert]')?.textContent).toContain('ya cambió de estado');
    });
  });

  describe('marking overdue', () => {
    it('is only offered while the enrollment is up to date', async () => {
      await setup({ paymentStatus: 'OVERDUE' });
      expect(buttonByText('Marcar en mora')).toBeUndefined();
    });

    it('asks for confirmation first', async () => {
      await setup({ paymentStatus: 'UP_TO_DATE' });
      buttonByText('Marcar en mora')!.click();
      await fixture.whenStable();
      expect(el().querySelector('app-confirm-dialog')).not.toBeNull();
      backend.expectNone(`${API}/enrollments/21/payment-status`);

      buttonByText('Volver')!.click();
      await fixture.whenStable();
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
    });

    it('marks the enrollment overdue once confirmed', async () => {
      await setup({ paymentStatus: 'UP_TO_DATE' });
      buttonByText('Marcar en mora')!.click();
      await fixture.whenStable();
      buttonByText('Sí, marcar en mora')!.click();
      const request = backend.expectOne(`${API}/enrollments/21/payment-status`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ paymentStatus: 'OVERDUE' });
      request.flush(enrollmentDetail({ paymentStatus: 'OVERDUE' }));
      await fixture.whenStable();
      expect(notices).toEqual([
        'La inscripción quedó en mora. Vuelve a estar al día al registrar un pago.',
      ]);
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
    });

    it('shows the error and closes the dialog when the server refuses', async () => {
      await setup({ paymentStatus: 'UP_TO_DATE' });
      buttonByText('Marcar en mora')!.click();
      await fixture.whenStable();
      buttonByText('Sí, marcar en mora')!.click();
      backend
        .expectOne(`${API}/enrollments/21/payment-status`)
        .flush(apiError({ status: 404, code: 'NOT_FOUND', message: 'del servidor' }), {
          status: 404,
          statusText: 'Not Found',
        });
      await fixture.whenStable();
      expect(el().querySelector('[role=alert]')?.textContent).toContain('No se encontró');
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
      expect(notices).toEqual([]);
    });
  });

  describe('one payment per month', () => {
    const paidToday = () =>
      payment({ paymentDate: todayInAcademy(), period: todayInAcademy().slice(0, 7) });
    const paidLongAgo = () => payment({ paymentDate: '2020-01-05', period: '2020-01' });
    const notice = (): string => el().querySelector('.notice')?.textContent ?? '';

    it('explains that this month already has a payment, with its date', async () => {
      await setup({ paymentStatus: 'OVERDUE' }, [paidToday()]);
      expect(notice()).toContain('ya tiene un pago registrado');
      expect(notice()).toContain('Solo se admite un pago por mes');
    });

    it('says nothing when the only payments are from other months', async () => {
      await setup({ paymentStatus: 'OVERDUE' }, [paidLongAgo()]);
      expect(el().querySelector('.notice')).toBeNull();
    });

    it('warns before marking overdue when this month is already paid', async () => {
      await setup({ paymentStatus: 'UP_TO_DATE' }, [paidToday()]);
      buttonByText('Marcar en mora')!.click();
      await fixture.whenStable();
      expect(el().querySelector('app-confirm-dialog')?.textContent).toContain(
        'no podrás registrar otro hasta',
      );
    });

    it('does not warn when this month has no payment yet', async () => {
      await setup({ paymentStatus: 'UP_TO_DATE' }, [paidLongAgo()]);
      buttonByText('Marcar en mora')!.click();
      await fixture.whenStable();
      expect(el().querySelector('app-confirm-dialog')?.textContent).not.toContain(
        'no podrás registrar otro hasta',
      );
    });
  });
});
