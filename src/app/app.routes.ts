import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './Core/Auth/auth.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Iniciar sesión | TeenSport',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Crear cuenta | TeenSport',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    // Pública y sin guestGuard: el enlace del correo debe abrir esta pantalla aunque haya otra sesión abierta.
    path: 'forgot-password',
    title: 'Recuperar contraseña | TeenSport',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    // Todo lo que sigue exige sesión y se muestra dentro del marco con el menú.
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        // Un solo guard protege todas las pantallas del administrador.
        path: 'admin',
        canActivate: [roleGuard('ADMIN')],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        // Un solo guard protege todas las pantallas del entrenador.
        path: 'coach',
        canActivate: [roleGuard('COACH')],
        loadChildren: () => import('./features/coach/coach.routes').then((m) => m.COACH_ROUTES),
      },
      {
        // Un solo guard protege todas las pantallas del acudiente.
        path: 'guardian',
        canActivate: [roleGuard('GUARDIAN')],
        loadChildren: () =>
          import('./features/guardian/guardian.routes').then((m) => m.GUARDIAN_ROUTES),
      },
      {
        path: 'profile',
        title: 'Mi perfil | TeenSport',
        loadComponent: () =>
          import('./features/profile/profile-view/profile-view').then((m) => m.ProfileView),
      },
      {
        path: 'profile/edit',
        title: 'Editar perfil | TeenSport',
        loadComponent: () =>
          import('./features/profile/profile-edit/profile-edit').then((m) => m.ProfileEdit),
      },
      {
        path: 'profile/password',
        title: 'Cambiar contraseña | TeenSport',
        loadComponent: () =>
          import('./features/profile/password-change/password-change').then(
            (m) => m.PasswordChange,
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
