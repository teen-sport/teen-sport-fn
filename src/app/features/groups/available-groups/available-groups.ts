import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { toApiError } from '../../../Core/http/api-error';
import { formatMoney, formatSchedule, periodOptions } from '../../../shared/format';
import { Athlete } from '../../athletes/athlete.models';
import { AthleteService } from '../../athletes/athlete.service';
import { Discipline, GroupAvailability } from '../../catalog/catalog.models';
import { CatalogService } from '../../catalog/catalog.service';
import { EnrollmentDetail } from '../../enrollments/enrollment.models';
import { EnrollmentRequest } from '../enrollment-request/enrollment-request';

/**
 * «Grupos disponibles»: el acudiente elige el mes y la disciplina, ve los grupos con sus horarios,
 * cupos y mensualidad, y desde cada tarjeta solicita la inscripción de uno de sus deportistas.
 */
@Component({
  selector: 'app-available-groups',
  imports: [ReactiveFormsModule, EnrollmentRequest],
  templateUrl: './available-groups.html',
  styleUrl: './available-groups.css',
  host: { class: 'page-wide' },
})
export class AvailableGroups {
  private readonly catalog = inject(CatalogService);
  private readonly athleteService = inject(AthleteService);
  private readonly router = inject(Router);

  protected readonly formatMoney = formatMoney;
  protected readonly formatSchedule = formatSchedule;

  /** El mes actual y los cinco siguientes (el API no acepta meses pasados). */
  protected readonly periods = periodOptions(6);
  protected readonly filters = new FormGroup({
    period: new FormControl(this.periods[0].value, { nonNullable: true }),
    disciplineId: new FormControl('', { nonNullable: true }),
  });

  protected readonly disciplines = signal<Discipline[]>([]);
  protected readonly athletes = signal<Athlete[]>([]);
  protected readonly groups = signal<GroupAvailability[]>([]);

  protected readonly setupLoading = signal(true);
  protected readonly setupError = signal<string | null>(null);
  protected readonly groupsLoading = signal(false);
  protected readonly groupsError = signal<string | null>(null);

  /** Grupo cuyo panel «Solicitar inscripción» está abierto. */
  protected readonly openGroupId = signal<number | null>(null);

  private groupsRequest?: Subscription;

  constructor() {
    this.loadSetup();
    // Cambiar el mes o la disciplina vuelve a consultar los grupos.
    this.filters.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.openGroupId.set(null);
      this.loadGroups();
    });
  }

  /** Carga lo que la pantalla necesita antes de mostrar nada: disciplinas y deportistas. */
  protected loadSetup(): void {
    this.setupLoading.set(true);
    this.setupError.set(null);
    forkJoin({
      disciplines: this.catalog.disciplines(),
      athletes: this.athleteService.list({ size: 100 }),
    }).subscribe({
      next: ({ disciplines, athletes }) => {
        this.disciplines.set(disciplines);
        this.athletes.set(athletes.content);
        this.setupLoading.set(false);
        this.loadGroups();
      },
      error: (error: unknown) => {
        this.setupError.set(toApiError(error).message);
        this.setupLoading.set(false);
      },
    });
  }

  /**
   * Consulta los grupos del mes y la disciplina elegidos.
   * @param silent si es true no se muestra «Buscando…» ni se tapa la lista: se usa para refrescar los
   *   cupos sin cerrar el panel de solicitud que el acudiente tiene abierto.
   */
  protected loadGroups(silent = false): void {
    // Si el acudiente cambia el filtro rápido, se descarta la respuesta anterior.
    this.groupsRequest?.unsubscribe();
    if (!silent) {
      this.groupsLoading.set(true);
      this.groupsError.set(null);
    }
    const { period, disciplineId } = this.filters.getRawValue();
    this.groupsRequest = this.catalog
      .availability(period, disciplineId ? Number(disciplineId) : null)
      .subscribe({
        next: (groups) => {
          this.groups.set(groups);
          this.groupsLoading.set(false);
        },
        error: (error: unknown) => {
          // Un refresco silencioso que falla deja la lista como estaba.
          if (!silent) {
            this.groupsError.set(toApiError(error).message);
            this.groupsLoading.set(false);
          }
        },
      });
  }

  protected toggleRequest(groupId: number): void {
    this.openGroupId.update((open) => (open === groupId ? null : groupId));
  }

  protected closeRequest(): void {
    this.openGroupId.set(null);
  }

  protected onRequested(enrollment: EnrollmentDetail): void {
    void this.router.navigate(['/guardian/enrollments', enrollment.id], {
      queryParams: { requested: 1 },
    });
  }
}
