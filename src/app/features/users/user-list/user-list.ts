import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionService } from '../../../Core/Auth/session.service';
import { toApiError } from '../../../Core/http/api-error';
import { Page } from '../../../Core/Models/page';
import { EntityStatus, Role, ROLE_LABELS } from '../../../Core/Models/role';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { idTypeLabel } from '../../../shared/id-types';
import { Pagination } from '../../../shared/pagination/pagination';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { adminErrorMessage } from '../../admin/admin-errors';
import { AppUser } from '../user.models';
import { UserService } from '../user.service';

const PAGE_SIZE = 10;

/**
 * Usuarios (U6, U10): lista paginada de las cuentas de todos los roles, con búsqueda y filtros por
 * rol y estado. Desde aquí el administrador activa o desactiva cualquier cuenta y entra a crear o
 * editar administradores. Los entrenadores se editan en su propia pantalla; los acudientes se editan
 * ellos mismos desde «Mi perfil».
 */
@Component({
  selector: 'app-user-list',
  imports: [ReactiveFormsModule, RouterLink, Pagination, StatusBadge, ConfirmDialog],
  templateUrl: './user-list.html',
  host: { class: 'page-wide' },
})
export class UserList {
  private readonly service = inject(UserService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly ownId = inject(SessionService).user()?.id ?? null;

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly role = new FormControl<Role | ''>('', { nonNullable: true });
  protected readonly status = new FormControl<EntityStatus | ''>('', { nonNullable: true });
  protected readonly result = signal<Page<AppUser> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(this.savedNotice());
  protected readonly actionError = signal<string | null>(null);
  protected readonly deactivating = signal<AppUser | null>(null);
  protected readonly busy = signal(false);
  protected readonly idTypeLabel = idTypeLabel;
  protected readonly roleLabels = ROLE_LABELS;

  /** Texto y página que se están mostrando (la búsqueda se aplica al pulsar «Buscar»). */
  private term = '';
  private page = 0;

  constructor() {
    this.role.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.applySearch());
    this.status.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.applySearch());
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service
      .list({
        page: this.page,
        size: PAGE_SIZE,
        q: this.term,
        role: this.role.value || null,
        status: this.status.value || null,
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loadError.set(toApiError(error).message);
          this.loading.set(false);
        },
      });
  }

  protected applySearch(): void {
    this.term = this.search.value.trim();
    this.page = 0;
    this.notice.set(null);
    this.actionError.set(null);
    this.load();
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.role.setValue('', { emitEvent: false });
    this.status.setValue('', { emitEvent: false });
    this.applySearch();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  protected get filtering(): boolean {
    return this.term !== '' || this.role.value !== '' || this.status.value !== '';
  }

  protected fullName(user: AppUser): string {
    return `${user.firstNames} ${user.lastNames}`;
  }

  /** Cada rol se edita en un lugar distinto; el acudiente no se edita desde aquí. */
  protected editLink(user: AppUser): string[] | null {
    switch (user.role) {
      case 'ADMIN':
        return ['/admin/users', String(user.id), 'edit'];
      case 'COACH':
        return ['/admin/coaches', String(user.id), 'edit'];
      default:
        return null;
    }
  }

  /** El servidor no deja desactivar la propia cuenta, así que ni se ofrece el botón. */
  protected isOwn(user: AppUser): boolean {
    return user.id === this.ownId;
  }

  protected activate(user: AppUser): void {
    this.changeStatus(user, 'ACTIVE');
  }

  protected askToDeactivate(user: AppUser): void {
    this.actionError.set(null);
    this.deactivating.set(user);
  }

  protected cancelDeactivate(): void {
    this.deactivating.set(null);
  }

  protected confirmDeactivate(): void {
    const user = this.deactivating();
    if (user) {
      this.changeStatus(user, 'INACTIVE');
    }
  }

  private changeStatus(user: AppUser, status: EntityStatus): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    this.service.setStatus(user.id, status).subscribe({
      next: () => {
        this.busy.set(false);
        this.deactivating.set(null);
        this.notice.set(
          status === 'ACTIVE'
            ? `${this.fullName(user)} está activo de nuevo y ya puede iniciar sesión.`
            : `${this.fullName(user)} se desactivó y ya no puede iniciar sesión. Si tenía una sesión abierta, puede seguir funcionando hasta que venza (máximo una hora).`,
        );
        this.load();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.deactivating.set(null);
        this.actionError.set(adminErrorMessage(toApiError(error)));
      },
    });
  }

  private savedNotice(): string | null {
    const saved = this.query.get('saved');
    if (saved === 'created') {
      return 'Administrador creado. Ya puede iniciar sesión con la contraseña inicial.';
    }
    return saved === 'updated' ? 'Los datos del administrador se actualizaron.' : null;
  }
}
