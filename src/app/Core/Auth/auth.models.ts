import { EntityStatus, Role } from '../Models/role';

/** Cuerpo de POST /auth/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Datos mínimos del usuario que llegan junto con el token */
export interface LoggedUser {
  id: number;
  firstNames: string;
  lastNames: string;
  role: Role;
  guardianId?: number | null;
  coachId?: number | null;
}

/** Respuesta de POST /auth/login */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: LoggedUser;
}

/** Cuerpo de POST /users/register */
export interface RegisterGuardianRequest {
  firstNames: string;
  lastNames: string;
  idType: string;
  idNumber: string;
  email: string;
  phone: string;
  homeAddress?: string;
  password: string;
  acceptedDataPolicy: boolean;
}

/** Perfil de un usuario (respuesta de U2 y U3) */
export interface UserProfile {
  id: number;
  idType: string;
  idNumber: string;
  firstNames: string;
  lastNames: string;
  email: string;
  phone: string;
  role: Role;
  status: EntityStatus;
  acceptedDataPolicy: boolean;
}


export interface StoredSession {
  accessToken: string;
  expiresAt: number;
  user: LoggedUser;
}
