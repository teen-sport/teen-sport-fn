import { ADMIN_ROUTES } from '../features/admin/admin.routes';
import { GUARDIAN_ROUTES } from '../features/guardian/guardian.routes';
import { COLLAPSE_MENU_FROM, NAV_ITEMS, SHORTCUTS } from './nav-items';

describe('menu and shortcuts of the guardian', () => {
  const knownPaths = GUARDIAN_ROUTES.map(
    (route) => `/guardian${route.path ? '/' + route.path : ''}`,
  );

  it('lists the screens in the agreed order, with the profile last', () => {
    expect(NAV_ITEMS.GUARDIAN.map((item) => item.label)).toEqual([
      'Inicio',
      'Mis deportistas',
      'Grupos disponibles',
      'Mis inscripciones',
      'Mis pagos',
      'Mi perfil',
    ]);
  });

  it('only points to routes that exist', () => {
    const guardianLinks = [
      ...NAV_ITEMS.GUARDIAN.map((item) => item.route),
      ...SHORTCUTS.GUARDIAN.map((shortcut) => shortcut.route),
    ].filter((route) => route.startsWith('/guardian'));
    for (const route of guardianLinks) {
      expect(knownPaths).toContain(route);
    }
  });

  it('has a shortcut for every screen of the menu except Inicio and Mi perfil', () => {
    const fromMenu = NAV_ITEMS.GUARDIAN.map((item) => item.route).filter(
      (route) => route !== '/guardian' && route !== '/profile',
    );
    expect(SHORTCUTS.GUARDIAN.map((shortcut) => shortcut.route)).toEqual(fromMenu);
  });
});

describe('menu and shortcuts of the administrator', () => {
  const knownPaths = ADMIN_ROUTES.map((route) => `/admin${route.path ? '/' + route.path : ''}`);

  it('lists the catalog, enrollment and payment screens in order, with the profile last', () => {
    expect(NAV_ITEMS.ADMIN.map((item) => item.label)).toEqual([
      'Inicio',
      'Disciplinas',
      'Entrenadores',
      'Grupos',
      'Inscripciones',
      'Pagos',
      'Mi perfil',
    ]);
  });

  it('only points to routes that exist', () => {
    const adminLinks = [
      ...NAV_ITEMS.ADMIN.map((item) => item.route),
      ...SHORTCUTS.ADMIN.map((shortcut) => shortcut.route),
    ].filter((route) => route.startsWith('/admin'));
    for (const route of adminLinks) {
      expect(knownPaths).toContain(route);
    }
  });

  it('has a shortcut for every screen of the menu except Inicio and Mi perfil', () => {
    const fromMenu = NAV_ITEMS.ADMIN.map((item) => item.route).filter(
      (route) => route !== '/admin' && route !== '/profile',
    );
    expect(SHORTCUTS.ADMIN.map((shortcut) => shortcut.route)).toEqual(fromMenu);
  });
});

describe('when the menu collapses', () => {
  it('collapses the menu of the administrator on every screen size', () => {
    expect(NAV_ITEMS.ADMIN.length).toBeGreaterThanOrEqual(COLLAPSE_MENU_FROM);
  });

  it('keeps the menu of the guardian in a row on wide screens', () => {
    expect(NAV_ITEMS.GUARDIAN.length).toBeLessThan(COLLAPSE_MENU_FROM);
  });
});
