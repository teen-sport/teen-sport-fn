import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { toApiError } from '../../../Core/http/api-error';
import { EntityStatus } from '../../../Core/Models/role';
import { formatSchedule } from '../../../shared/format';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { Discipline } from '../../catalog/catalog.models';
import { CoachOption } from '../../coaches/coach.models';
import { CoachService } from '../../coaches/coach.service';
import { DisciplineService } from '../../disciplines/discipline.service';
import { Group } from '../group.models';
import { GroupService } from '../group.service';

/**
 * Grupos de la academia (H6), con sus horarios. El administrador filtra por disciplina, entrenador y
 * estado, y entra al detalle de cada grupo para editarlo. Al abrir la pantalla se cargan primero las
 * disciplinas y los entrenadores (para los filtros) y después la lista; al cambiar un filtro solo se
 * vuelve a pedir la lista.
 */
@Component({
  selector: 'app-group-list',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge],
  templateUrl: './group-list.html',
  host: { class: 'page-wide' },
})
export class GroupList {
  private readonly groupService = inject(GroupService);
  private readonly disciplineService = inject(DisciplineService);
  private readonly coachService = inject(CoachService);

  protected readonly filters = new FormGroup({
    disciplineId: new FormControl('', { nonNullable: true }),
    coachId: new FormControl('', { nonNullable: true }),
    status: new FormControl<EntityStatus | ''>('', { nonNullable: true }),
  });

  protected readonly disciplines = signal<Discipline[]>([]);
  protected readonly coaches = signal<CoachOption[]>([]);
  protected readonly groups = signal<Group[]>([]);

  protected readonly setupLoading = signal(true);
  protected readonly setupError = signal<string | null>(null);
  protected readonly groupsLoading = signal(false);
  protected readonly groupsError = signal<string | null>(null);
  protected readonly formatSchedule = formatSchedule;

  constructor() {
    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.loadGroups());
    this.loadSetup();
  }

  protected loadSetup(): void {
    this.setupLoading.set(true);
    this.setupError.set(null);
    forkJoin({
      disciplines: this.disciplineService.list(),
      coaches: this.coachService.options(),
    }).subscribe({
      next: ({ disciplines, coaches }) => {
        this.disciplines.set(disciplines);
        this.coaches.set(coaches);
        this.setupLoading.set(false);
        this.loadGroups();
      },
      error: (error: unknown) => {
        this.setupError.set(toApiError(error).message);
        this.setupLoading.set(false);
      },
    });
  }

  protected loadGroups(): void {
    this.groupsLoading.set(true);
    this.groupsError.set(null);
    const { disciplineId, coachId, status } = this.filters.getRawValue();
    this.groupService
      .list({
        disciplineId: disciplineId ? Number(disciplineId) : null,
        coachId: coachId ? Number(coachId) : null,
        status: status || null,
      })
      .subscribe({
        next: (groups) => {
          this.groups.set(groups);
          this.groupsLoading.set(false);
        },
        error: (error: unknown) => {
          this.groupsError.set(toApiError(error).message);
          this.groupsLoading.set(false);
        },
      });
  }

  protected get filtering(): boolean {
    const { disciplineId, coachId, status } = this.filters.getRawValue();
    return !!(disciplineId || coachId || status);
  }
}
