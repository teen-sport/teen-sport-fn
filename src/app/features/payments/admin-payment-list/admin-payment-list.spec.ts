import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import { page, payment } from '../../../../testing/guardian-fixtures';
import { AdminPaymentList } from './admin-payment-list';

const URL = `${environment.apiBaseUrl}/payments`;

describe('AdminPaymentList', () => {
  let fixture: ComponentFixture<AdminPaymentList>;
  let backend: HttpTestingController;

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [AdminPaymentList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(AdminPaymentList);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  const list = () => backend.expectOne((req) => req.url === URL);
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const setDate = async (id: string, value: string): Promise<void> => {
    const input = el().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  it('asks for the first page of 10 payments without dates', async () => {
    await setup();
    const request = list();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.has('from')).toBe(false);
    expect(request.request.params.has('to')).toBe(false);
    request.flush(page([]));
  });

  it('shows each payment with its athlete, amount and a link to its enrollment', async () => {
    await setup();
    list().flush(page([payment(), payment({ id: 32, enrollmentId: 22, receiptReference: null })]));
    await fixture.whenStable();
    const rows = el().querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('3 de noviembre de 2026');
    expect(rows[0].textContent).toContain('Sofía Pérez');
    expect(rows[0].textContent).toContain('Fútbol');
    expect(rows[0].textContent).toContain('Noviembre de 2026');
    expect(rows[0].textContent).toContain('120.000');
    expect(rows[0].textContent).toContain('R-0042');
    expect(rows[0].textContent).toContain('Admin TeenSport');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/admin/enrollments/21');
    expect(rows[1].querySelector('a')?.getAttribute('href')).toBe('/admin/enrollments/22');
    expect(rows[1].textContent).toContain('—');
  });

  it('filters by date range and goes back to the first page', async () => {
    await setup();
    list().flush(page([payment()]));
    await fixture.whenStable();
    await setDate('from', '2026-11-01');
    list().flush(page([]));
    await fixture.whenStable();
    await setDate('to', '2026-11-30');
    const request = list();
    expect(request.request.params.get('from')).toBe('2026-11-01');
    expect(request.request.params.get('to')).toBe('2026-11-30');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page([]));
  });

  it('does not ask the server for a range that goes backwards', async () => {
    await setup();
    list().flush(page([payment()]));
    await fixture.whenStable();
    await setDate('from', '2026-12-01');
    list().flush(page([]));
    await fixture.whenStable();
    await setDate('to', '2026-11-01');
    backend.expectNone((req) => req.url === URL);
    expect(el().querySelector('[role=alert]')?.textContent).toContain('no puede ser posterior');
  });

  it('says that no payment falls in the range and offers to clear it', async () => {
    await setup();
    list().flush(page([payment()]));
    await fixture.whenStable();
    await setDate('from', '2030-01-01');
    list().flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain(
      'No hay pagos en esas fechas',
    );

    el().querySelector<HTMLButtonElement>('.empty-state button')!.click();
    await fixture.whenStable();
    const request = list();
    expect(request.request.params.has('from')).toBe(false);
    request.flush(page([payment()]));
  });

  it('says that there are no payments yet when nothing is filtered', async () => {
    await setup();
    list().flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('Todavía no hay pagos');
  });

  it('goes to another page', async () => {
    await setup();
    list().flush(page([payment()], { totalPages: 2, totalElements: 12 }));
    await fixture.whenStable();
    Array.from(el().querySelectorAll<HTMLButtonElement>('app-pagination button'))
      .find((button) => button.textContent?.includes('Siguiente'))!
      .click();
    const request = list();
    expect(request.request.params.get('page')).toBe('1');
    request.flush(page([], { page: 1, totalPages: 2 }));
  });

  it('shows the error and tries again', async () => {
    await setup();
    list().flush(
      apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor.' }),
      {
        status: 500,
        statusText: 'Server Error',
      },
    );
    await fixture.whenStable();
    expect(el().querySelector('[role=alert]')?.textContent).toContain('Error del servidor.');
    el().querySelector<HTMLButtonElement>('button')!.click();
    list().flush(page([payment()]));
    await fixture.whenStable();
    expect(el().querySelectorAll('tbody tr')).toHaveLength(1);
  });
});
