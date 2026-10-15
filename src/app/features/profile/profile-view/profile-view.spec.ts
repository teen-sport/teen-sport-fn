import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import { myProfile } from '../../../../testing/profile-fixtures';
import { Role } from '../../../Core/Models/role';
import { MyProfile } from '../profile.models';
import { ProfileView } from './profile-view';

const URL = `${environment.apiBaseUrl}/users/me`;

describe('ProfileView', () => {
  let fixture: ComponentFixture<ProfileView>;
  let backend: HttpTestingController;

  function setup(query: Record<string, string> = {}): void {
    TestBed.configureTestingModule({
      imports: [ProfileView],
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
    fixture = TestBed.createComponent(ProfileView);
    backend = TestBed.inject(HttpTestingController);
  }

  async function showProfile(role: Role, overrides: Partial<MyProfile> = {}): Promise<void> {
    await fixture.whenStable();
    backend.expectOne(URL).flush(myProfile(role, overrides));
    await fixture.whenStable();
  }

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  afterEach(() => backend.verify());

  it('shows a loading message while the profile arrives', async () => {
    setup();
    await fixture.whenStable();
    expect(text()).toContain('Cargando tu perfil');
    backend.expectOne(URL).flush(myProfile());
  });

  it('shows the personal data and the address of a guardian', async () => {
    setup();
    await showProfile('GUARDIAN');
    expect(text()).toContain('Marta Gómez');
    expect(text()).toContain('Cédula de ciudadanía 1094567890');
    expect(text()).toContain('marta@correo.com');
    expect(text()).toContain('Acudiente');
    expect(text()).toContain('Calle 10 # 5-20');
    expect(text()).not.toContain('Especialidad');
  });

  it('shows the specialty and the experience of a coach', async () => {
    setup();
    await showProfile('COACH');
    expect(text()).toContain('Entrenador');
    expect(text()).toContain('Fútbol');
    expect(text()).toContain('4');
    expect(text()).not.toContain('Dirección');
  });

  it('shows neither role data for an administrator', async () => {
    setup();
    await showProfile('ADMIN');
    expect(text()).toContain('Administrador');
    expect(text()).not.toContain('Dirección');
    expect(text()).not.toContain('Especialidad');
  });

  it('links to the edit and password screens', async () => {
    setup();
    await showProfile('GUARDIAN');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/profile/edit"]')).toBeTruthy();
    expect(el.querySelector('a[href="/profile/password"]')).toBeTruthy();
  });

  it('shows the server message and lets the user retry', async () => {
    setup();
    await fixture.whenStable();
    const failure = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor.' });
    backend.expectOne(URL).flush(failure, { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();
    expect(text()).toContain('Error del servidor.');

    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    await fixture.whenStable();
    backend.expectOne(URL).flush(myProfile());
    await fixture.whenStable();
    expect(text()).toContain('Marta Gómez');
  });

  it.each([
    ['updated', 'Tus datos se actualizaron.'],
    ['passwordChanged', 'Tu contraseña se cambió correctamente.'],
  ])('shows a notice when coming back with ?%s', async (param, message) => {
    setup({ [param]: '1' });
    await showProfile('GUARDIAN');
    expect(text()).toContain(message);
  });
});
