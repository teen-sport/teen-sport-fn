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
    path: 'admin',
    title: 'Administración | TeenSport',
    canActivate: [authGuard, roleGuard('ADMIN')],
    loadComponent: () => import('./features/home/home-shell/home-shell').then((m) => m.HomeShell),
  },
  {
    path: 'coach',
    title: 'Entrenador | TeenSport',
    canActivate: [authGuard, roleGuard('COACH')],
    loadComponent: () => import('./features/home/home-shell/home-shell').then((m) => m.HomeShell),
  },
  {
    path: 'guardian',
    title: 'Acudiente | TeenSport',
    canActivate: [authGuard, roleGuard('GUARDIAN')],
    loadComponent: () => import('./features/home/home-shell/home-shell').then((m) => m.HomeShell),
  },
  {
    path: 'register',
    title: 'Crear cuenta | TeenSport',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },

  { path: '**', redirectTo: 'login' },
];
