import { Component, inject } from '@angular/core';
import { AuthService } from '../../../Core/Auth/auth.service';
import { SessionService } from '../../../Core/Auth/session.service';
import { ROLE_LABELS } from '../../../Core/Models/role';

@Component({
  selector: 'app-home-shell',
  templateUrl: './home-shell.html',
  styleUrl: './home-shell.css',
})
export class HomeShell {
  private readonly auth = inject(AuthService);
  protected readonly user = inject(SessionService).user;
  protected readonly roleLabels = ROLE_LABELS;

  protected logout(): void {
    this.auth.logout();
  }
}
