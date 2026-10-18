import { CoachOption, CoachUser } from '../app/features/coaches/coach.models';
import { Group } from '../app/features/groups/group.models';

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
