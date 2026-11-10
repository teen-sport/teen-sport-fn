import { Role } from '../../Core/Models/role';

/**
 * Cada rol tiene sus sesiones bajo su propia ruta (la del administrador cuelga de `/admin`, la del
 * entrenador de `/coach` y la del acudiente de `/guardian`), porque cada una está protegida por el
 * guard de su rol. Las pantallas de sesiones se reutilizan y arman sus enlaces con esta ruta base.
 */
const SESSIONS_ROUTE: Record<Role, string> = {
  ADMIN: '/admin/sessions',
  COACH: '/coach/sessions',
  GUARDIAN: '/guardian/sessions',
};

/** Ruta base de las sesiones del rol, por ejemplo «/coach/sessions». */
export function sessionsRoute(role: Role | null): string {
  return SESSIONS_ROUTE[role ?? 'COACH'];
}

/** Ruta del historial de asistencia del rol, por ejemplo «/guardian/attendance». */
export function attendanceHistoryRoute(role: Role | null): string {
  return sessionsRoute(role).replace(/\/sessions$/, '/attendance');
}
