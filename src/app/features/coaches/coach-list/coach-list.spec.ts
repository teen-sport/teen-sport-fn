import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { coachUser } from '../../../../testing/admin-fixtures';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { page } from '../../../../testing/guardian-fixtures';
import { CoachList } from './coach-list';

const USERS = `${environment.apiBaseUrl}/users`;

describe('CoachList', () => {
  let fixture: ComponentFixture<CoachList>;
  let backend: HttpTestingController;

  async function setup(queryParams: Record<string, string> = {}): Promise<void> {
    TestBed.configureTestingModule({
      imports: [CoachList],
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
    fixture = TestBed.createComponent(CoachList);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = () => backend.expectOne((req) => req.url === USERS);
  const buttonByText = (text: string): HTMLButtonElement | undefined =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );

  afterEach(() => backend.verify());

  it('asks only for coaches, 10 per page, and shows them', async () => {
    await setup();
    const request = list();
    expect(request.request.params.get('role')).toBe('COACH');
    expect(request.request.params.get('size')).toBe('10');
    request.flush(
      page([coachUser(), coachUser({ id: 9, firstNames: 'Laura', status: 'INACTIVE' })]),
    );
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Carlos Ruiz');
    expect(rows[0].textContent).toContain('Cédula de ciudadanía 1000000001');
    expect(rows[0].textContent).toContain('carlos@correo.com');
    expect(rows[0].textContent).toContain('Fútbol');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/admin/coaches/8/edit');
    expect(rows[0].textContent).toContain('Desactivar');
    expect(rows[1].textContent).toContain('Activar');
  });

  it('invites to create the first coach when there are none', async () => {
    await setup();
    list().flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('Crea el primero');
    expect(el().querySelector('a[href="/admin/coaches/new"]')).toBeTruthy();
  });

  it('searches with the typed text and goes back to the first page', async () => {
    await setup();
    list().flush(page([coachUser()], { totalPages: 3, totalElements: 25 }));
    await fixture.whenStable();

    const input = el().querySelector<HTMLInputElement>('#search')!;
    input.value = ' carlos ';
    input.dispatchEvent(new Event('input'));
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const request = list();
    expect(request.request.params.get('q')).toBe('carlos');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('con esos filtros');
  });

  it('filters by status as soon as it changes', async () => {
    await setup();
    list().flush(page([coachUser()]));
    await fixture.whenStable();

    const select = el().querySelector<HTMLSelectElement>('#status')!;
    select.value = 'INACTIVE';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const request = list();
    expect(request.request.params.get('status')).toBe('INACTIVE');
    request.flush(page([]));
  });

  it('goes to another page', async () => {
    await setup();
    list().flush(page([coachUser()], { totalPages: 2, totalElements: 12 }));
    await fixture.whenStable();
    buttonByText('Siguiente')!.click();
    const request = list();
    expect(request.request.params.get('page')).toBe('1');
    request.flush(page([coachUser()], { page: 1, totalPages: 2, totalElements: 12 }));
  });

  it('asks for confirmation before deactivating a coach', async () => {
    await setup();
    list().flush(page([coachUser()]));
    await fixture.whenStable();

    buttonByText('Desactivar')!.click();
    await fixture.whenStable();
    expect(el().querySelector('[role="dialog"]')?.textContent).toContain('Carlos Ruiz');
    backend.expectNone(`${USERS}/8/status`);

    buttonByText('Sí, desactivar')!.click();
    const patch = backend.expectOne(`${USERS}/8/status`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'INACTIVE' });
    patch.flush(coachUser({ status: 'INACTIVE' }));
    await fixture.whenStable();

    list().flush(page([coachUser({ status: 'INACTIVE' })]));
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain('se desactivó');
  });

  it('explains why a coach with active groups cannot be deactivated', async () => {
    await setup();
    list().flush(page([coachUser()]));
    await fixture.whenStable();
    buttonByText('Desactivar')!.click();
    await fixture.whenStable();
    buttonByText('Sí, desactivar')!.click();
    failWith(
      backend,
      '/users/8/status',
      apiError({ status: 409, code: 'COACH_HAS_ACTIVE_GROUPS', message: 'x' }),
    );
    await fixture.whenStable();

    expect(el().querySelector('.alert')?.textContent).toContain('grupos activos');
    expect(el().querySelector('[role="dialog"]')).toBeNull();
  });

  it('activates directly, with no confirmation', async () => {
    await setup();
    list().flush(page([coachUser({ status: 'INACTIVE' })]));
    await fixture.whenStable();
    buttonByText('Activar')!.click();
    const patch = backend.expectOne(`${USERS}/8/status`);
    expect(patch.request.body).toEqual({ status: 'ACTIVE' });
    patch.flush(coachUser());
    await fixture.whenStable();
    list().flush(page([coachUser()]));
  });

  it('shows the notice that comes after saving a coach', async () => {
    await setup({ saved: 'updated' });
    list().flush(page([coachUser()]));
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain('se actualizaron');
  });

  it('shows the error with a retry button when loading fails', async () => {
    await setup();
    const error = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla' });
    list().flush(error, { status: 500, statusText: error.code });
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Falla');
    buttonByText('Reintentar')!.click();
    list().flush(page([]));
  });
});
