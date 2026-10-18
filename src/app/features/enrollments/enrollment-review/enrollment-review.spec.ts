import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import { enrollmentDetail, groupAvailability } from '../../../../testing/guardian-fixtures';
import { todayInAcademy } from '../../../shared/format';
import { EnrollmentReview } from './enrollment-review';

const URL = `${environment.apiBaseUrl}/enrollments/21`;

describe('EnrollmentReview', () => {
  let fixture: ComponentFixture<EnrollmentReview>;
  let backend: HttpTestingController;
  let notices: string[];

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [EnrollmentReview],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(EnrollmentReview);
    backend = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('enrollment', enrollmentDetail());
    fixture.componentRef.setInput('monthlyFee', 120000);
    fixture.componentRef.setInput('groups', [
      groupAvailability(),
      groupAvailability({ groupId: 12, groupName: 'Fútbol sub-17', availableSpots: 3 }),
      groupAvailability({ groupId: 13, groupName: 'Fútbol sub-13', availableSpots: 0 }),
    ]);
    notices = [];
    fixture.componentInstance.changed.subscribe((notice) => notices.push(notice));
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = <T extends HTMLElement>(id: string): T => el().querySelector<T>(`#${id}`)!;
  const buttonByText = (text: string): HTMLButtonElement | undefined =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );
  const type = async (id: string, value: string): Promise<void> => {
    const input = field<HTMLInputElement | HTMLTextAreaElement>(id);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const chooseGroup = async (value: string): Promise<void> => {
    const select = field<HTMLSelectElement>('groupId');
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const checkPayment = async (): Promise<void> => {
    el().querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    await fixture.whenStable();
  };
  const submitPayment = async (): Promise<void> => {
    el().querySelector('app-payment-form form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  describe('confirming', () => {
    it('keeps the group and sends no payment by default', async () => {
      await setup();
      expect(field<HTMLSelectElement>('groupId').value).toBe('');
      expect(el().querySelector('app-payment-form')).toBeNull();
      expect(el().textContent).toContain('«Pago pendiente»');

      buttonByText('Confirmar inscripción')!.click();
      const request = backend.expectOne(`${URL}/confirm`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({});
      request.flush(enrollmentDetail({ status: 'ACTIVE' }));
      expect(notices).toEqual([
        'Inscripción confirmada. Queda con el pago pendiente hasta que registres el primero.',
      ]);
    });

    it('offers the other groups of the discipline with their spots, and none without spots', async () => {
      await setup();
      const options = Array.from(field<HTMLSelectElement>('groupId').options);
      expect(options.map((o) => o.textContent!.trim())).toEqual([
        'Mantener Fútbol sub-15',
        'Fútbol sub-17 · 3 cupos libres',
        'Fútbol sub-13 · sin cupos',
      ]);
      expect(options.map((o) => o.disabled)).toEqual([false, false, true]);
    });

    it('confirms in another group when the administrator picks one', async () => {
      await setup();
      await chooseGroup('12');
      buttonByText('Confirmar inscripción')!.click();
      const request = backend.expectOne(`${URL}/confirm`);
      expect(request.request.body).toEqual({ groupId: 12 });
      request.flush(enrollmentDetail({ status: 'ACTIVE' }));
    });

    it('confirms and registers the first payment in a single request', async () => {
      await setup();
      await checkPayment();
      expect(field<HTMLInputElement>('amountPaid').value).toBe('120000');
      expect(buttonByText('Confirmar inscripción')).toBeUndefined();

      await type('receiptReference', 'R-0042');
      await submitPayment();
      const request = backend.expectOne(`${URL}/confirm`);
      expect(request.request.body).toEqual({
        payment: {
          amountPaid: 120000,
          paymentDate: todayInAcademy(),
          receiptReference: 'R-0042',
        },
      });
      request.flush(enrollmentDetail({ status: 'ACTIVE', paymentStatus: 'UP_TO_DATE' }));
      expect(notices).toEqual(['Inscripción confirmada y pago registrado.']);
    });

    it('sends the group and the payment together', async () => {
      await setup();
      await chooseGroup('12');
      await checkPayment();
      await submitPayment();
      const request = backend.expectOne(`${URL}/confirm`);
      expect(request.request.body).toMatchObject({ groupId: 12, payment: { amountPaid: 120000 } });
      request.flush(enrollmentDetail({ status: 'ACTIVE' }));
    });

    it('does not ask the server when the payment is invalid', async () => {
      await setup();
      await checkPayment();
      await type('amountPaid', '1000');
      await submitPayment();
      backend.expectNone(`${URL}/confirm`);
      expect(el().querySelector('#amountPaid-error')).not.toBeNull();
    });

    it('shows the error of the group above the form', async () => {
      await setup();
      await chooseGroup('12');
      buttonByText('Confirmar inscripción')!.click();
      backend
        .expectOne(`${URL}/confirm`)
        .flush(apiError({ status: 409, code: 'NO_AVAILABLE_SPOTS', message: 'del servidor' }), {
          status: 409,
          statusText: 'Conflict',
        });
      await fixture.whenStable();
      expect(el().querySelector('[role=alert]')?.textContent).toContain('Elige otro grupo');
      expect(notices).toEqual([]);
      expect(buttonByText('Confirmar inscripción')!.disabled).toBe(false);
    });

    it('shows an error of the payment under its field and confirms nothing', async () => {
      await setup();
      await checkPayment();
      await submitPayment();
      backend
        .expectOne(`${URL}/confirm`)
        .flush(apiError({ status: 422, code: 'FUTURE_DATE', message: 'del servidor' }), {
          status: 422,
          statusText: 'Unprocessable',
        });
      await fixture.whenStable();
      expect(el().querySelector('#paymentDate-error')?.textContent).toContain('posterior a hoy');
      expect(el().querySelector('[role=alert]')).toBeNull();
      expect(notices).toEqual([]);
    });

    it('shows an error of the payment that belongs to no field above the form', async () => {
      await setup();
      await checkPayment();
      await submitPayment();
      backend
        .expectOne(`${URL}/confirm`)
        .flush(apiError({ status: 409, code: 'INVALID_STATE', message: 'del servidor' }), {
          status: 409,
          statusText: 'Conflict',
        });
      await fixture.whenStable();
      expect(el().querySelector('[role=alert]')?.textContent).toContain('ya cambió de estado');
    });
  });

  describe('rejecting', () => {
    it('requires a reason before asking for confirmation', async () => {
      await setup();
      buttonByText('Rechazar solicitud')!.click();
      await fixture.whenStable();
      expect(el().querySelector('#reason-error')?.textContent).toContain('obligatorio');
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
    });

    it('does not accept a reason with only spaces', async () => {
      await setup();
      await type('reason', '    ');
      buttonByText('Rechazar solicitud')!.click();
      await fixture.whenStable();
      expect(el().querySelector('#reason-error')).not.toBeNull();
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
    });

    it('limits the reason to 500 characters', async () => {
      await setup();
      await type('reason', 'a'.repeat(501));
      buttonByText('Rechazar solicitud')!.click();
      await fixture.whenStable();
      expect(el().querySelector('#reason-error')?.textContent).toContain('500');
    });

    it('asks for confirmation and, once confirmed, rejects with the reason', async () => {
      await setup();
      await type('reason', 'El deportista no cumple la edad del grupo');
      buttonByText('Rechazar solicitud')!.click();
      await fixture.whenStable();
      expect(el().querySelector('app-confirm-dialog')).not.toBeNull();
      backend.expectNone(`${URL}/reject`);

      buttonByText('Sí, rechazar')!.click();
      const request = backend.expectOne(`${URL}/reject`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ reason: 'El deportista no cumple la edad del grupo' });
      request.flush(enrollmentDetail({ status: 'REJECTED' }));
      await fixture.whenStable();
      expect(notices).toEqual(['La solicitud se rechazó y el cupo quedó libre.']);
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
    });

    it('rejects nothing if the administrator goes back', async () => {
      await setup();
      await type('reason', 'Motivo');
      buttonByText('Rechazar solicitud')!.click();
      await fixture.whenStable();
      buttonByText('Volver')!.click();
      await fixture.whenStable();
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
      backend.expectNone(`${URL}/reject`);
    });

    it('shows the error and closes the dialog when the server refuses', async () => {
      await setup();
      await type('reason', 'Motivo');
      buttonByText('Rechazar solicitud')!.click();
      await fixture.whenStable();
      buttonByText('Sí, rechazar')!.click();
      backend
        .expectOne(`${URL}/reject`)
        .flush(apiError({ status: 409, code: 'INVALID_STATE', message: 'del servidor' }), {
          status: 409,
          statusText: 'Conflict',
        });
      await fixture.whenStable();
      expect(el().querySelector('[role=alert]')?.textContent).toContain('ya cambió de estado');
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
      expect(notices).toEqual([]);
    });
  });
});
