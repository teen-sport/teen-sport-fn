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

/**
 * Con tantas opciones o más, el menú del rol no cabe en una fila y se recoge detrás del botón de tres
 * rayas también en pantallas anchas. Con menos opciones solo se recoge en pantallas angostas.
 */
export const COLLAPSE_MENU_FROM = 7;

/** Menú de cada rol. Cada módulo nuevo agrega aquí sus enlaces (antes de «Mi perfil»). */
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Inicio', route: '/admin', exact: true },
    { label: 'Disciplinas', route: '/admin/disciplines' },
    { label: 'Entrenadores', route: '/admin/coaches' },
    { label: 'Grupos', route: '/admin/groups' },
    { label: 'Inscripciones', route: '/admin/enrollments' },
    { label: 'Pagos', route: '/admin/payments' },
    PROFILE_NAV,
  ],
  COACH: [{ label: 'Inicio', route: '/coach', exact: true }, PROFILE_NAV],
  GUARDIAN: [
    { label: 'Inicio', route: '/guardian', exact: true },
    { label: 'Mis deportistas', route: '/guardian/athletes' },
    { label: 'Grupos disponibles', route: '/guardian/groups' },
    { label: 'Mis inscripciones', route: '/guardian/enrollments' },
    { label: 'Mis pagos', route: '/guardian/payments' },
    PROFILE_NAV,
  ],
};

/**
 * Accesos rápidos de la pantalla de inicio de cada rol: las tareas del día a día.
 * El perfil no va aquí porque ya está en el menú.
 */
export const SHORTCUTS: Record<Role, Shortcut[]> = {
  ADMIN: [
    {
      title: 'Disciplinas',
      description: 'Crea las disciplinas de la academia y define su mensualidad.',
      route: '/admin/disciplines',
    },
    {
      title: 'Entrenadores',
      description: 'Registra a los entrenadores y administra sus cuentas.',
      route: '/admin/coaches',
    },
    {
      title: 'Grupos',
      description: 'Arma los grupos, asígnales entrenador y define sus horarios.',
      route: '/admin/groups',
    },
    {
      title: 'Inscripciones',
      description: 'Revisa las solicitudes: confirma, rechaza o cambia de grupo.',
      route: '/admin/enrollments',
    },
    {
      title: 'Pagos',
      description: 'Consulta el historial de pagos registrados por la academia.',
      route: '/admin/payments',
    },
  ],
  COACH: [],
  GUARDIAN: [
    {
      title: 'Mis deportistas',
      description: 'Registra y edita los datos de tus deportistas.',
      route: '/guardian/athletes',
    },
    {
      title: 'Grupos disponibles',
      description: 'Mira horarios y cupos, y solicita una inscripción.',
      route: '/guardian/groups',
    },
    {
      title: 'Mis inscripciones',
      description: 'Consulta el estado de cada inscripción y avisa tus pagos.',
      route: '/guardian/enrollments',
    },
    {
      title: 'Mis pagos',
      description: 'Revisa el historial de pagos registrados por la academia.',
      route: '/guardian/payments',
    },
  ],
};
