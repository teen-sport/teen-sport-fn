/** Roles del contrato del API. El deportista no tiene cuenta, por eso no es un rol. */

export type Role = 'ADMIN' | 'COACH' | 'GUARDIAN';

export type EntityStatus = 'ACTIVE' | 'INACTIVE';

/** Nombre de cada rol como lo ve el usuario. */

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  COACH: 'Entrenador',
  GUARDIAN: 'Acudiente',
};
