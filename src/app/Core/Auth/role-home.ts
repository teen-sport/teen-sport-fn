import { Role } from '../Models/role';

const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin',
  COACH: '/coach',
  GUARDIAN: '/guardian',
};

export function homeRouteFor(role: Role): string {
  return ROLE_HOME[role];
}
