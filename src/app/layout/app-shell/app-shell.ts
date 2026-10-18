import { Component, computed, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../Core/Auth/auth.service';
import { homeRouteFor } from '../../Core/Auth/role-home';
import { SessionService } from '../../Core/Auth/session.service';
import { ROLE_LABELS } from '../../Core/Models/role';
import { COLLAPSE_MENU_FROM, NAV_ITEMS } from '../nav-items';

/** Ancho (80 rem = 1280 px) por debajo del cual el menú se recoge detrás de las tres rayas. */
const NARROW_SCREEN = '(max-width: 80rem)';

/**
 * Marco común de todas las pantallas con sesión: encabezado, menú por rol y contenido.
 * El menú se recoge detrás del botón de tres rayas en pantallas angostas y, en cualquier pantalla,
 * cuando el rol tiene tantas opciones que no caben en una fila (`COLLAPSE_MENU_FROM`). Al pulsar el
 * botón se despliega un cuadro pequeño con las opciones; se cierra al elegir una, con Escape o al
 * tocar fuera.
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

  /** Si el menú está desplegado. Solo importa cuando el menú está recogido. */
  protected readonly menuOpen = signal(false);

  private readonly narrow = signal(false);
  /** Menú recogido: pantalla angosta o rol con muchas opciones. */
  protected readonly compact = computed(
    () => this.narrow() || this.items().length >= COLLAPSE_MENU_FROM,
  );

  constructor() {
    // matchMedia avisa cuando la ventana cruza el ancho límite (por ejemplo, al girar el celular).
    const query = typeof matchMedia === 'function' ? matchMedia(NARROW_SCREEN) : null;
    if (query) {
      this.narrow.set(query.matches);
      const onChange = (event: MediaQueryListEvent): void => this.narrow.set(event.matches);
      query.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
    }
  }

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

  /** Tocar fuera del cuadro (y fuera del botón, que ya abre y cierra por su cuenta) lo cierra. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (
      this.menuOpen() &&
      target instanceof Element &&
      !target.closest('.app-menu, .app-menu-toggle')
    ) {
      this.closeMenu();
    }
  }

  protected logout(): void {
    this.closeMenu();
    this.auth.logout();
  }
}
