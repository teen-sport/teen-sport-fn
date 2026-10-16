import { GUARDIAN_ROUTES } from '../features/guardian/guardian.routes';
import { NAV_ITEMS, SHORTCUTS } from './nav-items';

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
