import { Routes } from '@angular/router';

/**
 * Rutas del administrador (todas cuelgan de `/admin`). Cada pantalla se carga solo cuando se visita
 * (`loadComponent`), igual que en el resto de la aplicación.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    title: 'Administración | TeenSport',
    loadComponent: () => import('../home/home-shell/home-shell').then((m) => m.HomeShell),
  },
  {
    path: 'disciplines',
    title: 'Disciplinas | TeenSport',
    loadComponent: () =>
      import('../disciplines/discipline-list/discipline-list').then((m) => m.DisciplineList),
  },
  {
    path: 'disciplines/new',
    title: 'Nueva disciplina | TeenSport',
    loadComponent: () =>
      import('../disciplines/discipline-form/discipline-form').then((m) => m.DisciplineForm),
  },
  {
    path: 'disciplines/:id/edit',
    title: 'Editar disciplina | TeenSport',
    loadComponent: () =>
      import('../disciplines/discipline-form/discipline-form').then((m) => m.DisciplineForm),
  },
  {
    path: 'coaches',
    title: 'Entrenadores | TeenSport',
    loadComponent: () => import('../coaches/coach-list/coach-list').then((m) => m.CoachList),
  },
  {
    path: 'coaches/new',
    title: 'Nuevo entrenador | TeenSport',
    loadComponent: () => import('../coaches/coach-form/coach-form').then((m) => m.CoachForm),
  },
  {
    path: 'coaches/:id/edit',
    title: 'Editar entrenador | TeenSport',
    loadComponent: () => import('../coaches/coach-form/coach-form').then((m) => m.CoachForm),
  },
  {
    path: 'groups',
    title: 'Grupos | TeenSport',
    loadComponent: () => import('../groups/group-list/group-list').then((m) => m.GroupList),
  },
  {
    path: 'groups/new',
    title: 'Nuevo grupo | TeenSport',
    loadComponent: () => import('../groups/group-form/group-form').then((m) => m.GroupForm),
  },
  {
    path: 'groups/:id',
    title: 'Grupo | TeenSport',
    loadComponent: () => import('../groups/group-detail/group-detail').then((m) => m.GroupDetail),
  },
  {
    path: 'enrollments',
    title: 'Inscripciones | TeenSport',
    loadComponent: () =>
      import('../enrollments/admin-enrollment-list/admin-enrollment-list').then(
        (m) => m.AdminEnrollmentList,
      ),
  },
  {
    path: 'enrollments/:id',
    title: 'Inscripción | TeenSport',
    loadComponent: () =>
      import('../enrollments/admin-enrollment-view/admin-enrollment-view').then(
        (m) => m.AdminEnrollmentView,
      ),
  },
  {
    path: 'payments',
    title: 'Pagos | TeenSport',
    loadComponent: () =>
      import('../payments/admin-payment-list/admin-payment-list').then((m) => m.AdminPaymentList),
  },
];
