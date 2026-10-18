import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './Core/Auth/auth.guards';

const homePage = () => import('./features/home/home-shell/home-shell').then((m) => m.HomeShell);

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
    // Todo lo que sigue exige sesión y se muestra dentro del marco con el menú.
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'admin',
        title: 'Administración | TeenSport',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: homePage,
      },
      {
        path: 'coach',
        title: 'Entrenador | TeenSport',
        canActivate: [roleGuard('COACH')],
        loadComponent: homePage,
      },
      {
        path: 'guardian',
        title: 'Acudiente | TeenSport',
        canActivate: [roleGuard('GUARDIAN')],
        loadComponent: homePage,
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
