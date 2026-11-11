import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { adminUser, coachUser, guardianUser } from '../../../../testing/admin-fixtures';
import { apiError, failWith, loginResponse } from '../../../../testing/auth-fixtures';
import { page } from '../../../../testing/guardian-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { UserList } from './user-list';

const USERS = `${environment.apiBaseUrl}/users`;

describe('UserList', () => {
  let fixture: ComponentFixture<UserList>;
  let backend: HttpTestingController;

  async function setup(queryParams: Record<string, string> = {}): Promise<void> {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [UserList],
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
    // La sesión es la de un administrador con id 7 (ver loginResponse).
    TestBed.inject(SessionService).start(loginResponse('ADMIN'));
    fixture = TestBed.createComponent(UserList);
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

  it('asks for every role, 10 per page, and shows each account with its role', async () => {
    await setup();
    const request = list();
    expect(request.request.params.has('role')).toBe(false);
    expect(request.request.params.get('size')).toBe('10');
    request.flush(
      page([adminUser(), coachUser(), guardianUser({ status: 'INACTIVE' })], { totalElements: 3 }),
    );
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Laura Gómez');
    expect(rows[0].textContent).toContain('Administrador');
    expect(rows[1].textContent).toContain('Entrenador');
    expect(rows[2].textContent).toContain('Acudiente');
    expect(rows[2].textContent).toContain('Activar');
  });

  it('links each role to the place where it is edited, and none for the guardian', async () => {
    await setup();
    list().flush(page([adminUser(), coachUser(), guardianUser()]));
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/admin/users/11/edit');
    expect(rows[1].querySelector('a')?.getAttribute('href')).toBe('/admin/coaches/8/edit');
    expect(rows[2].querySelector('a')).toBeNull();
  });

  it('does not offer to deactivate the account of the person who is logged in', async () => {
    await setup();
    list().flush(page([adminUser({ id: 7 }), adminUser({ id: 11 })]));
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows[0].textContent).toContain('Tu cuenta');
    expect(rows[0].textContent).not.toContain('Desactivar');
    expect(rows[1].textContent).toContain('Desactivar');
  });

  it('keeps the row buttons apart in their own container', async () => {
    await setup();
    list().flush(page([adminUser({ id: 7 }), adminUser({ id: 11 })]));
    await fixture.whenStable();

    const actions = el().querySelectorAll('tbody tr')[1].querySelector('.row-actions')!;
    expect(actions.textContent).toContain('Editar');
    expect(actions.textContent).toContain('Desactivar');
  });

  it('invites to create an administrator and shows the empty message', async () => {
    await setup();
    list().flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('Todavía no hay usuarios');
    expect(el().querySelector('a[href="/admin/users/new"]')).toBeTruthy();
  });

  it('filters by role as soon as it changes and goes back to the first page', async () => {
    await setup();
    list().flush(page([adminUser()]));
    await fixture.whenStable();

    const select = el().querySelector<HTMLSelectElement>('#role')!;
    select.value = 'GUARDIAN';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const request = list();
    expect(request.request.params.get('role')).toBe('GUARDIAN');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('con esos filtros');
  });

  it('filters by status as soon as it changes', async () => {
    await setup();
    list().flush(page([adminUser()]));
    await fixture.whenStable();

    const select = el().querySelector<HTMLSelectElement>('#status')!;
    select.value = 'INACTIVE';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const request = list();
    expect(request.request.params.get('status')).toBe('INACTIVE');
    request.flush(page([]));
  });

  it('searches with the typed text', async () => {
    await setup();
    list().flush(page([adminUser()]));
    await fixture.whenStable();

    const input = el().querySelector<HTMLInputElement>('#search')!;
    input.value = ' laura ';
    input.dispatchEvent(new Event('input'));
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const request = list();
    expect(request.request.params.get('q')).toBe('laura');
    request.flush(page([adminUser()]));
  });

  it('clears every filter with only one request', async () => {
    await setup();
    list().flush(page([adminUser()]));
    await fixture.whenStable();
    const select = el().querySelector<HTMLSelectElement>('#role')!;
    select.value = 'COACH';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    list().flush(page([coachUser()]));
    await fixture.whenStable();

    buttonByText('Limpiar')!.click();
    const request = list();
    expect(request.request.params.has('role')).toBe(false);
    request.flush(page([adminUser()]));
  });

  it('goes to another page', async () => {
    await setup();
    list().flush(page([adminUser()], { totalPages: 2, totalElements: 12 }));
    await fixture.whenStable();
    buttonByText('Siguiente')!.click();
    const request = list();
    expect(request.request.params.get('page')).toBe('1');
    request.flush(page([adminUser()], { page: 1, totalPages: 2, totalElements: 12 }));
  });

  it('asks for confirmation before deactivating and warns that the session can last up to an hour', async () => {
    await setup();
    list().flush(page([guardianUser()]));
    await fixture.whenStable();

    buttonByText('Desactivar')!.click();
    await fixture.whenStable();
    const dialog = el().querySelector('[role="dialog"]')?.textContent;
    expect(dialog).toContain('Marta Pérez');
    expect(dialog).toContain('una hora');
    backend.expectNone(`${USERS}/21/status`);

    buttonByText('Sí, desactivar')!.click();
    const patch = backend.expectOne(`${USERS}/21/status`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'INACTIVE' });
    patch.flush(guardianUser({ status: 'INACTIVE' }));
    await fixture.whenStable();

    list().flush(page([guardianUser({ status: 'INACTIVE' })]));
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain('se desactivó');
    expect(el().querySelector('.notice')?.textContent).toContain('una hora');
  });

  it('closes the confirmation without calling the API when it is dismissed', async () => {
    await setup();
    list().flush(page([adminUser()]));
    await fixture.whenStable();
    buttonByText('Desactivar')!.click();
    await fixture.whenStable();
    buttonByText('Volver')!.click();
    await fixture.whenStable();
    expect(el().querySelector('[role="dialog"]')).toBeNull();
    backend.expectNone(`${USERS}/11/status`);
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
    list().flush(page([guardianUser({ status: 'INACTIVE' })]));
    await fixture.whenStable();
    buttonByText('Activar')!.click();
    const patch = backend.expectOne(`${USERS}/21/status`);
    expect(patch.request.body).toEqual({ status: 'ACTIVE' });
    patch.flush(guardianUser());
    await fixture.whenStable();
    list().flush(page([guardianUser()]));
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain('activo de nuevo');
  });

  it.each([
    ['created', 'Administrador creado'],
    ['updated', 'se actualizaron'],
  ])('shows the notice that comes after saving (%s)', async (saved, text) => {
    await setup({ saved });
    list().flush(page([adminUser()]));
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain(text);
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
