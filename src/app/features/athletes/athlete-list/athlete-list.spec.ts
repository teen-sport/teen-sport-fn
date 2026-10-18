import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import { athlete, page } from '../../../../testing/guardian-fixtures';
import { AthleteList } from './athlete-list';

const URL = `${environment.apiBaseUrl}/athletes`;

describe('AthleteList', () => {
  let fixture: ComponentFixture<AthleteList>;
  let backend: HttpTestingController;

  async function setup(queryParams: Record<string, string> = {}): Promise<void> {
    TestBed.configureTestingModule({
      imports: [AthleteList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });
    fixture = TestBed.createComponent(AthleteList);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = () => backend.expectOne((req) => req.url === URL);

  afterEach(() => backend.verify());

  it('asks for the first page of 10 and shows the athletes', async () => {
    await setup();
    const request = list();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    request.flush(
      page([athlete(), athlete({ id: 5, firstNames: 'Juan', hasActiveEnrollment: true })]),
    );
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Sofía Pérez');
    expect(rows[0].textContent).toContain('Tarjeta de identidad 1098765432');
    expect(rows[0].textContent).toContain('15 años');
    expect(rows[0].textContent).toContain('No');
    expect(rows[1].textContent).toContain('Sí');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/guardian/athletes/4/edit');
  });

  it('invites to register the first athlete when there are none', async () => {
    await setup();
    list().flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('table')).toBeNull();
    expect(el().querySelector('.empty-state')?.textContent).toContain('Todavía no has registrado');
    expect(el().querySelector('a[href="/guardian/athletes/new"]')).toBeTruthy();
  });

  it('searches with the typed text and goes back to the first page', async () => {
    await setup();
    list().flush(page([athlete()], { totalPages: 3, totalElements: 25 }));
    await fixture.whenStable();

    const input = el().querySelector<HTMLInputElement>('#search')!;
    input.value = '  sofía ';
    input.dispatchEvent(new Event('input'));
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const request = list();
    expect(request.request.params.get('q')).toBe('sofía');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('con esa búsqueda');
  });

  it('clears the search and lists everything again', async () => {
    await setup();
    list().flush(page([athlete()]));
    await fixture.whenStable();
    const input = el().querySelector<HTMLInputElement>('#search')!;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    list().flush(page([]));
    await fixture.whenStable();

    el().querySelector<HTMLButtonElement>('button.btn-secondary')!.click();
    await fixture.whenStable();
    expect(list().request.params.has('q')).toBe(false);
  });

  it('moves between pages', async () => {
    await setup();
    list().flush(page([athlete()], { totalPages: 2, totalElements: 12 }));
    await fixture.whenStable();

    const next = Array.from(
      el().querySelectorAll<HTMLButtonElement>('app-pagination button'),
    ).pop()!;
    next.click();
    await fixture.whenStable();
    const request = list();
    expect(request.request.params.get('page')).toBe('1');
    request.flush(page([athlete({ id: 8 })], { page: 1, totalPages: 2, totalElements: 12 }));
  });

  it('shows the error of the server and lets the user retry', async () => {
    await setup();
    const failure = apiError({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Error del servidor.',
    });
    list().flush(failure, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Error del servidor.');

    el().querySelector<HTMLButtonElement>('.alert + button')!.click();
    await fixture.whenStable();
    list().flush(page([athlete()]));
    await fixture.whenStable();
    expect(el().querySelector('.alert')).toBeNull();
    expect(el().querySelectorAll('tbody tr').length).toBe(1);
  });

  it.each([
    ['created', 'Deportista registrado'],
    ['updated', 'se actualizaron'],
  ])('shows a notice after saving (%s)', async (saved, text) => {
    await setup({ saved });
    list().flush(page([athlete()]));
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain(text);
  });
});
