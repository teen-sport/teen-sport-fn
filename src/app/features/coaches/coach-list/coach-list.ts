import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { Page } from '../../../Core/Models/page';
import { EntityStatus } from '../../../Core/Models/role';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { idTypeLabel } from '../../../shared/id-types';
import { Pagination } from '../../../shared/pagination/pagination';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { adminErrorMessage } from '../../admin/admin-errors';
import { CoachUser } from '../coach.models';
import { CoachService } from '../coach.service';

const PAGE_SIZE = 10;

/**
 * Entrenadores (U6): lista paginada con búsqueda y filtro por estado. Desde aquí se crean, se editan y
 * se activan o desactivan. El servidor no deja desactivar a un entrenador que tenga grupos activos.
 */
@Component({
  selector: 'app-coach-list',
  imports: [ReactiveFormsModule, RouterLink, Pagination, StatusBadge, ConfirmDialog],
  templateUrl: './coach-list.html',
  host: { class: 'page-wide' },
})
export class CoachList {
  private readonly service = inject(CoachService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly status = new FormControl<EntityStatus | ''>('', { nonNullable: true });
  protected readonly result = signal<Page<CoachUser> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(this.savedNotice());
  protected readonly actionError = signal<string | null>(null);
  protected readonly deactivating = signal<CoachUser | null>(null);
  protected readonly busy = signal(false);
  protected readonly idTypeLabel = idTypeLabel;

  /** Texto y página que se están mostrando (la búsqueda se aplica al pulsar «Buscar»). */
  private term = '';
  private page = 0;

  constructor() {
    this.status.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.applySearch());
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service
      .list({ page: this.page, size: PAGE_SIZE, q: this.term, status: this.status.value || null })
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

  protected clearSearch(): void {
    this.search.setValue('');
    this.applySearch();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  protected get filtering(): boolean {
    return this.term !== '' || this.status.value !== '';
  }

  protected fullName(coach: CoachUser): string {
    return `${coach.firstNames} ${coach.lastNames}`;
  }

  protected activate(coach: CoachUser): void {
    this.changeStatus(coach, 'ACTIVE');
  }

  protected askToDeactivate(coach: CoachUser): void {
    this.actionError.set(null);
    this.deactivating.set(coach);
  }

  protected cancelDeactivate(): void {
    this.deactivating.set(null);
  }

  protected confirmDeactivate(): void {
    const coach = this.deactivating();
    if (coach) {
      this.changeStatus(coach, 'INACTIVE');
    }
  }

  private changeStatus(coach: CoachUser, status: EntityStatus): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    this.service.setStatus(coach.id, status).subscribe({
      next: () => {
        this.busy.set(false);
        this.deactivating.set(null);
        this.notice.set(
          status === 'ACTIVE'
            ? `${this.fullName(coach)} está activo de nuevo.`
            : `${this.fullName(coach)} se desactivó y ya no puede iniciar sesión.`,
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
      return 'Entrenador creado. Ya puedes asignarlo a un grupo.';
    }
    return saved === 'updated' ? 'Los datos del entrenador se actualizaron.' : null;
  }
}
