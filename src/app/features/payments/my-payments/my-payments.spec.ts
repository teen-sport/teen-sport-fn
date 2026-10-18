import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import { page, payment } from '../../../../testing/guardian-fixtures';
import { MyPayments } from './my-payments';

const URL = `${environment.apiBaseUrl}/payments`;

describe('MyPayments', () => {
  let fixture: ComponentFixture<MyPayments>;
  let backend: HttpTestingController;

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [MyPayments],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(MyPayments);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = () => backend.expectOne((req) => req.url === URL);

  afterEach(() => backend.verify());

  it('asks for the first page of 10 payments', async () => {
    await setup();
    const request = list();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    request.flush(page([]));
  });

  it('shows each payment with the month it covers, the amount and the receipt', async () => {
    await setup();
    list().flush(page([payment(), payment({ id: 32, period: '2026-12', receiptReference: null })]));
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    const first = rows[0].textContent?.replace(/\s+/g, ' ') ?? '';
    expect(first).toContain('Noviembre de 2026');
    expect(first).toContain('Sofía Pérez');
    expect(first).toContain('Fútbol');
    expect(first).toMatch(/\$ ?120\.000/);
    expect(first).toContain('3 de noviembre de 2026');
    expect(first).toContain('R-0042');
    expect(rows[1].textContent).toContain('—');
  });

  it('says there are no payments yet', async () => {
    await setup();
    list().flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('table')).toBeNull();
    expect(el().querySelector('.empty-state')?.textContent).toContain('Todavía no hay pagos');
  });

  it('moves between pages', async () => {
    await setup();
    list().flush(page([payment()], { totalPages: 2, totalElements: 14 }));
    await fixture.whenStable();
    const next = Array.from(
      el().querySelectorAll<HTMLButtonElement>('app-pagination button'),
    ).pop()!;
    next.click();
    await fixture.whenStable();
    const request = list();
    expect(request.request.params.get('page')).toBe('1');
    request.flush(page([payment({ id: 40 })], { page: 1, totalPages: 2, totalElements: 14 }));
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
    list().flush(page([payment()]));
    await fixture.whenStable();
    expect(el().querySelectorAll('tbody tr').length).toBe(1);
  });
});
