import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { coachUser } from '../../../../testing/admin-fixtures';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { CoachForm } from './coach-form';

const USERS = `${environment.apiBaseUrl}/users`;

describe('CoachForm', () => {
  let fixture: ComponentFixture<CoachForm>;
  let backend: HttpTestingController;
  let router: Router;

  async function setup(id: string | null = null): Promise<void> {
    TestBed.configureTestingModule({
      imports: [CoachForm],
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
    fixture = TestBed.createComponent(CoachForm);
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
    type('firstNames', ' Carlos ');
    type('lastNames', 'Ruiz');
    type('idNumber', '1000000001');
    type('email', ' carlos@correo.com ');
    type('phone', '3001234567');
    type('password', 'Clave-segura1');
  }

  afterEach(() => backend.verify());

  describe('creating', () => {
    it('shows the password and its rules, and sends nothing when the form is empty', async () => {
      await setup();
      expect(el().querySelector('h1')?.textContent).toContain('Nuevo entrenador');
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

    it('sends the trimmed data with the COACH role and goes back to the list', async () => {
      await setup();
      fillValid();
      type('specialty', ' Fútbol ');
      type('yearsOfExperience', '6');
      await submit();

      const request = backend.expectOne(USERS);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        role: 'COACH',
        firstNames: 'Carlos',
        lastNames: 'Ruiz',
        idType: 'CC',
        idNumber: '1000000001',
        email: 'carlos@correo.com',
        phone: '3001234567',
        password: 'Clave-segura1',
        specialty: 'Fútbol',
        yearsOfExperience: 6,
      });
      request.flush(coachUser(), { status: 201, statusText: 'Created' });
      expect(router.navigate).toHaveBeenCalledWith(['/admin/coaches'], {
        queryParams: { saved: 'created' },
      });
    });

    it('omits the optional coach data when it is empty', async () => {
      await setup();
      fillValid();
      await submit();
      const request = backend.expectOne(USERS);
      expect(request.request.body.specialty).toBeUndefined();
      expect(request.request.body.yearsOfExperience).toBeUndefined();
      request.flush(coachUser(), { status: 201, statusText: 'Created' });
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
  });

  describe('editing', () => {
    it('loads the coach, locks the document and does not ask for a password', async () => {
      await setup('8');
      backend.expectOne(`${USERS}/8`).flush(coachUser());
      await fixture.whenStable();

      expect(el().querySelector('h1')?.textContent).toContain('Editar entrenador');
      expect(field('firstNames').value).toBe('Carlos');
      expect(field('specialty').value).toBe('Fútbol');
      expect(field('yearsOfExperience').value).toBe('6');
      expect(field('idNumber').value).toBe('1000000001');
      expect(field('idNumber').disabled).toBe(true);
      expect(field('idType').disabled).toBe(true);
      expect(el().querySelector('#password')).toBeNull();
    });

    it('saves with PUT and without document or password', async () => {
      await setup('8');
      backend.expectOne(`${USERS}/8`).flush(coachUser());
      await fixture.whenStable();

      type('phone', '3109998877');
      await submit();
      const request = backend.expectOne(`${USERS}/8`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({
        firstNames: 'Carlos',
        lastNames: 'Ruiz',
        email: 'carlos@correo.com',
        phone: '3109998877',
        specialty: 'Fútbol',
        yearsOfExperience: 6,
      });
      request.flush(coachUser());
      expect(router.navigate).toHaveBeenCalledWith(['/admin/coaches'], {
        queryParams: { saved: 'updated' },
      });
    });

    it('shows an error with a way back when the coach cannot be loaded', async () => {
      await setup('99');
      failWith(
        backend,
        '/users/99',
        apiError({ status: 404, code: 'NOT_FOUND', message: 'Usuario no encontrado' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('no encontrado');
      expect(el().querySelector('a[href="/admin/coaches"]')).toBeTruthy();
    });
  });
});
