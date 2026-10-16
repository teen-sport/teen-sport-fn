import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import { enrollmentSummary, page } from '../../../../testing/guardian-fixtures';
import { MyEnrollments } from './my-enrollments';

const URL = `${environment.apiBaseUrl}/enrollments`;

describe('MyEnrollments', () => {
  let fixture: ComponentFixture<MyEnrollments>;
  let backend: HttpTestingController;

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [MyEnrollments],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(MyEnrollments);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = () => backend.expectOne((req) => req.url === URL);

  afterEach(() => backend.verify());

  it('asks for the first page of 10 without a status filter', async () => {
    await setup();
    const request = list();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.has('status')).toBe(false);
    request.flush(page([]));
  });

  it('shows each enrollment with its status, payment and a link to the detail', async () => {
    await setup();
    list().flush(
      page([
        enrollmentSummary(),
        enrollmentSummary({
          id: 22,
          status: 'ACTIVE',
          paymentStatus: 'UP_TO_DATE',
          athlete: { id: 5, firstNames: 'Juan', lastNames: 'Pérez' },
        }),
      ]),
    );
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Sofía Pérez');
    expect(rows[0].textContent).toContain('Fútbol · Fútbol sub-15');
    expect(rows[0].textContent).toContain('Noviembre de 2026');
    expect(rows[0].textContent).toContain('En revisión');
    expect(rows[0].textContent).toContain('Pago pendiente');
    expect(rows[1].textContent).toContain('Activa');
    expect(rows[1].textContent).toContain('Al día');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/guardian/enrollments/21');
  });

  it('marks the enrollments whose payment was already reported', async () => {
    await setup();
    list().flush(page([enrollmentSummary({ paymentReported: true })]));
    await fixture.whenStable();
    expect(el().querySelector('.reported')?.textContent).toContain('Pago avisado');
  });

  it('does not show a payment status for a finished enrollment', async () => {
    await setup();
    list().flush(page([enrollmentSummary({ status: 'CANCELLED' })]));
    await fixture.whenStable();
    expect(el().querySelector('app-status-badge[kind="payment"]')).toBeNull();
    expect(el().querySelectorAll('tbody td')[3].textContent).toContain('—');
  });

  it('invites to look for a group when there are no enrollments', async () => {
    await setup();
    list().flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('Todavía no tienes');
    expect(el().querySelector('a[href="/guardian/groups"]')).toBeTruthy();
  });

  it('filters by status and goes back to the first page', async () => {
    await setup();
    list().flush(page([enrollmentSummary()], { totalPages: 3, totalElements: 25 }));
    await fixture.whenStable();

    const select = el().querySelector<HTMLSelectElement>('#status')!;
    select.value = 'ACTIVE';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const request = list();
    expect(request.request.params.get('status')).toBe('ACTIVE');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('con ese estado');
  });

  it('offers every status in the filter', async () => {
    await setup();
    list().flush(page([]));
    await fixture.whenStable();
    const labels = Array.from(el().querySelectorAll('#status option')).map((o) =>
      o.textContent?.trim(),
    );
    expect(labels).toEqual(['Todas', 'En revisión', 'Activa', 'Rechazada', 'Cancelada']);
  });

  it('moves between pages keeping the filter', async () => {
    await setup();
    list().flush(page([enrollmentSummary()], { totalPages: 2, totalElements: 12 }));
    await fixture.whenStable();
    const next = Array.from(
      el().querySelectorAll<HTMLButtonElement>('app-pagination button'),
    ).pop()!;
    next.click();
    await fixture.whenStable();
    const request = list();
    expect(request.request.params.get('page')).toBe('1');
    request.flush(
      page([enrollmentSummary({ id: 30 })], { page: 1, totalPages: 2, totalElements: 12 }),
    );
  });

  it('shows the error of the server and retries', async () => {
    await setup();
    list().flush(
      apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor.' }),
      {
        status: 500,
        statusText: 'Server Error',
      },
    );
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Error del servidor.');

    el().querySelector<HTMLButtonElement>('.alert + button')!.click();
    await fixture.whenStable();
    list().flush(page([enrollmentSummary()]));
    await fixture.whenStable();
    expect(el().querySelectorAll('tbody tr').length).toBe(1);
  });
});
