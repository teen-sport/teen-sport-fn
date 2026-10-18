/** Deportista tal como lo devuelve el API (E1–E4). */
export interface Athlete {
  id: number;
  guardianId: number;
  firstNames: string;
  lastNames: string;
  idType: string;
  idNumber: string;
  /** Fecha «YYYY-MM-DD». */
  birthDate: string;
  /** Años cumplidos hoy; la calcula el servidor. */
  age: number;
  gender?: string | null;
  /** Tiene alguna inscripción en revisión o activa. */
  hasActiveEnrollment: boolean;
}

/**
 * Cuerpo de POST /athletes y de PUT /athletes/{id}. Un acudiente no envía `guardianId`: el servidor
 * lo toma del token.
 */
export interface AthleteRequest {
  firstNames: string;
  lastNames: string;
  idType: string;
  idNumber: string;
  birthDate: string;
  gender?: string;
}

/** Filtros del listado de deportistas. La primera página es la 0. */
export interface AthleteQuery {
  page?: number;
  size?: number;
  q?: string;
}

/** Valores de género que ofrece el formulario (el API guarda texto libre de hasta 20 caracteres). */
export const GENDERS = [
  { value: '', label: 'Prefiero no indicarlo' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'OTHER', label: 'Otro' },
];

export function genderLabel(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return GENDERS.find((gender) => gender.value === value)?.label ?? value;
}
