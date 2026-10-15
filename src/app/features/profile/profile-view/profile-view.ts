import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { ROLE_LABELS } from '../../../Core/Models/role';
import { idTypeLabel } from '../../../shared/id-types';
import { MyProfile } from '../profile.models';
import { ProfileService } from '../profile.service';

/** U3: muestra los datos de la persona que tiene la sesión abierta. */
@Component({
  selector: 'app-profile-view',
  imports: [RouterLink],
  templateUrl: './profile-view.html',
  host: { class: 'page-narrow' },
})
export class ProfileView {
  private readonly service = inject(ProfileService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly profile = signal<MyProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = this.noticeFor();
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly idTypeLabel = idTypeLabel;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.getMe().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }

  private noticeFor(): string | null {
    if (this.query.has('updated')) {
      return 'Tus datos se actualizaron.';
    }
    if (this.query.has('passwordChanged')) {
      return 'Tu contraseña se cambió correctamente.';
    }
    return null;
  }
}
