import { MyProfile } from '../app/features/profile/profile.models';
import { Role } from '../app/Core/Models/role';

/** Perfil de ejemplo con los datos propios del rol (acudiente, entrenador o administrador). */
export function myProfile(role: Role = 'GUARDIAN', overrides: Partial<MyProfile> = {}): MyProfile {
  return {
    id: 7,
    idType: 'CC',
    idNumber: '1094567890',
    firstNames: 'Marta',
    lastNames: 'Gómez',
    email: 'marta@correo.com',
    phone: '3001234567',
    role,
    status: 'ACTIVE',
    acceptedDataPolicy: true,
    guardian: role === 'GUARDIAN' ? { id: 3, homeAddress: 'Calle 10 # 5-20' } : null,
    coach: role === 'COACH' ? { id: 5, specialty: 'Fútbol', yearsOfExperience: 4 } : null,
    ...overrides,
  };
}
