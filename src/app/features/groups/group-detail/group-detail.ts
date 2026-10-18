import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { toApiError } from '../../../Core/http/api-error';
import { EntityStatus } from '../../../Core/Models/role';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { applyServerError, firstError } from '../../../shared/form-errors';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { notBlank } from '../../../shared/validators';
import { adminErrorMessage, friendlyError } from '../../admin/admin-errors';
import { CoachOption } from '../../coaches/coach.models';
import { CoachService } from '../../coaches/coach.service';
import { Group, MAX_GROUP_CAPACITY } from '../group.models';
import { GroupService } from '../group.service';
import { ScheduleManager } from '../schedule-manager/schedule-manager';

/**
 * Detalle de un grupo (H7) con todo lo que el administrador puede hacer sobre él: cambiar su nombre y
 * capacidad (H9), cambiarle el entrenador (H11), activarlo o desactivarlo (H10) y administrar sus
 * horarios (H12 a H14, en `ScheduleManager`). Cada respuesta del servidor trae el grupo actualizado y
 * esa es la versión que se muestra.
 */
@Component({
  selector: 'app-group-detail',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge, ConfirmDialog, ScheduleManager],
  templateUrl: './group-detail.html',
  host: { class: 'page-wide' },
})
export class GroupDetail {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly groups = inject(GroupService);
  private readonly coachService = inject(CoachService);
  private readonly route = inject(ActivatedRoute).snapshot;

  protected readonly groupId = Number(this.route.paramMap.get('id'));
  protected readonly firstError = firstError;
  protected readonly maxCapacity = MAX_GROUP_CAPACITY;

  protected readonly group = signal<Group | null>(null);
  protected readonly coaches = signal<CoachOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(this.savedNotice());
  protected readonly actionError = signal<string | null>(null);
  protected readonly savingData = signal(false);
  protected readonly dataError = signal<string | null>(null);
  protected readonly savingCoach = signal(false);
  protected readonly confirmingDeactivate = signal(false);
  protected readonly busy = signal(false);

  protected readonly dataForm = this.fb.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    maxCapacity: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(MAX_GROUP_CAPACITY),
    ]),
  });
  protected readonly coachControl = this.fb.control('');

  private readonly coachSelection = signal('');

  /** Solo tiene sentido cambiar de entrenador si se eligió uno distinto del actual. */
  protected readonly coachChanged = computed(() => {
    const current = this.group()?.coach.id;
    return this.coachSelection() !== '' && this.coachSelection() !== String(current);
  });

  constructor() {
    this.coachControl.valueChanges.subscribe((value) => this.coachSelection.set(value));
    this.load();
  }

  protected load(): void {
    if (!Number.isInteger(this.groupId) || this.groupId <= 0) {
      this.loadError.set('El grupo no existe.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      group: this.groups.get(this.groupId),
      coaches: this.coachService.options('ACTIVE'),
    }).subscribe({
      next: ({ group, coaches }) => {
        this.coaches.set(coaches);
        this.show(group);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }

  protected saveData(): void {
    if (this.savingData()) {
      return;
    }
    this.dataError.set(null);
    this.actionError.set(null);
    if (this.dataForm.invalid) {
      this.dataForm.markAllAsTouched();
      return;
    }
    const { name, maxCapacity } = this.dataForm.getRawValue();
    this.savingData.set(true);
    this.groups
      .update(this.groupId, { name: name.trim(), maxCapacity: maxCapacity as number })
      .subscribe({
        next: (group) => {
          this.show(group);
          this.notice.set('Los datos del grupo se guardaron.');
          this.savingData.set(false);
        },
        error: (error: unknown) => {
          // La capacidad rechazada se muestra junto a su campo; lo demás, sobre el formulario.
          this.dataError.set(
            applyServerError(this.dataForm, friendlyError(toApiError(error)), {
              INVALID_MAX_CAPACITY: 'maxCapacity',
              CAPACITY_BELOW_OCCUPIED: 'maxCapacity',
            }),
          );
          this.savingData.set(false);
        },
      });
  }

  protected changeCoach(): void {
    if (this.savingCoach() || !this.coachChanged()) {
      return;
    }
    this.actionError.set(null);
    this.savingCoach.set(true);
    this.groups.assignCoach(this.groupId, Number(this.coachControl.value)).subscribe({
      next: (group) => {
        this.show(group);
        this.notice.set('El entrenador del grupo se cambió.');
        this.savingCoach.set(false);
      },
      error: (error: unknown) => {
        this.actionError.set(adminErrorMessage(toApiError(error)));
        this.savingCoach.set(false);
      },
    });
  }

  protected activate(): void {
    this.changeStatus('ACTIVE');
  }

  protected askToDeactivate(): void {
    this.actionError.set(null);
    this.confirmingDeactivate.set(true);
  }

  protected cancelDeactivate(): void {
    this.confirmingDeactivate.set(false);
  }

  protected confirmDeactivate(): void {
    this.changeStatus('INACTIVE');
  }

  private changeStatus(status: EntityStatus): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    this.groups.setStatus(this.groupId, status).subscribe({
      next: (group) => {
        this.show(group);
        this.notice.set(
          status === 'ACTIVE' ? 'El grupo está activo de nuevo.' : 'El grupo se desactivó.',
        );
        this.busy.set(false);
        this.confirmingDeactivate.set(false);
      },
      error: (error: unknown) => {
        this.actionError.set(adminErrorMessage(toApiError(error)));
        this.busy.set(false);
        this.confirmingDeactivate.set(false);
      },
    });
  }

  /** Muestra el grupo y deja los formularios con sus valores. */
  private show(group: Group): void {
    this.group.set(group);
    this.dataForm.reset({ name: group.name, maxCapacity: group.maxCapacity });
    this.coachControl.setValue(String(group.coach.id));
  }

  private savedNotice(): string | null {
    return this.route.queryParamMap.get('saved') === 'created'
      ? 'Grupo creado. Agrega ahora sus horarios.'
      : null;
  }
}
