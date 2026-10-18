import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { enrollmentDetail } from '../../../../testing/guardian-fixtures';
import { EnrollmentDetail } from '../enrollment.models';
import { EnrollmentView } from './enrollment-view';

const URL = `${environment.apiBaseUrl}/enrollments`;

describe('EnrollmentView', () => {
  let fixture: ComponentFixture<EnrollmentView>;
  let backend: HttpTestingController;

  async function setup(
    id = '21',
    queryParams: Record<string, string> = {},
    detail: EnrollmentDetail | null = enrollmentDetail(),
  ): Promise<void> {
    TestBed.configureTestingModule({
      imports: [EnrollmentView],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id }),
              queryParamMap: convertToParamMap(queryParams),
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(EnrollmentView);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    if (detail) {
      backend.expectOne(`${URL}/${id}`).flush(detail);
      await fixture.whenStable();
    }
  }

  const active = (overrides: Partial<EnrollmentDetail> = {}): EnrollmentDetail =>
    enrollmentDetail({ status: 'ACTIVE', paymentStatus: 'OVERDUE', ...overrides });

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (): string => el().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(label),
    );

  afterEach(() => backend.verify());

  describe('reading', () => {
    it('shows the data of the enrollment', async () => {
      await setup();
      const content = text();
      expect(content).toContain('Sofía Pérez');
      expect(content).toContain('Fútbol sub-15');
      expect(content).toContain('Noviembre de 2026');
      expect(content).toContain('En revisión');
      expect(content).toContain('Pago pendiente');
      expect(content).toContain('Lunes 16:00 – 17:30');
      expect(content).toContain('Miércoles 16:00 – 17:30');
      expect(content).toContain('16 de octubre de 2026');
    });

    it('explains what the status means', async () => {
      await setup();
      expect(el().querySelector('.status-help')?.textContent).toContain('revisando tu solicitud');
    });

    it('welcomes a request that was just sent', async () => {
      await setup('21', { requested: '1' });
      expect(el().querySelector('.notice')?.textContent).toContain('Solicitud enviada');
    });

    it('shows the note left on the enrollment', async () => {
      await setup('21', {}, enrollmentDetail({ status: 'REJECTED', reviewNotes: 'Grupo lleno.' }));
      expect(el().querySelector('.review-notes')?.textContent).toContain('Grupo lleno.');
    });

    it('shows the error and a retry when the enrollment cannot be loaded', async () => {
      await setup('21', {}, null);
      failWith(
        backend,
        '/enrollments/21',
        apiError({ status: 403, code: 'ACCESS_DENIED', message: 'No tienes acceso.' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('No tienes acceso.');

      button('Reintentar')!.click();
      await fixture.whenStable();
      backend.expectOne(`${URL}/21`).flush(enrollmentDetail());
      await fixture.whenStable();
      expect(el().querySelector('.alert')).toBeNull();
      expect(text()).toContain('Sofía Pérez');
    });

    it('does not call the server when the id in the address is not valid', async () => {
      await setup('abc', {}, null);
      expect(text()).toContain('La inscripción no existe.');
      backend.expectNone(`${URL}/abc`);
    });
  });

  describe('what can be done in each state', () => {
    it('lets the guardian cancel while in review, but not report a payment yet', async () => {
      await setup();
      expect(button('Cancelar inscripción')).toBeTruthy();
      expect(button('Ya pagué')).toBeUndefined();
      expect(el().querySelector('#paymentNote')).toBeNull();
      expect(el().querySelector('.payment')?.textContent).toContain(
        'Podrás avisar tu pago cuando la academia confirme',
      );
    });

    it('does not let the guardian cancel an active enrollment and says whom to ask', async () => {
      await setup('21', {}, active());
      expect(button('Cancelar inscripción')).toBeUndefined();
      expect(button('Ya pagué')).toBeTruthy();
      expect(text()).toContain('comunícate con la academia');
    });

    it('does not offer to report a payment when it is already up to date', async () => {
      await setup('21', {}, active({ paymentStatus: 'UP_TO_DATE' }));
      expect(button('Ya pagué')).toBeUndefined();
      expect(el().querySelector('#paymentNote')).toBeNull();
      expect(el().querySelector('.payment')?.textContent).toContain('Tu pago está al día');
    });

    it.each(['REJECTED', 'CANCELLED'] as const)(
      'offers no action and no payment section for a %s enrollment',
      async (status) => {
        await setup('21', {}, enrollmentDetail({ status }));
        expect(button('Cancelar inscripción')).toBeUndefined();
        expect(button('Ya pagué')).toBeUndefined();
        expect(el().querySelector('.payment')).toBeNull();
      },
    );
  });

  describe('cancelling', () => {
    async function openDialog(): Promise<void> {
      button('Cancelar inscripción')!.click();
      await fixture.whenStable();
    }

    it('asks for confirmation before doing anything', async () => {
      await setup();
      await openDialog();
      expect(el().querySelector('[role="dialog"]')).toBeTruthy();
      expect(el().querySelector('[role="dialog"]')?.textContent).toContain(
        '¿Cancelar la inscripción?',
      );
      backend.expectNone(`${URL}/21/cancel`);
    });

    it('closes the dialog without cancelling when the guardian goes back', async () => {
      await setup();
      await openDialog();
      button('No, volver')!.click();
      await fixture.whenStable();
      expect(el().querySelector('[role="dialog"]')).toBeNull();
      expect(text()).toContain('En revisión');
    });

    it('cancels with the reason and shows the new state', async () => {
      await setup();
      await openDialog();
      const reason = el().querySelector<HTMLTextAreaElement>('#confirm-reason')!;
      reason.value = 'Cambio de horario';
      reason.dispatchEvent(new Event('input'));
      button('Sí, cancelar inscripción')!.click();
      await fixture.whenStable();

      const request = backend.expectOne(`${URL}/21/cancel`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ reason: 'Cambio de horario' });
      request.flush(enrollmentDetail({ status: 'CANCELLED', reviewNotes: 'Cambio de horario' }));
      await fixture.whenStable();

      expect(el().querySelector('[role="dialog"]')).toBeNull();
      expect(el().querySelector('.notice')?.textContent).toContain('se canceló');
      expect(text()).toContain('Cancelada');
      expect(button('Cancelar inscripción')).toBeUndefined();
      expect(el().querySelector('.payment')).toBeNull();
    });

    it('cancels without a reason when none is written', async () => {
      await setup();
      await openDialog();
      button('Sí, cancelar inscripción')!.click();
      await fixture.whenStable();
      const request = backend.expectOne(`${URL}/21/cancel`);
      expect(request.request.body).toEqual({});
      request.flush(enrollmentDetail({ status: 'CANCELLED' }));
    });

    it('explains the problem and closes the dialog when the server refuses', async () => {
      await setup();
      await openDialog();
      button('Sí, cancelar inscripción')!.click();
      await fixture.whenStable();
      failWith(
        backend,
        '/enrollments/21/cancel',
        apiError({ status: 409, code: 'INVALID_STATE', message: 'Estado inválido.' }),
      );
      await fixture.whenStable();

      expect(el().querySelector('[role="dialog"]')).toBeNull();
      expect(el().querySelector('.alert')?.textContent).toContain('ya cambió de estado');
      expect(text()).toContain('En revisión');
    });
  });

  describe('reporting a payment', () => {
    it('sends the note and then shows that the academy was notified', async () => {
      await setup('21', {}, active());
      const note = el().querySelector<HTMLTextAreaElement>('#paymentNote')!;
      note.value = 'Pagué en caja el lunes';
      note.dispatchEvent(new Event('input'));
      button('Ya pagué')!.click();
      await fixture.whenStable();

      const request = backend.expectOne(`${URL}/21/payment-report`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ notes: 'Pagué en caja el lunes' });
      request.flush(active({ paymentReported: true }));
      await fixture.whenStable();

      expect(el().querySelector('.notice')?.textContent).toContain('avisamos a la academia');
      expect(el().querySelector('.payment')?.textContent).toContain('Ya avisaste que pagaste');
      expect(button('Ya pagué')).toBeUndefined();
      expect(el().querySelector('#paymentNote')).toBeNull();
    });

    it('can be sent without a note', async () => {
      await setup('21', {}, active());
      button('Ya pagué')!.click();
      await fixture.whenStable();
      const request = backend.expectOne(`${URL}/21/payment-report`);
      expect(request.request.body).toEqual({});
      request.flush(active({ paymentReported: true }));
    });

    it('does not offer the form when the payment was already reported', async () => {
      await setup('21', {}, active({ paymentReported: true }));
      expect(button('Ya pagué')).toBeUndefined();
      expect(el().querySelector('.payment')?.textContent).toContain('Ya avisaste que pagaste');
    });

    it('rejects a note longer than 255 characters without sending it', async () => {
      await setup('21', {}, active());
      const note = el().querySelector<HTMLTextAreaElement>('#paymentNote')!;
      note.value = 'x'.repeat(256);
      note.dispatchEvent(new Event('input'));
      button('Ya pagué')!.click();
      await fixture.whenStable();
      expect(el().querySelector('#paymentNote-error')?.textContent).toContain('Máximo 255');
      backend.expectNone(`${URL}/21/payment-report`);
    });

    it('explains when the academy already registered this month', async () => {
      await setup('21', {}, active());
      button('Ya pagué')!.click();
      await fixture.whenStable();
      failWith(
        backend,
        '/enrollments/21/payment-report',
        apiError({ status: 409, code: 'PAYMENT_ALREADY_REGISTERED', message: 'Ya hay un pago.' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('ya registró un pago');
      expect(button('Ya pagué')!.disabled).toBe(false);
    });
  });
});
