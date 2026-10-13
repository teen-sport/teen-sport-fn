import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith, loginResponse } from '../../../../testing/auth-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { Login } from './login';

const API = environment.apiBaseUrl;

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let backend: HttpTestingController;
  let router: Router;

  async function setup(query: Record<string, string> = {}): Promise<void> {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
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
    fixture = TestBed.createComponent(Login);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
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

  it('shows the fields and the way to register', async () => {
    await setup();
    expect(el().querySelector('h1')?.textContent).toContain('Inicia sesión');
    expect(input('email')).toBeTruthy();
    expect(input('password').type).toBe('password');
    expect(el().querySelector('a[href="/register"]')).toBeTruthy();
  });

  it('does not call the API with an empty form and says what is missing', async () => {
    await setup();
    await submit();
    expect(el().textContent).toContain('Este campo es obligatorio.');
    backend.expectNone(`${API}/auth/login`);
  });

  it('rejects a malformed e-mail before calling the API', async () => {
    await setup();
    type('email', 'no-es-un-correo');
    type('password', 'Entrena#2026');
    await submit();
    expect(el().textContent).toContain('Escribe un correo válido');
    backend.expectNone(`${API}/auth/login`);
  });

  it('signs in and goes to the home of the role', async () => {
    await setup();
    type('email', ' marta@correo.com ');
    type('password', 'Entrena#2026');
    await submit();
    const request = backend.expectOne(`${API}/auth/login`);
    expect(request.request.body).toEqual({ email: 'marta@correo.com', password: 'Entrena#2026' });
    request.flush(loginResponse('COACH'));
    expect(TestBed.inject(SessionService).role()).toBe('COACH');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/coach');
  });

  it('shows the API message when the credentials are wrong', async () => {
    await setup();
    type('email', 'marta@correo.com');
    type('password', 'incorrecta');
    await submit();
    failWith(
      backend,
      '/auth/login',
      apiError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Correo o contraseña incorrectos.',
      }),
    );
    await fixture.whenStable();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain(
      'Correo o contraseña incorrectos.',
    );
    expect(TestBed.inject(SessionService).isAuthenticated()).toBe(false);
    expect(el().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });

  it('tells the user when the server cannot be reached', async () => {
    await setup();
    type('email', 'marta@correo.com');
    type('password', 'Entrena#2026');
    await submit();
    backend.expectOne(`${API}/auth/login`).error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo conectar con el servidor',
    );
  });

  it.each([
    [{ reason: 'expired' }, 'Tu sesión expiró'],
    [{ registered: '1' }, 'Tu cuenta está lista'],
  ])('explains why the user is here: %j', async (query, text) => {
    await setup(query);
    expect(el().querySelector('[role="status"]')?.textContent).toContain(text);
  });
});
