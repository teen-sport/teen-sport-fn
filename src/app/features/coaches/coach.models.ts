import { UserProfile } from '../../Core/Auth/auth.models';
import { CoachData } from '../profile/profile.models';

/** Cuenta de entrenador tal como la devuelve GET /users (perfil básico más sus datos de entrenador). */
export interface CoachUser extends UserProfile {
  coach?: CoachData | null;
}

/** Entrenador resumido para elegirlo en un grupo (GET /coaches). `id` es el del entrenador, no el del usuario. */
export interface CoachOption {
  id: number;
  userId: number;
  fullName: string;
  specialty?: string | null;
  yearsOfExperience?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

/** Filtros del listado de entrenadores. La primera página es la 0. */
export interface CoachQuery {
  page?: number;
  size?: number;
  q?: string;
  status?: 'ACTIVE' | 'INACTIVE' | null;
}

/** Cuerpo de POST /users para crear un entrenador. */
export interface CreateCoachRequest {
  role: 'COACH';
  firstNames: string;
  lastNames: string;
  idType: string;
  idNumber: string;
  email: string;
  phone: string;
  password: string;
  specialty?: string;
  yearsOfExperience?: number;
}

/** Cuerpo de PUT /users/{id}. El documento, el rol y el estado no se cambian por aquí. */
export interface UpdateCoachRequest {
  firstNames: string;
  lastNames: string;
  email: string;
  phone: string;
  specialty?: string;
  yearsOfExperience?: number;
}
