import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { PasswordChange } from './password-change';

const URL = `${environment.apiBaseUrl}/users/me/password`;

describe('PasswordChange', () => {
  let fixture: ComponentFixture<PasswordChange>;
  let backend: HttpTestingController;
  let router: Router;

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [PasswordChange],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(PasswordChange);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function type(id: string, value: string): void {
    const field = el().querySelector<HTMLInputElement>(`#${id}`)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  function fill(current: string, next: string, confirm = next): void {
    type('currentPassword', current);
    type('newPassword', next);
    type('confirmPassword', confirm);
  }

  async function submit(): Promise<void> {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  afterEach(() => backend.verify());

  it('asks for the current password, the new one and its confirmation', async () => {
    await setup();
    for (const id of ['currentPassword', 'newPassword', 'confirmPassword']) {
      expect(el().querySelector<HTMLInputElement>(`#${id}`)!.type).toBe('password');
    }
  });

  it('marks each requirement as the new password meets it', async () => {
    await setup();
    type('newPassword', 'Abcdef1!');
    await fixture.whenStable();
    expect(el().querySelectorAll('.rules li.met').length).toBe(5);

    type('newPassword', 'abc');
    await fixture.whenStable();
    expect(el().querySelectorAll('.rules li.met').length).toBe(1);
  });

  it('does not send anything when the form is empty', async () => {
    await setup();
    await submit();
    expect(el().querySelector('#currentPassword-error')).toBeTruthy();
    expect(el().querySelector('#newPassword-error')).toBeTruthy();
    backend.expectNone(URL);
  });

  it('does not send a weak new password', async () => {
    await setup();
    fill('Actual1!', 'sololetras');
    await submit();
    expect(el().querySelector('#newPassword-error')?.textContent).toContain('requisitos');
    backend.expectNone(URL);
  });

  it('does not send when the confirmation differs', async () => {
    await setup();
    fill('Actual1!', 'Nueva2@pass', 'Otra3#pass');
    await submit();
    expect(el().querySelector('#confirmPassword-error')?.textContent).toContain('no coinciden');
    backend.expectNone(URL);
  });

  it('changes the password and goes back to the profile', async () => {
    await setup();
    fill('Actual1!', 'Nueva2@pass');
    await submit();

    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      currentPassword: 'Actual1!',
      newPassword: 'Nueva2@pass',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(router.navigate).toHaveBeenCalledWith(['/profile'], {
      queryParams: { passwordChanged: 1 },
    });
  });

  it('shows INCORRECT_CURRENT_PASSWORD under the current password field', async () => {
    await setup();
    fill('Mala1234!', 'Nueva2@pass');
    await submit();
    failWith(
      backend,
      '/users/me/password',
      apiError({
        status: 422,
        code: 'INCORRECT_CURRENT_PASSWORD',
        message: 'La contraseña actual no es correcta.',
      }),
    );
    await fixture.whenStable();
    expect(el().querySelector('#currentPassword-error')?.textContent).toContain(
      'La contraseña actual no es correcta.',
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows WEAK_PASSWORD under the new password field', async () => {
    await setup();
    fill('Actual1!', 'Nueva2@pass');
    await submit();
    failWith(
      backend,
      '/users/me/password',
      apiError({ status: 422, code: 'WEAK_PASSWORD', message: 'La contraseña es débil.' }),
    );
    await fixture.whenStable();
    expect(el().querySelector('#newPassword-error')?.textContent).toContain(
      'La contraseña es débil.',
    );
  });

  it('shows a general message for errors that do not belong to a field', async () => {
    await setup();
    fill('Actual1!', 'Nueva2@pass');
    await submit();
    failWith(
      backend,
      '/users/me/password',
      apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor.' }),
    );
    await fixture.whenStable();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Error del servidor.');
  });
});
