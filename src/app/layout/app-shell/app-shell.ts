import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../Core/Auth/auth.service';
import { homeRouteFor } from '../../Core/Auth/role-home';
import { SessionService } from '../../Core/Auth/session.service';
import { ROLE_LABELS } from '../../Core/Models/role';
import { NAV_ITEMS } from '../nav-items';

/**
 * Marco común de todas las pantallas con sesión: encabezado, menú por rol y contenido.
 * En pantallas angostas el menú se recoge detrás del botón de tres rayas.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);

  protected readonly user = this.session.user;
  protected readonly items = computed(() => {
    const role = this.session.role();
    return role ? NAV_ITEMS[role] : [];
  });
  protected readonly roleLabel = computed(() => {
    const role = this.session.role();
    return role ? ROLE_LABELS[role] : '';
  });
  protected readonly homeLink = computed(() => {
    const role = this.session.role();
    return role ? homeRouteFor(role) : '/login';
  });

  /** Solo importa en pantallas angostas: en las anchas el menú siempre se ve. */
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  /** Escape cierra el menú desplegado, como en cualquier menú accesible. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu();
  }

  protected logout(): void {
    this.closeMenu();
    this.auth.logout();
  }
}
