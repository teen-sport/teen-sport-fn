import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { toApiError } from '../../../Core/http/api-error';
import { applyServerError, firstError } from '../../../shared/form-errors';
import { notBlank } from '../../../shared/validators';
import { friendlyError } from '../../admin/admin-errors';
import { Discipline } from '../../catalog/catalog.models';
import { CoachOption } from '../../coaches/coach.models';
import { CoachService } from '../../coaches/coach.service';
import { DisciplineService } from '../../disciplines/discipline.service';
import { CreateGroupRequest, MAX_GROUP_CAPACITY } from '../group.models';
import { GroupService } from '../group.service';

/**
 * Crear un grupo (H8). Solo se ofrecen disciplinas y entrenadores activos, que es lo que exige el
 * servidor. El grupo nace activo y sin horarios: al guardarlo se abre su detalle para agregárselos.
 */
@Component({
  selector: 'app-group-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './group-form.html',
  host: { class: 'page-narrow' },
})
export class GroupForm {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly groups = inject(GroupService);
  private readonly disciplineService = inject(DisciplineService);
  private readonly coachService = inject(CoachService);
  private readonly router = inject(Router);

  protected readonly firstError = firstError;
  protected readonly maxCapacity = MAX_GROUP_CAPACITY;

  protected readonly disciplines = signal<Discipline[]>([]);
  protected readonly coaches = signal<CoachOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    disciplineId: ['', [Validators.required]],
    coachId: ['', [Validators.required]],
    name: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    maxCapacity: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(MAX_GROUP_CAPACITY),
    ]),
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      disciplines: this.disciplineService.list('ACTIVE'),
      coaches: this.coachService.options('ACTIVE'),
    }).subscribe({
      next: ({ disciplines, coaches }) => {
        this.disciplines.set(disciplines);
        this.coaches.set(coaches);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.groups.create(this.buildRequest()).subscribe({
      next: (group) =>
        void this.router.navigate(['/admin/groups', group.id], {
          queryParams: { saved: 'created' },
        }),
      error: (error: unknown) => {
        this.formError.set(
          applyServerError(this.form, friendlyError(toApiError(error)), {
            INVALID_MAX_CAPACITY: 'maxCapacity',
            INVALID_COACH: 'coachId',
            DISCIPLINE_INACTIVE: 'disciplineId',
          }),
        );
        this.submitting.set(false);
      },
    });
  }

  private buildRequest(): CreateGroupRequest {
    const value = this.form.getRawValue();
    return {
      disciplineId: Number(value.disciplineId),
      coachId: Number(value.coachId),
      name: value.name.trim(),
      maxCapacity: value.maxCapacity as number,
    };
  }
}
