import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { adminUser, guardianUser } from '../../../../testing/admin-fixtures';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { AdminForm } from './admin-form';

const USERS = `${environment.apiBaseUrl}/users`;

describe('AdminForm', () => {
  let fixture: ComponentFixture<AdminForm>;
  let backend: HttpTestingController;
  let router: Router;

  async function setup(id: string | null = null): Promise<void> {
    TestBed.configureTestingModule({
      imports: [AdminForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id === null ? {} : { id }) } },
        },
      ],
    });
    fixture = TestBed.createComponent(AdminForm);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (id: string) => el().querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;

  function type(id: string, value: string): void {
    const control = field(id);
    control.value = value;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
  }

  async function submit(): Promise<void> {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  function fillValid(): void {
    type('firstNames', ' Laura ');
    type('lastNames', 'Gómez');
    type('idNumber', '1000000002');
    type('email', ' laura@correo.com ');
    type('phone', '3009876543');
    type('password', 'Clave-segura1');
  }

  afterEach(() => backend.verify());

  describe('creating', () => {
    it('shows the password and its rules, and sends nothing when the form is empty', async () => {
      await setup();
      expect(el().querySelector('h1')?.textContent).toContain('Nuevo administrador');
      expect(field('password')).toBeTruthy();
      expect(el().querySelectorAll('#password-rules li').length).toBe(5);
      await submit();
      expect(el().querySelector('#firstNames-error')?.textContent).toContain('obligatorio');
      expect(el().querySelector('#email-error')).toBeTruthy();
      expect(el().querySelector('#password-error')).toBeTruthy();
      backend.expectNone(USERS);
    });

    it('marks the password rules as they are met', async () => {
      await setup();
      type('password', 'Abcdefg1!');
      await fixture.whenStable();
      expect(el().querySelectorAll('#password-rules li.met').length).toBe(5);
    });

    it('rejects a weak password without calling the API', async () => {
      await setup();
      fillValid();
      type('password', 'clave');
      await submit();
      expect(el().querySelector('#password-error')?.textContent).toContain('no cumple');
      backend.expectNone(USERS);
    });

    it('rejects a password longer than 72 bytes without calling the API', async () => {
      await setup();
      fillValid();
      type('password', 'Aa1!' + 'ñ'.repeat(40));
      await submit();
      expect(el().querySelector('#password-error')?.textContent).toContain('demasiado larga');
      backend.expectNone(USERS);
    });

    it('rejects an email that is not valid', async () => {
      await setup();
      fillValid();
      type('email', 'no-es-correo');
      await submit();
      expect(el().querySelector('#email-error')?.textContent).toContain('correo válido');
      backend.expectNone(USERS);
    });

    it('sends the trimmed data with the ADMIN role and goes back to the list', async () => {
      await setup();
      fillValid();
      await submit();

      const request = backend.expectOne(USERS);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        role: 'ADMIN',
        firstNames: 'Laura',
        lastNames: 'Gómez',
        idType: 'CC',
        idNumber: '1000000002',
        email: 'laura@correo.com',
        phone: '3009876543',
        password: 'Clave-segura1',
      });
      request.flush(adminUser(), { status: 201, statusText: 'Created' });
      expect(router.navigate).toHaveBeenCalledWith(['/admin/users'], {
        queryParams: { saved: 'created' },
      });
    });

    it('does not send a second request while the first one is in progress', async () => {
      await setup();
      fillValid();
      await submit();
      await submit();
      const request = backend.expectOne(USERS);
      request.flush(adminUser(), { status: 201, statusText: 'Created' });
    });

    it.each([
      ['EMAIL_ALREADY_REGISTERED', 'email', 'Ya existe una cuenta con ese correo.'],
      [
        'ID_NUMBER_ALREADY_REGISTERED',
        'idNumber',
        'Ya existe una cuenta con ese número de documento.',
      ],
      ['WEAK_PASSWORD', 'password', 'Contraseña débil'],
    ] as const)('puts the %s error on its field', async (code, fieldId, message) => {
      await setup();
      fillValid();
      await submit();
      failWith(backend, '/users', apiError({ status: 409, code, message }));
      await fixture.whenStable();
      expect(el().querySelector(`#${fieldId}-error`)?.textContent).toContain(message);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('shows a general error above the form when the server fails', async () => {
      await setup();
      fillValid();
      await submit();
      failWith(
        backend,
        '/users',
        apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla del servidor' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('form .alert')?.textContent).toContain('Falla del servidor');
      expect(field('firstNames').value).toBe(' Laura ');
    });
  });

  describe('editing', () => {
    it('loads the administrator, locks the document and does not ask for a password', async () => {
      await setup('11');
      backend.expectOne(`${USERS}/11`).flush(adminUser());
      await fixture.whenStable();

      expect(el().querySelector('h1')?.textContent).toContain('Editar administrador');
      expect(field('firstNames').value).toBe('Laura');
      expect(field('idNumber').value).toBe('1000000002');
      expect(field('idNumber').disabled).toBe(true);
      expect(field('idType').disabled).toBe(true);
      expect(el().querySelector('#password')).toBeNull();
    });

    it('saves with PUT and without document, role or password', async () => {
      await setup('11');
      backend.expectOne(`${USERS}/11`).flush(adminUser());
      await fixture.whenStable();

      type('phone', '3109998877');
      await submit();
      const request = backend.expectOne(`${USERS}/11`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({
        firstNames: 'Laura',
        lastNames: 'Gómez',
        email: 'laura@correo.com',
        phone: '3109998877',
      });
      request.flush(adminUser());
      expect(router.navigate).toHaveBeenCalledWith(['/admin/users'], {
        queryParams: { saved: 'updated' },
      });
    });

    it('refuses to edit an account that is not an administrator', async () => {
      await setup('21');
      backend.expectOne(`${USERS}/21`).flush(guardianUser());
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('no es de un administrador');
      expect(el().querySelector('form')).toBeNull();
      expect(el().querySelector('a[href="/admin/users"]')).toBeTruthy();
    });

    it('shows an error with a way back when the administrator cannot be loaded', async () => {
      await setup('99');
      failWith(
        backend,
        '/users/99',
        apiError({ status: 404, code: 'NOT_FOUND', message: 'Usuario no encontrado' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('no encontrado');
      expect(el().querySelector('a[href="/admin/users"]')).toBeTruthy();
    });

    it('does not call the API when the id in the address is not a number', async () => {
      await setup('abc');
      expect(el().querySelector('.alert')?.textContent).toContain('no existe');
      backend.expectNone(`${USERS}/abc`);
    });
  });
});
