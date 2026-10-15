import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { loginResponse } from '../../../testing/auth-fixtures';
import { SessionService } from '../../Core/Auth/session.service';
import { Role } from '../../Core/Models/role';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  let fixture: ComponentFixture<AppShell>;

  async function setup(role: Role): Promise<void> {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SessionService).start(loginResponse(role));
    fixture = TestBed.createComponent(AppShell);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it.each([
    ['GUARDIAN', 'Acudiente', '/guardian'],
    ['COACH', 'Entrenador', '/coach'],
    ['ADMIN', 'Administrador', '/admin'],
  ] as const)('shows the user and the menu of a %s', async (role, label, home) => {
    await setup(role);
    expect(el().querySelector('.app-user__name')?.textContent).toContain('Marta Gómez');
    expect(el().querySelector('.app-user__name')?.textContent).toContain(label);
    expect(el().querySelector('.app-brand')?.getAttribute('href')).toBe(home);
    expect(el().querySelector(`.app-nav a[href="${home}"]`)).toBeTruthy();
  });

  it('offers «Mi perfil» in the menu and links the user name to it', async () => {
    await setup('GUARDIAN');
    expect(el().querySelector('.app-nav a[href="/profile"]')?.textContent).toContain('Mi perfil');
    expect(el().querySelector('.app-user__name')?.getAttribute('href')).toBe('/profile');
  });

  it('ends the session and goes to the login when closing the session', async () => {
    await setup('GUARDIAN');
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    el().querySelector<HTMLButtonElement>('.app-user button')!.click();

    expect(TestBed.inject(SessionService).isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('provides a skip link and a main region for assistive technology', async () => {
    await setup('GUARDIAN');
    expect(el().querySelector('a.skip-link')?.getAttribute('href')).toBe('#content');
    expect(el().querySelector('main#content')).toBeTruthy();
  });
});
