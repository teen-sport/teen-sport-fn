import { CoachOption, CoachUser } from '../app/features/coaches/coach.models';
import { Group } from '../app/features/groups/group.models';
import { AppUser } from '../app/features/users/user.models';

/** Entrenador tal como lo devuelve GET /users. */
export function coachUser(overrides: Partial<CoachUser> = {}): CoachUser {
  return {
    id: 8,
    idType: 'CC',
    idNumber: '1000000001',
    firstNames: 'Carlos',
    lastNames: 'Ruiz',
    email: 'carlos@correo.com',
    phone: '3001234567',
    role: 'COACH',
    status: 'ACTIVE',
    acceptedDataPolicy: false,
    coach: { id: 5, specialty: 'Fútbol', yearsOfExperience: 6 },
    ...overrides,
  };
}

/** Entrenador de la lista corta GET /coaches (su `id` no es el del usuario). */
export function coachOption(overrides: Partial<CoachOption> = {}): CoachOption {
  return {
    id: 5,
    userId: 8,
    fullName: 'Carlos Ruiz',
    specialty: 'Fútbol',
    yearsOfExperience: 6,
    status: 'ACTIVE',
    ...overrides,
  };
}

export function group(overrides: Partial<Group> = {}): Group {
  return {
    id: 11,
    name: 'Fútbol sub-15',
    discipline: { id: 1, name: 'Fútbol' },
    coach: { id: 5, fullName: 'Carlos Ruiz' },
    maxCapacity: 12,
    status: 'ACTIVE',
    schedules: [
      { id: 1, dayOfWeek: 'MONDAY', startTime: '16:00', endTime: '17:30' },
      { id: 2, dayOfWeek: 'WEDNESDAY', startTime: '16:00', endTime: '17:30' },
    ],
    ...overrides,
  };
}

/** Administrador tal como lo devuelve GET /users. */
export function adminUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 11,
    idType: 'CC',
    idNumber: '1000000002',
    firstNames: 'Laura',
    lastNames: 'Gómez',
    email: 'laura@correo.com',
    phone: '3009876543',
    role: 'ADMIN',
    status: 'ACTIVE',
    acceptedDataPolicy: false,
    ...overrides,
  };
}

/** Acudiente tal como lo devuelve GET /users. */
export function guardianUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 21,
    idType: 'CC',
    idNumber: '1000000003',
    firstNames: 'Marta',
    lastNames: 'Pérez',
    email: 'marta@correo.com',
    phone: '3011112222',
    role: 'GUARDIAN',
    status: 'ACTIVE',
    acceptedDataPolicy: true,
    guardian: { id: 4, homeAddress: 'Calle 1 # 2-3' },
    ...overrides,
  };
}
