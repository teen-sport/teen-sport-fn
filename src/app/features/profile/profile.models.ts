import { UserProfile } from '../../Core/Auth/auth.models';

/** Datos propios del acudiente. */
export interface GuardianData {
  id: number;
  homeAddress?: string | null;
}

/** Datos propios del entrenador. */
export interface CoachData {
  id: number;
  specialty?: string | null;
  yearsOfExperience?: number | null;
}

/** Respuesta de GET y PUT /users/me: el perfil básico más los datos del rol. */
export interface MyProfile extends UserProfile {
  guardian?: GuardianData | null;
  coach?: CoachData | null;
}

/** Cuerpo de PUT /users/me. Reemplaza todos los campos editables. */
export interface UpdateProfileRequest {
  firstNames: string;
  lastNames: string;
  phone: string;
  homeAddress?: string;
  specialty?: string;
  yearsOfExperience?: number;
}

/** Cuerpo de PUT /users/me/password. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
