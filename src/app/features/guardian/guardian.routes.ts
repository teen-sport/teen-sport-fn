import { Routes } from '@angular/router';

/**
 * Rutas del acudiente (todas cuelgan de `/guardian`). Cada pantalla se carga solo cuando se visita
 * (`loadComponent`), igual que el resto de la aplicación.
 */
export const GUARDIAN_ROUTES: Routes = [
  {
    path: '',
    title: 'Acudiente | TeenSport',
    loadComponent: () => import('../home/home-shell/home-shell').then((m) => m.HomeShell),
  },
  {
    path: 'athletes',
    title: 'Mis deportistas | TeenSport',
    loadComponent: () => import('../athletes/athlete-list/athlete-list').then((m) => m.AthleteList),
  },
  {
    path: 'athletes/new',
    title: 'Registrar deportista | TeenSport',
    loadComponent: () => import('../athletes/athlete-form/athlete-form').then((m) => m.AthleteForm),
  },
  {
    path: 'athletes/:id/edit',
    title: 'Editar deportista | TeenSport',
    loadComponent: () => import('../athletes/athlete-form/athlete-form').then((m) => m.AthleteForm),
  },
  {
    path: 'groups',
    title: 'Grupos disponibles | TeenSport',
    loadComponent: () =>
      import('../groups/available-groups/available-groups').then((m) => m.AvailableGroups),
  },
  {
    path: 'enrollments',
    title: 'Mis inscripciones | TeenSport',
    loadComponent: () =>
      import('../enrollments/my-enrollments/my-enrollments').then((m) => m.MyEnrollments),
  },
  {
    path: 'enrollments/:id',
    title: 'Inscripción | TeenSport',
    loadComponent: () =>
      import('../enrollments/enrollment-view/enrollment-view').then((m) => m.EnrollmentView),
  },
  {
    path: 'payments',
    title: 'Mis pagos | TeenSport',
    loadComponent: () => import('../payments/my-payments/my-payments').then((m) => m.MyPayments),
  },
];
