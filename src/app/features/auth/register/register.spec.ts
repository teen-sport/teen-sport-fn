import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith, loginResponse } from '../../../../testing/auth-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { Register } from './register';

const API = environment.apiBaseUrl;

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let backend: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(Register);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (id: string): HTMLInputElement => el().querySelector<HTMLInputElement>(`#${id}`)!;

  function type(id: string, value: string): void {
    const control = field(id);
    control.value = value;
    control.dispatchEvent(new Event('input'));
  }

  function fillValidForm(): void {
    type('firstNames', ' Marta ');
    type('lastNames', 'Gómez');
    type('idNumber', '1094567890');
    type('email', 'marta@correo.com');
    type('phone', '3001234567');
    type('password', 'Entrena#2026');
    type('confirmPassword', 'Entrena#2026');
    const consent = el().querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    consent.checked = true;
    consent.dispatchEvent(new Event('change'));
  }

  async function submit(): Promise<void> {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('lists the requirements of the password and marks the ones met', async () => {
    const items = () => Array.from(el().querySelectorAll('.rules li'));
    expect(items().length).toBe(5);
    expect(items().some((item) => item.classList.contains('met'))).toBe(false);
    type('password', 'Entrena#2026');
    await fixture.whenStable();
    expect(items().every((item) => item.classList.contains('met'))).toBe(true);
  });

  it('does not call the API with an invalid form', async () => {
    await submit();
    expect(el().textContent).toContain('Este campo es obligatorio.');
    expect(el().textContent).toContain('Debes aceptar la política de datos para registrarte.');
    backend.expectNone(`${API}/users/register`);
  });

  it('asks to repeat the password when they differ', async () => {
    fillValidForm();
    type('confirmPassword', 'Otra#Clave2026');
    await submit();
    expect(el().textContent).toContain('Las contraseñas no coinciden.');
    backend.expectNone(`${API}/users/register`);
  });

  it('registers, signs in and goes to the guardian home', async () => {
    fillValidForm();
    await submit();
    const register = backend.expectOne(`${API}/users/register`);
    expect(register.request.body).toEqual({
      firstNames: 'Marta',
      lastNames: 'Gómez',
      idType: 'CC',
      idNumber: '1094567890',
      email: 'marta@correo.com',
      phone: '3001234567',
      password: 'Entrena#2026',
      acceptedDataPolicy: true,
    });
    register.flush({ id: 7 }, { status: 201, statusText: 'Created' });
    backend.expectOne(`${API}/auth/login`).flush(loginResponse('GUARDIAN'));
    expect(TestBed.inject(SessionService).role()).toBe('GUARDIAN');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/guardian');
  });

  it('sends the optional address only when it is filled', async () => {
    fillValidForm();
    type('homeAddress', ' Calle 10 # 5-20 ');
    await submit();
    const register = backend.expectOne(`${API}/users/register`);
    expect(register.request.body.homeAddress).toBe('Calle 10 # 5-20');
    register.flush({}, { status: 201, statusText: 'Created' });
    backend.expectOne(`${API}/auth/login`).flush(loginResponse('GUARDIAN'));
  });

  it('shows a taken e-mail next to the e-mail field', async () => {
    fillValidForm();
    await submit();
    failWith(
      backend,
      '/users/register',
      apiError({
        status: 409,
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'El correo electrónico ya está registrado.',
      }),
    );
    await fixture.whenStable();
    expect(el().querySelector('#email-error')?.textContent).toContain('ya está registrado');
    expect(el().querySelector('[role="alert"]')).toBeNull();
    expect(field('email').getAttribute('aria-invalid')).toBe('true');
  });

  it('shows a taken document number next to its field', async () => {
    fillValidForm();
    await submit();
    failWith(
      backend,
      '/users/register',
      apiError({
        status: 409,
        code: 'ID_NUMBER_ALREADY_REGISTERED',
        message: 'El número de documento ya está registrado.',
      }),
    );
    await fixture.whenStable();
    expect(el().querySelector('#idNumber-error')?.textContent).toContain('ya está registrado');
  });

  it('places field errors from the API on their controls', async () => {
    fillValidForm();
    await submit();
    failWith(
      backend,
      '/users/register',
      apiError({ details: [{ field: 'phone', message: 'El teléfono no es válido.' }] }),
    );
    await fixture.whenStable();
    expect(el().querySelector('#phone-error')?.textContent).toContain('El teléfono no es válido.');
  });

  it('shows a general alert for errors that belong to no field', async () => {
    fillValidForm();
    await submit();
    failWith(
      backend,
      '/users/register',
      apiError({
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
      }),
    );
    await fixture.whenStable();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain(
      'Ocurrió un error inesperado',
    );
    expect(field('email').value).toBe('marta@correo.com');
  });

  it('sends the user to the login when the account exists but the automatic sign-in fails', async () => {
    fillValidForm();
    await submit();
    backend.expectOne(`${API}/users/register`).flush({}, { status: 201, statusText: 'Created' });
    backend.expectOne(`${API}/auth/login`).error(new ProgressEvent('error'));
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { registered: 1 } });
  });
});
