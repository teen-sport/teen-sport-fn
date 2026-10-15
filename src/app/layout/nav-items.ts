import { Role } from '../Core/Models/role';

/** Enlace del menú superior. */
export interface NavItem {
  label: string;
  route: string;
  /** Si es true, solo se marca como activo cuando la ruta coincide exactamente. */
  exact?: boolean;
}

/** Tarjeta de acceso rápido de la pantalla de inicio. */
export interface Shortcut {
  title: string;
  description: string;
  route: string;
}

const PROFILE_NAV: NavItem = { label: 'Mi perfil', route: '/profile' };

/** Menú de cada rol. Cada módulo nuevo agrega aquí sus enlaces (antes de «Mi perfil»). */
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  ADMIN: [{ label: 'Inicio', route: '/admin', exact: true }, PROFILE_NAV],
  COACH: [{ label: 'Inicio', route: '/coach', exact: true }, PROFILE_NAV],
  GUARDIAN: [{ label: 'Inicio', route: '/guardian', exact: true }, PROFILE_NAV],
};

/**
 * Accesos rápidos de la pantalla de inicio de cada rol: las tareas del día a día.
 * El perfil no va aquí porque ya está en el menú.
 */
export const SHORTCUTS: Record<Role, Shortcut[]> = {
  ADMIN: [],
  COACH: [],
  GUARDIAN: [],
};
