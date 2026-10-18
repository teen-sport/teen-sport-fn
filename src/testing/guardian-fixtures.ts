import { Athlete } from '../app/features/athletes/athlete.models';
import { Discipline, GroupAvailability } from '../app/features/catalog/catalog.models';
import { EnrollmentDetail, EnrollmentSummary } from '../app/features/enrollments/enrollment.models';
import { Payment } from '../app/features/payments/payment.models';
import { Page } from '../app/Core/Models/page';

/** Una página del API con los elementos dados. */
export function page<T>(content: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return {
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...overrides,
  };
}

export function athlete(overrides: Partial<Athlete> = {}): Athlete {
  return {
    id: 4,
    guardianId: 3,
    firstNames: 'Sofía',
    lastNames: 'Pérez',
    idType: 'TI',
    idNumber: '1098765432',
    birthDate: '2011-03-02',
    age: 15,
    gender: 'FEMALE',
    hasActiveEnrollment: false,
    ...overrides,
  };
}

export function discipline(overrides: Partial<Discipline> = {}): Discipline {
  return {
    id: 1,
    name: 'Fútbol',
    description: 'Fútbol juvenil',
    monthlyFee: 120000,
    status: 'ACTIVE',
    ...overrides,
  };
}

export function groupAvailability(overrides: Partial<GroupAvailability> = {}): GroupAvailability {
  return {
    groupId: 11,
    groupName: 'Fútbol sub-15',
    discipline: { id: 1, name: 'Fútbol', monthlyFee: 120000 },
    coach: { id: 5, fullName: 'Carlos Ruiz' },
    schedules: [
      { id: 1, dayOfWeek: 'MONDAY', startTime: '16:00', endTime: '17:30' },
      { id: 2, dayOfWeek: 'WEDNESDAY', startTime: '16:00', endTime: '17:30' },
    ],
    maxCapacity: 20,
    occupiedSpots: 14,
    availableSpots: 6,
    ...overrides,
  };
}

export function enrollmentSummary(overrides: Partial<EnrollmentSummary> = {}): EnrollmentSummary {
  return {
    id: 21,
    athlete: { id: 4, firstNames: 'Sofía', lastNames: 'Pérez' },
    group: { id: 11, name: 'Fútbol sub-15' },
    discipline: { id: 1, name: 'Fútbol' },
    period: '2026-11',
    status: 'PENDING_REVIEW',
    paymentStatus: 'OVERDUE',
    paymentReported: false,
    createdAt: '2026-10-16T15:00:00Z',
    ...overrides,
  };
}

export function enrollmentDetail(overrides: Partial<EnrollmentDetail> = {}): EnrollmentDetail {
  return {
    ...enrollmentSummary(),
    schedules: [
      { id: 1, dayOfWeek: 'MONDAY', startTime: '16:00', endTime: '17:30' },
      { id: 2, dayOfWeek: 'WEDNESDAY', startTime: '16:00', endTime: '17:30' },
    ],
    reviewNotes: null,
    confirmedAt: null,
    ...overrides,
  };
}

export function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 31,
    enrollmentId: 21,
    athlete: { id: 4, firstNames: 'Sofía', lastNames: 'Pérez' },
    discipline: { id: 1, name: 'Fútbol' },
    period: '2026-11',
    amountPaid: 120000,
    paymentDate: '2026-11-03',
    receiptReference: 'R-0042',
    notes: null,
    registeredBy: { id: 1, fullName: 'Admin TeenSport' },
    createdAt: '2026-11-03T14:00:00Z',
    ...overrides,
  };
}
