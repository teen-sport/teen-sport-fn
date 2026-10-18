import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import {
  discipline,
  enrollmentDetail,
  groupAvailability,
  page,
} from '../../../../testing/guardian-fixtures';
import { currentPeriod } from '../../../shared/format';
import { AdminEnrollmentView } from './admin-enrollment-view';

const API = environment.apiBaseUrl;
const ENROLLMENT = `${API}/enrollments/21`;

describe('AdminEnrollmentView', () => {
  let fixture: ComponentFixture<AdminEnrollmentView>;
  let backend: HttpTestingController;

  async function setup(id = '21'): Promise<void> {
    TestBed.configureTestingModule({
      imports: [AdminEnrollmentView],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
        },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminEnrollmentView);
    await fixture.whenStable();
  }

  /** Responde la mensualidad de la disciplina y los grupos con cupo. */
  async function answerHelpers(period = '2026-11'): Promise<void> {
    backend.expectOne(`${API}/disciplines/1`).flush(discipline());
    const availability = backend.expectOne((req) => req.url === `${API}/availability`);
    expect(availability.request.params.get('period')).toBe(period);
    expect(availability.request.params.get('disciplineId')).toBe('1');
    availability.flush([
      groupAvailability(),
      groupAvailability({ groupId: 12, groupName: 'Fútbol sub-17' }),
    ]);
    await fixture.whenStable();
  }

  async function open(
    overrides: Parameters<typeof enrollmentDetail>[0] = {},
    answerPayments = true,
  ): Promise<void> {
    await setup();
    backend.expectOne(ENROLLMENT).flush(enrollmentDetail(overrides));
    await fixture.whenStable();
    if (['PENDING_REVIEW', 'ACTIVE'].includes(overrides.status ?? 'PENDING_REVIEW')) {
      await answerHelpers();
    }
    if (answerPayments && overrides.status === 'ACTIVE') {
      backend.expectOne((req) => req.url === `${API}/payments`).flush(page([]));
      await fixture.whenStable();
    }
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const buttonByText = (text: string): HTMLButtonElement | undefined =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );

  afterEach(() => backend.verify());

  it('shows the data of the enrollment', async () => {
    await open();
    const details = el().querySelector('.details')!.textContent!;
    expect(details).toContain('Sofía Pérez');
    expect(details).toContain('Fútbol');
    expect(details).toContain('Fútbol sub-15');
    expect(details).toContain('Noviembre de 2026');
    expect(details).toContain('En revisión');
    expect(details).toContain('Lunes 16:00 – 17:30');
    expect(el().querySelector('a[href="/admin/enrollments"]')).not.toBeNull();
  });

  it('shows when it was confirmed and the notes of the review', async () => {
    await open({
      status: 'ACTIVE',
      confirmedAt: '2026-10-17T15:00:00Z',
      reviewNotes: 'Pago en caja',
    });
    expect(el().querySelector('.details')?.textContent).toContain('17 de octubre de 2026');
    expect(el().querySelector('.review-notes')?.textContent).toContain('Pago en caja');
  });

  it('shows that the guardian reported a payment', async () => {
    await open({ status: 'ACTIVE', paymentReported: true });
    expect(el().querySelector('.details .reported')?.textContent).toContain('Pago avisado');
  });

  describe('by status', () => {
    it('offers to confirm or reject a request in review, and nothing else', async () => {
      await open();
      expect(el().querySelector('app-enrollment-review')).not.toBeNull();
      expect(el().querySelector('app-enrollment-payments')).toBeNull();
      expect(el().querySelector('app-enrollment-group-change')).toBeNull();
      expect(buttonByText('Cancelar inscripción')).toBeUndefined();
    });

    it('offers payments, a change of group and cancelling for an active one', async () => {
      await open({ status: 'ACTIVE' });
      expect(el().querySelector('app-enrollment-review')).toBeNull();
      expect(el().querySelector('app-enrollment-payments')).not.toBeNull();
      expect(el().querySelector('app-enrollment-group-change')).not.toBeNull();
      expect(buttonByText('Cancelar inscripción')).toBeDefined();
    });

    it.each(['REJECTED', 'CANCELLED'] as const)('only shows a %s enrollment', async (status) => {
      await open({ status });
      expect(el().querySelector('app-enrollment-review')).toBeNull();
      expect(el().querySelector('app-enrollment-payments')).toBeNull();
      expect(el().querySelector('app-enrollment-group-change')).toBeNull();
      expect(buttonByText('Cancelar inscripción')).toBeUndefined();
      expect(el().querySelector('.status-help')?.textContent).toContain('estado final');
    });
  });

  describe('helpers of the panels', () => {
    it('uses the month of the enrollment to ask for the spots', async () => {
      await setup();
      backend.expectOne(ENROLLMENT).flush(enrollmentDetail({ period: '2999-01' }));
      await fixture.whenStable();
      await answerHelpers('2999-01');
    });

    it('asks for the current month when the enrollment started in a month that has passed', async () => {
      await setup();
      backend.expectOne(ENROLLMENT).flush(enrollmentDetail({ period: '2020-01' }));
      await fixture.whenStable();
      await answerHelpers(currentPeriod());
    });

    it('passes the monthly fee and the groups to the panel', async () => {
      await open();
      const select = el().querySelector<HTMLSelectElement>('#groupId')!;
      expect(Array.from(select.options).map((o) => o.textContent!.trim())).toEqual([
        'Mantener Fútbol sub-15',
        'Fútbol sub-17 · 6 cupos libres',
      ]);
    });

    it('keeps working, with a warning, when the fee or the spots cannot be loaded', async () => {
      await setup();
      backend.expectOne(ENROLLMENT).flush(enrollmentDetail());
      await fixture.whenStable();
      backend
        .expectOne(`${API}/disciplines/1`)
        .flush(apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor.' }), {
          status: 500,
          statusText: 'Server Error',
        });
      backend.expectOne((req) => req.url === `${API}/availability`).flush([]);
      await fixture.whenStable();
      expect(el().textContent).toContain('No se pudieron cargar la mensualidad');
      expect(el().querySelector('app-enrollment-review')).not.toBeNull();
    });
  });

  describe('after an action of a panel', () => {
    it('shows the notice and the state that the server now reports', async () => {
      await open();
      buttonByText('Confirmar inscripción')!.click();
      backend.expectOne(`${ENROLLMENT}/confirm`).flush(enrollmentDetail({ status: 'ACTIVE' }));
      await fixture.whenStable();

      backend.expectOne(ENROLLMENT).flush(enrollmentDetail({ status: 'ACTIVE' }));
      await fixture.whenStable();
      await answerHelpers();
      backend.expectOne((req) => req.url === `${API}/payments`).flush(page([]));
      await fixture.whenStable();

      expect(el().querySelector('.notice')?.textContent).toContain('Inscripción confirmada');
      expect(el().querySelector('.details')?.textContent).toContain('Activa');
      expect(el().querySelector('app-enrollment-review')).toBeNull();
      expect(el().querySelector('app-enrollment-payments')).not.toBeNull();
    });

    it('keeps the notice and shows an error if it cannot reload the enrollment', async () => {
      await open();
      buttonByText('Confirmar inscripción')!.click();
      backend.expectOne(`${ENROLLMENT}/confirm`).flush(enrollmentDetail({ status: 'ACTIVE' }));
      await fixture.whenStable();
      backend
        .expectOne(ENROLLMENT)
        .flush(apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor.' }), {
          status: 500,
          statusText: 'Server Error',
        });
      await fixture.whenStable();
      expect(el().querySelector('.notice')?.textContent).toContain('Inscripción confirmada');
      expect(el().querySelector('[role=alert]')?.textContent).toContain('Error del servidor.');
    });
  });

  describe('cancelling an active enrollment', () => {
    it('asks for confirmation with an optional reason and cancels it', async () => {
      await open({ status: 'ACTIVE' });
      buttonByText('Cancelar inscripción')!.click();
      await fixture.whenStable();
      expect(el().querySelector('app-confirm-dialog')).not.toBeNull();
      backend.expectNone(`${ENROLLMENT}/cancel`);

      const reason = el().querySelector<HTMLTextAreaElement>('app-confirm-dialog textarea')!;
      reason.value = 'El acudiente se mudó';
      reason.dispatchEvent(new Event('input'));
      buttonByText('Sí, cancelar inscripción')!.click();
      const request = backend.expectOne(`${ENROLLMENT}/cancel`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ reason: 'El acudiente se mudó' });
      request.flush(enrollmentDetail({ status: 'CANCELLED' }));
      await fixture.whenStable();

      backend.expectOne(ENROLLMENT).flush(enrollmentDetail({ status: 'CANCELLED' }));
      await fixture.whenStable();
      expect(el().querySelector('.notice')?.textContent).toContain('se canceló');
      expect(el().querySelector('.details')?.textContent).toContain('Cancelada');
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
    });

    it('cancels nothing if the administrator goes back', async () => {
      await open({ status: 'ACTIVE' });
      buttonByText('Cancelar inscripción')!.click();
      await fixture.whenStable();
      buttonByText('No, volver')!.click();
      await fixture.whenStable();
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
      backend.expectNone(`${ENROLLMENT}/cancel`);
    });

    it('shows the error and closes the dialog when the server refuses', async () => {
      await open({ status: 'ACTIVE' });
      buttonByText('Cancelar inscripción')!.click();
      await fixture.whenStable();
      buttonByText('Sí, cancelar inscripción')!.click();
      backend
        .expectOne(`${ENROLLMENT}/cancel`)
        .flush(apiError({ status: 409, code: 'INVALID_STATE', message: 'del servidor' }), {
          status: 409,
          statusText: 'Conflict',
        });
      await fixture.whenStable();
      expect(el().querySelector('[role=alert]')?.textContent).toContain('ya cambió de estado');
      expect(el().querySelector('app-confirm-dialog')).toBeNull();
    });
  });

  describe('loading problems', () => {
    it('says that the enrollment does not exist when the address has no valid id', async () => {
      await setup('abc');
      expect(el().querySelector('[role=alert]')?.textContent).toContain('no existe');
    });

    it('explains a 404 and offers to go back', async () => {
      await setup();
      backend
        .expectOne(ENROLLMENT)
        .flush(apiError({ status: 404, code: 'NOT_FOUND', message: 'del servidor' }), {
          status: 404,
          statusText: 'Not Found',
        });
      await fixture.whenStable();
      expect(el().querySelector('[role=alert]')?.textContent).toContain('No se encontró');
      expect(el().querySelector('a[href="/admin/enrollments"]')).not.toBeNull();
    });

    it('tries again after a network error', async () => {
      await setup();
      backend.expectOne(ENROLLMENT).error(new ProgressEvent('error'));
      await fixture.whenStable();
      expect(el().querySelector('[role=alert]')?.textContent).toContain('No se pudo conectar');
      buttonByText('Reintentar')!.click();
      backend.expectOne(ENROLLMENT).flush(enrollmentDetail({ status: 'REJECTED' }));
      await fixture.whenStable();
      expect(el().querySelector('.details')?.textContent).toContain('Rechazada');
    });
  });
});
