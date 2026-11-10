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

/** Roles cuyo menú se recoge detrás de las tres rayas en cualquier pantalla, aunque tengan pocas opciones. */
export const COLLAPSED_MENU_ROLES: readonly Role[] = ['COACH'];

/** Menú de cada rol. Cada módulo nuevo agrega aquí sus enlaces (antes de «Mi perfil»). */
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Inicio', route: '/admin', exact: true },
    { label: 'Disciplinas', route: '/admin/disciplines' },
    { label: 'Entrenadores', route: '/admin/coaches' },
    { label: 'Grupos', route: '/admin/groups' },
    { label: 'Sesiones', route: '/admin/sessions' },
    { label: 'Historial de asistencia', route: '/admin/attendance' },
    { label: 'Reportes', route: '/admin/reports' },
    { label: 'Inscripciones', route: '/admin/enrollments' },
    { label: 'Pagos', route: '/admin/payments' },
    { label: 'Usuarios', route: '/admin/users' },
    PROFILE_NAV,
  ],
  COACH: [
    { label: 'Inicio', route: '/coach', exact: true },
    { label: 'Sesiones', route: '/coach/sessions' },
    { label: 'Historial de asistencia', route: '/coach/attendance' },
    { label: 'Reportes', route: '/coach/reports' },
    PROFILE_NAV,
  ],
  GUARDIAN: [
    { label: 'Inicio', route: '/guardian', exact: true },
    { label: 'Mis deportistas', route: '/guardian/athletes' },
    { label: 'Grupos disponibles', route: '/guardian/groups' },
    { label: 'Mis inscripciones', route: '/guardian/enrollments' },
    { label: 'Mis pagos', route: '/guardian/payments' },
    { label: 'Sesiones', route: '/guardian/sessions' },
    { label: 'Historial de asistencia', route: '/guardian/attendance' },
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
      title: 'Sesiones',
      description:
        'Genera las sesiones de cada grupo, reprograma o cancela, y revisa la asistencia.',
      route: '/admin/sessions',
    },
    {
      title: 'Historial de asistencia',
      description: 'Consulta la asistencia registrada y el resumen de cada deportista.',
      route: '/admin/attendance',
    },
    {
      title: 'Reportes',
      description:
        'Mira la cobertura de la asistencia, quién falta seguido y cómo van las inscripciones.',
      route: '/admin/reports',
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
    {
      title: 'Usuarios',
      description: 'Crea administradores y activa o desactiva cuentas de cualquier rol.',
      route: '/admin/users',
    },
  ],
  COACH: [
    {
      title: 'Sesiones y asistencia',
      description: 'Genera tus sesiones, mira la semana y marca quién asistió.',
      route: '/coach/sessions',
    },
    {
      title: 'Historial de asistencia',
      description: 'Consulta la asistencia que registraste y el resumen de cada deportista.',
      route: '/coach/attendance',
    },
    {
      title: 'Reportes',
      description: 'Mira la cobertura de tu asistencia y quién de tus deportistas falta seguido.',
      route: '/coach/reports',
    },
  ],
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
    {
      title: 'Sesiones',
      description: 'Mira los entrenamientos de la semana de tus deportistas.',
      route: '/guardian/sessions',
    },
    {
      title: 'Historial de asistencia',
      description: 'Consulta a cuáles entrenamientos asistió cada deportista.',
      route: '/guardian/attendance',
    },
  ],
};
