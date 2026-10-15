import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith, loginResponse } from '../../../../testing/auth-fixtures';
import { myProfile } from '../../../../testing/profile-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { Role } from '../../../Core/Models/role';
import { ProfileEdit } from './profile-edit';

const URL = `${environment.apiBaseUrl}/users/me`;

describe('ProfileEdit', () => {
  let fixture: ComponentFixture<ProfileEdit>;
  let backend: HttpTestingController;
  let router: Router;

  async function setup(role: Role = 'GUARDIAN'): Promise<void> {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProfileEdit],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SessionService).start(loginResponse(role));
    fixture = TestBed.createComponent(ProfileEdit);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
    backend.expectOne(URL).flush(myProfile(role));
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (id: string): HTMLInputElement | null => el().querySelector<HTMLInputElement>(`#${id}`);

  function type(id: string, value: string): void {
    const field = input(id)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  afterEach(() => backend.verify());

  it('pre-fills the form with the current data', async () => {
    await setup();
    expect(input('firstNames')!.value).toBe('Marta');
    expect(input('lastNames')!.value).toBe('Gómez');
    expect(input('phone')!.value).toBe('3001234567');
    expect(input('homeAddress')!.value).toBe('Calle 10 # 5-20');
  });

  it('shows only the address to a guardian', async () => {
    await setup('GUARDIAN');
    expect(input('homeAddress')).toBeTruthy();
    expect(input('specialty')).toBeNull();
    expect(input('yearsOfExperience')).toBeNull();
  });

  it('shows only the specialty and the experience to a coach', async () => {
    await setup('COACH');
    expect(input('specialty')!.value).toBe('Fútbol');
    expect(input('yearsOfExperience')!.value).toBe('4');
    expect(input('homeAddress')).toBeNull();
  });

  it('shows neither role field to an administrator', async () => {
    await setup('ADMIN');
    expect(input('homeAddress')).toBeNull();
    expect(input('specialty')).toBeNull();
  });

  it('does not send anything when a required field is empty', async () => {
    await setup();
    type('firstNames', '   ');
    await submit();
    expect(el().querySelector('#firstNames-error')?.textContent).toContain('obligatorio');
    backend.expectNone(URL);
  });

  it('sends the complete profile trimmed and goes back to the profile', async () => {
    await setup('GUARDIAN');
    type('firstNames', '  Marta Lucía ');
    type('phone', '3009998877');
    type('homeAddress', ' Carrera 14 # 8-30 ');
    await submit();

    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      firstNames: 'Marta Lucía',
      lastNames: 'Gómez',
      phone: '3009998877',
      homeAddress: 'Carrera 14 # 8-30',
    });
    request.flush(myProfile('GUARDIAN', { firstNames: 'Marta Lucía' }));
    expect(router.navigate).toHaveBeenCalledWith(['/profile'], { queryParams: { updated: 1 } });
    expect(TestBed.inject(SessionService).user()?.firstNames).toBe('Marta Lucía');
  });

  it('sends the coach fields and not the guardian address', async () => {
    await setup('COACH');
    type('specialty', 'Baloncesto');
    type('yearsOfExperience', '6');
    await submit();

    const request = backend.expectOne(URL);
    expect(request.request.body).toEqual({
      firstNames: 'Marta',
      lastNames: 'Gómez',
      phone: '3001234567',
      specialty: 'Baloncesto',
      yearsOfExperience: 6,
    });
    request.flush(myProfile('COACH'));
  });

  it('rejects negative or decimal years of experience', async () => {
    await setup('COACH');
    type('yearsOfExperience', '-2');
    await submit();
    expect(el().querySelector('#yearsOfExperience-error')?.textContent).toContain('mínimo');

    type('yearsOfExperience', '2.5');
    await submit();
    expect(el().querySelector('#yearsOfExperience-error')?.textContent).toContain('entero');
    backend.expectNone(URL);
  });

  it('places the validation message of the server on its field', async () => {
    await setup();
    await submit();
    failWith(
      backend,
      '/users/me',
      apiError({
        status: 400,
        details: [{ field: 'phone', message: 'El teléfono no es válido.' }],
      }),
    );
    await fixture.whenStable();
    expect(el().querySelector('#phone-error')?.textContent).toContain('El teléfono no es válido.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows an error message when the profile cannot be loaded', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProfileEdit],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ProfileEdit);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    failWith(backend, '/users/me', apiError({ status: 500, message: 'Error del servidor.' }));
    await fixture.whenStable();
    expect(el().textContent).toContain('Error del servidor.');
    expect(el().querySelector('form')).toBeNull();
  });
});
