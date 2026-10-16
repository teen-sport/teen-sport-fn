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

    el().querySelector<HTMLButtonElement>('.app-logout')!.click();

    expect(TestBed.inject(SessionService).isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('provides a skip link and a main region for assistive technology', async () => {
    await setup('GUARDIAN');
    expect(el().querySelector('a.skip-link')?.getAttribute('href')).toBe('#content');
    expect(el().querySelector('main#content')).toBeTruthy();
  });

  describe('menu on narrow screens', () => {
    const toggle = (): HTMLButtonElement =>
      el().querySelector<HTMLButtonElement>('.app-menu-toggle')!;
    const header = (): HTMLElement => el().querySelector<HTMLElement>('.app-header__inner')!;

    it('starts closed and the button points to the menu it controls', async () => {
      await setup('GUARDIAN');
      expect(toggle().getAttribute('aria-controls')).toBe('app-nav app-logout');
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(toggle().getAttribute('aria-label')).toBe('Abrir menú');
      expect(header().classList.contains('app-header__inner--open')).toBe(false);
    });

    it('opens and closes the menu with the button', async () => {
      await setup('GUARDIAN');

      toggle().click();
      await fixture.whenStable();
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
      expect(toggle().getAttribute('aria-label')).toBe('Cerrar menú');
      expect(header().classList.contains('app-header__inner--open')).toBe(true);

      toggle().click();
      await fixture.whenStable();
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(header().classList.contains('app-header__inner--open')).toBe(false);
    });

    it('closes the menu after choosing an option', async () => {
      await setup('GUARDIAN');
      TestBed.inject(Router).resetConfig([{ path: 'profile', children: [] }]);
      toggle().click();
      await fixture.whenStable();

      el().querySelector<HTMLAnchorElement>('.app-nav a[href="/profile"]')!.click();
      await fixture.whenStable();

      expect(header().classList.contains('app-header__inner--open')).toBe(false);
    });

    it('closes the menu with Escape', async () => {
      await setup('GUARDIAN');
      toggle().click();
      await fixture.whenStable();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await fixture.whenStable();

      expect(toggle().getAttribute('aria-expanded')).toBe('false');
    });
  });
});
