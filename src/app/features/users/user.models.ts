import { UserProfile } from '../../Core/Auth/auth.models';
import { EntityStatus, Role } from '../../Core/Models/role';
import { CoachData, GuardianData } from '../profile/profile.models';

/** Cuenta de cualquier rol tal como la devuelve GET /users (perfil básico más los datos de su rol). */
export interface AppUser extends UserProfile {
  guardian?: GuardianData | null;
  coach?: CoachData | null;
}

/** Filtros del listado de usuarios. La primera página es la 0. */
export interface UserQuery {
  page?: number;
  size?: number;
  q?: string;
  role?: Role | null;
  status?: EntityStatus | null;
}

/** Cuerpo de POST /users para crear un administrador (el back solo permite crear ADMIN o COACH). */
export interface CreateAdminRequest {
  role: 'ADMIN';
  firstNames: string;
  lastNames: string;
  idType: string;
  idNumber: string;
  email: string;
  phone: string;
  password: string;
}

/**
 * Cuerpo de PUT /users/{id} para un administrador. El documento, el rol y el estado no se cambian por
 * aquí. No se usa para acudientes (se perdería su dirección) ni para entrenadores (tienen su pantalla).
 */
export interface UpdateAdminRequest {
  firstNames: string;
  lastNames: string;
  email: string;
  phone: string;
}
