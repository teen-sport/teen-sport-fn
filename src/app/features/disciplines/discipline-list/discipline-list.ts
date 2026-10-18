import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { EntityStatus } from '../../../Core/Models/role';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { formatMoney } from '../../../shared/format';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { adminErrorMessage } from '../../admin/admin-errors';
import { Discipline } from '../../catalog/catalog.models';
import { DisciplineService } from '../discipline.service';

/**
 * Disciplinas del catálogo (H1). El administrador las ve todas, filtra por estado, entra a editarlas
 * y las activa o desactiva. Desactivar pide confirmación; el servidor rechaza hacerlo mientras la
 * disciplina tenga grupos activos.
 */
@Component({
  selector: 'app-discipline-list',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge, ConfirmDialog],
  templateUrl: './discipline-list.html',
  host: { class: 'page-wide' },
})
export class DisciplineList {
  private readonly service = inject(DisciplineService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly status = new FormControl<EntityStatus | ''>('', { nonNullable: true });
  protected readonly disciplines = signal<Discipline[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(this.savedNotice());
  protected readonly actionError = signal<string | null>(null);
  /** Disciplina cuya desactivación espera confirmación. */
  protected readonly deactivating = signal<Discipline | null>(null);
  protected readonly busy = signal(false);
  protected readonly formatMoney = formatMoney;

  constructor() {
    this.status.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.applyFilter());
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.list(this.status.value || null).subscribe({
      next: (items) => {
        this.disciplines.set(items);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }

  protected applyFilter(): void {
    this.notice.set(null);
    this.actionError.set(null);
    this.load();
  }

  protected activate(discipline: Discipline): void {
    this.changeStatus(discipline, 'ACTIVE');
  }

  protected askToDeactivate(discipline: Discipline): void {
    this.actionError.set(null);
    this.deactivating.set(discipline);
  }

  protected cancelDeactivate(): void {
    this.deactivating.set(null);
  }

  protected confirmDeactivate(): void {
    const discipline = this.deactivating();
    if (discipline) {
      this.changeStatus(discipline, 'INACTIVE');
    }
  }

  private changeStatus(discipline: Discipline, status: EntityStatus): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    this.service.setStatus(discipline.id, status).subscribe({
      next: () => {
        this.busy.set(false);
        this.deactivating.set(null);
        this.notice.set(
          status === 'ACTIVE'
            ? `«${discipline.name}» está activa de nuevo.`
            : `«${discipline.name}» se desactivó.`,
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
      return 'Disciplina creada. Ya puedes crear grupos para ella.';
    }
    return saved === 'updated' ? 'La disciplina se actualizó.' : null;
  }
}
