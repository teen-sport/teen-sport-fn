import { ADMIN_ROUTES } from '../features/admin/admin.routes';
import { COACH_ROUTES } from '../features/coach/coach.routes';
import { GUARDIAN_ROUTES } from '../features/guardian/guardian.routes';
import { COLLAPSE_MENU_FROM, COLLAPSED_MENU_ROLES, NAV_ITEMS, SHORTCUTS } from './nav-items';

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
      'Sesiones',
      'Historial de asistencia',
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

  it('lists the catalog, enrollment, payment and user screens in order, with the profile last', () => {
    expect(NAV_ITEMS.ADMIN.map((item) => item.label)).toEqual([
      'Inicio',
      'Disciplinas',
      'Entrenadores',
      'Grupos',
      'Sesiones',
      'Historial de asistencia',
      'Reportes',
      'Inscripciones',
      'Pagos',
      'Usuarios',
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

describe('menu and shortcuts of the coach', () => {
  const knownPaths = COACH_ROUTES.map((route) => `/coach${route.path ? '/' + route.path : ''}`);

  it('lists the sessions, history and reports screens in order, with the profile last', () => {
    expect(NAV_ITEMS.COACH.map((item) => item.label)).toEqual([
      'Inicio',
      'Sesiones',
      'Historial de asistencia',
      'Reportes',
      'Mi perfil',
    ]);
  });

  it('only points to routes that exist', () => {
    const coachLinks = [
      ...NAV_ITEMS.COACH.map((item) => item.route),
      ...SHORTCUTS.COACH.map((shortcut) => shortcut.route),
    ].filter((route) => route.startsWith('/coach'));
    for (const route of coachLinks) {
      expect(knownPaths).toContain(route);
    }
  });

  it('has a shortcut for every screen of the menu except Inicio and Mi perfil', () => {
    const fromMenu = NAV_ITEMS.COACH.map((item) => item.route).filter(
      (route) => route !== '/coach' && route !== '/profile',
    );
    expect(SHORTCUTS.COACH.map((shortcut) => shortcut.route)).toEqual(fromMenu);
  });
});

describe('when the menu collapses', () => {
  it('collapses the menu of the administrator on every screen size', () => {
    expect(NAV_ITEMS.ADMIN.length).toBeGreaterThanOrEqual(COLLAPSE_MENU_FROM);
  });

  it('collapses the menu of the coach on every screen size, like the administrator', () => {
    expect(NAV_ITEMS.COACH.length).toBeLessThan(COLLAPSE_MENU_FROM);
    expect(COLLAPSED_MENU_ROLES).toContain('COACH');
  });

  it('collapses the menu of the guardian on every screen size now that it has the sessions and the history', () => {
    expect(NAV_ITEMS.GUARDIAN.length).toBeGreaterThanOrEqual(COLLAPSE_MENU_FROM);
  });
});
