import { Routes } from '@angular/router';

/**
 * Rutas del entrenador (todas cuelgan de `/coach`). Cada pantalla se carga solo cuando se visita
 * (`loadComponent`), igual que el resto de la aplicación.
 */
export const COACH_ROUTES: Routes = [
  {
    path: '',
    title: 'Entrenador | TeenSport',
    loadComponent: () => import('../home/home-shell/home-shell').then((m) => m.HomeShell),
  },
  {
    path: 'sessions',
    title: 'Sesiones y asistencia | TeenSport',
    loadComponent: () =>
      import('../attendance/session-list/session-list').then((m) => m.SessionList),
  },
  {
    path: 'sessions/generate',
    title: 'Generar sesiones | TeenSport',
    loadComponent: () =>
      import('../attendance/session-generate/session-generate').then((m) => m.SessionGenerate),
  },
  {
    path: 'sessions/new',
    title: 'Nueva sesión | TeenSport',
    loadComponent: () =>
      import('../attendance/session-form/session-form').then((m) => m.SessionForm),
  },
  {
    path: 'sessions/:id/edit',
    title: 'Reprogramar sesión | TeenSport',
    loadComponent: () =>
      import('../attendance/session-form/session-form').then((m) => m.SessionForm),
  },
  {
    path: 'attendance',
    title: 'Historial de asistencia | TeenSport',
    loadComponent: () =>
      import('../attendance/attendance-history/attendance-history').then(
        (m) => m.AttendanceHistory,
      ),
  },
  {
    path: 'reports',
    title: 'Reportes | TeenSport',
    loadComponent: () => import('../reports/reports-page/reports-page').then((m) => m.ReportsPage),
  },
  {
    path: 'sessions/:id/attendance',
    title: 'Tomar asistencia | TeenSport',
    loadComponent: () =>
      import('../attendance/attendance-form/attendance-form').then((m) => m.AttendanceForm),
  },
];
