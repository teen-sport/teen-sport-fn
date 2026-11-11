import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { ForgotPassword } from './forgot-password';

const API = environment.apiBaseUrl;
const REQUEST_URL = '/auth/password-reset/request';
const CONFIRM_URL = '/auth/password-reset/confirm';

describe('ForgotPassword', () => {
  let fixture: ComponentFixture<ForgotPassword>;
  let backend: HttpTestingController;
  let router: Router;

  async function setup(query: Record<string, string> = {}): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
        },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ForgotPassword);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (id: string): HTMLInputElement => el().querySelector<HTMLInputElement>(`#${id}`)!;

  function type(id: string, value: string): void {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  afterEach(() => backend.verify());

  describe('step 1: ask for the link', () => {
    it('asks only for the e-mail and offers the way back to the login', async () => {
      await setup();
      expect(el().querySelector('h1')?.textContent).toContain('Recupera tu contraseña');
      expect(input('email')).toBeTruthy();
      expect(el().querySelector('#newPassword')).toBeNull();
      expect(el().querySelector('a[href="/login"]')).toBeTruthy();
    });

    it('does not call the API with an empty or malformed e-mail', async () => {
      await setup();
      await submit();
      expect(el().textContent).toContain('Este campo es obligatorio.');
      type('email', 'no-es-un-correo');
      await submit();
      expect(el().textContent).toContain('Escribe un correo válido');
      backend.expectNone(`${API}${REQUEST_URL}`);
    });

    it('sends the e-mail and gives the same answer whether or not it is registered', async () => {
      await setup();
      type('email', ' marta@correo.com ');
      await submit();
      const request = backend.expectOne(`${API}${REQUEST_URL}`);
      expect(request.request.body).toEqual({ email: 'marta@correo.com' });
      request.flush(null, { status: 202, statusText: 'Accepted' });
      await fixture.whenStable();

      const notice = el().querySelector('[role="status"]')?.textContent ?? '';
      expect(notice).toContain('Si el correo está registrado');
      expect(notice).toContain('20 minutos');
      expect(el().querySelector('form')).toBeNull();
    });

    it('shows the message of the server and lets the user try again', async () => {
      await setup();
      type('email', 'marta@correo.com');
      await submit();
      failWith(
        backend,
        REQUEST_URL,
        apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('[role="alert"]')?.textContent).toContain('Error interno');
      expect(el().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
    });
  });

  describe('step 2: choose the new password (link of the e-mail)', () => {
    it('shows the password form and removes the token from the address bar', async () => {
      await setup({ token: 'abc123' });
      expect(input('newPassword')).toBeTruthy();
      expect(input('confirmPassword')).toBeTruthy();
      expect(el().querySelector('#email')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/forgot-password'], { replaceUrl: true });
    });

    it('lists the password rules and marks the ones already met', async () => {
      await setup({ token: 'abc123' });
      type('newPassword', 'Entrena');
      await fixture.whenStable();
      const met = el().querySelectorAll('.rules li.met');
      expect(el().querySelectorAll('.rules li').length).toBe(5);
      expect(met.length).toBe(2);
    });

    it('does not call the API when the password is weak or the repetition differs', async () => {
      await setup({ token: 'abc123' });
      type('newPassword', 'debil');
      type('confirmPassword', 'otra');
      await submit();
      expect(el().textContent).toContain('no cumple todos los requisitos');
      type('newPassword', 'Entrena#2026');
      await submit();
      expect(el().textContent).toContain('Las contraseñas no coinciden.');
      backend.expectNone(`${API}${CONFIRM_URL}`);
    });

    it('changes the password with the token and goes to the login with a notice', async () => {
      await setup({ token: 'abc123' });
      type('newPassword', 'Entrena#2026');
      type('confirmPassword', 'Entrena#2026');
      await submit();
      const request = backend.expectOne(`${API}${CONFIRM_URL}`);
      expect(request.request.body).toEqual({ token: 'abc123', newPassword: 'Entrena#2026' });
      request.flush(null, { status: 204, statusText: 'No Content' });
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { passwordReset: 1 },
      });
    });

    it('explains that the link is not valid and offers to ask for a new one', async () => {
      await setup({ token: 'vencido' });
      type('newPassword', 'Entrena#2026');
      type('confirmPassword', 'Entrena#2026');
      await submit();
      failWith(
        backend,
        CONFIRM_URL,
        apiError({
          status: 422,
          code: 'INVALID_RESET_TOKEN',
          message: 'El enlace no es válido o ya venció.',
        }),
      );
      await fixture.whenStable();
      expect(el().querySelector('[role="alert"]')?.textContent).toContain(
        'Este enlace ya no sirve',
      );
      expect(el().querySelector('form')).toBeNull();

      el().querySelector<HTMLButtonElement>('button[type="button"]')!.click();
      await fixture.whenStable();
      expect(input('email')).toBeTruthy();
      expect(el().querySelector('#newPassword')).toBeNull();
    });

    it('puts the weak-password message of the server next to the field and keeps the form', async () => {
      await setup({ token: 'abc123' });
      type('newPassword', 'Entrena#2026');
      type('confirmPassword', 'Entrena#2026');
      await submit();
      failWith(
        backend,
        CONFIRM_URL,
        apiError({
          status: 422,
          code: 'WEAK_PASSWORD',
          message: 'La contraseña no cumple la política de seguridad.',
        }),
      );
      await fixture.whenStable();
      expect(el().querySelector('#password-error')?.textContent).toContain('política de seguridad');
      expect(input('newPassword')).toBeTruthy();
      expect(el().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
    });
  });
});
