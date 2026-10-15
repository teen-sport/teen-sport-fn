import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../Core/Auth/session.service';
import { SHORTCUTS } from '../../../layout/nav-items';

/** Pantalla de inicio de cada rol: accesos rápidos a sus tareas. */
@Component({
  selector: 'app-home-shell',
  imports: [RouterLink],
  templateUrl: './home-shell.html',
  styleUrl: './home-shell.css',
})
export class HomeShell {
  private readonly session = inject(SessionService);

  protected readonly shortcuts = computed(() => {
    const role = this.session.role();
    return role ? SHORTCUTS[role] : [];
  });
}
