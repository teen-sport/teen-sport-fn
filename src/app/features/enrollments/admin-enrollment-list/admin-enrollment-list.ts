import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { toApiError } from '../../../Core/http/api-error';
import {
  ENROLLMENT_STATUS_LABELS,
  EnrollmentStatus,
  IN_FORCE_STATUSES,
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
} from '../../../Core/Models/enrollment-status';
import { Page } from '../../../Core/Models/page';
import { formatPeriod, periodRange } from '../../../shared/format';
import { Pagination } from '../../../shared/pagination/pagination';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { Discipline } from '../../catalog/catalog.models';
import { DisciplineService } from '../../disciplines/discipline.service';
import { Group } from '../../groups/group.models';
import { GroupService } from '../../groups/group.service';
import { EnrollmentSummary } from '../enrollment.models';
import { EnrollmentService } from '../enrollment.service';

const PAGE_SIZE = 10;

/**
 * Inscripciones de toda la academia (vista del administrador). Se filtra por estado, pago, mes,
 * disciplina y grupo, y por «pago avisado» (los acudientes que dicen haber pagado y esperan que el
 * administrador lo registre). Al abrir la pantalla se cargan primero las disciplinas y los grupos
 * (para los filtros) y después la página de inscripciones; al cambiar un filtro se vuelve a la
 * primera página y solo se pide la lista.
 */
@Component({
  selector: 'app-admin-enrollment-list',
  imports: [ReactiveFormsModule, RouterLink, Pagination, StatusBadge],
  templateUrl: './admin-enrollment-list.html',
  host: { class: 'page-wide' },
})
export class AdminEnrollmentList {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly disciplineService = inject(DisciplineService);
  private readonly groupService = inject(GroupService);

  protected readonly formatPeriod = formatPeriod;
  protected readonly statusOptions = (
    Object.entries(ENROLLMENT_STATUS_LABELS) as [EnrollmentStatus, string][]
  ).map(([value, label]) => ({ value, label }));
  protected readonly paymentOptions = (
    Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][]
  ).map(([value, label]) => ({ value, label }));
  /** Tres meses atrás (inscripciones que siguen vigentes) y seis hacia adelante. */
  protected readonly periodOptions = periodRange(3, 6);

  protected readonly filters = new FormGroup({
    status: new FormControl<EnrollmentStatus | ''>('', { nonNullable: true }),
    paymentStatus: new FormControl<PaymentStatus | ''>('', { nonNullable: true }),
    period: new FormControl('', { nonNullable: true }),
    disciplineId: new FormControl('', { nonNullable: true }),
    groupId: new FormControl('', { nonNullable: true }),
    reportedOnly: new FormControl(false, { nonNullable: true }),
  });

  protected readonly disciplines = signal<Discipline[]>([]);
  private readonly allGroups = signal<Group[]>([]);
  private readonly disciplineFilter = signal('');
  /** Si se eligió una disciplina, solo se ofrecen sus grupos. */
  protected readonly groupOptions = computed(() => {
    const disciplineId = this.disciplineFilter();
    return this.allGroups().filter(
      (group) => !disciplineId || `${group.discipline.id}` === disciplineId,
    );
  });

  protected readonly result = signal<Page<EnrollmentSummary> | null>(null);
  protected readonly setupLoading = signal(true);
  protected readonly setupError = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);

  private page = 0;

  constructor() {
    // Al cambiar de disciplina, el grupo elegido puede dejar de pertenecerle: se limpia sin avisar
    // (emitEvent: false) porque la lista se pide una sola vez, en la suscripción del formulario.
    this.filters.controls.disciplineId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((disciplineId) => {
        this.disciplineFilter.set(disciplineId);
        this.filters.controls.groupId.setValue('', { emitEvent: false });
      });
    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.page = 0;
      this.load();
    });
    this.loadSetup();
  }

  protected loadSetup(): void {
    this.setupLoading.set(true);
    this.setupError.set(null);
    forkJoin({
      disciplines: this.disciplineService.list(),
      groups: this.groupService.list(),
    }).subscribe({
      next: ({ disciplines, groups }) => {
        this.disciplines.set(disciplines);
        this.allGroups.set(groups);
        this.setupLoading.set(false);
        this.load();
      },
      error: (error: unknown) => {
        this.setupError.set(toApiError(error).message);
        this.setupLoading.set(false);
      },
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const { status, paymentStatus, period, disciplineId, groupId, reportedOnly } =
      this.filters.getRawValue();
    this.enrollmentService
      .list({
        page: this.page,
        size: PAGE_SIZE,
        status: status || null,
        paymentStatus: paymentStatus || null,
        period: period || null,
        disciplineId: disciplineId ? Number(disciplineId) : null,
        groupId: groupId ? Number(groupId) : null,
        paymentReported: reportedOnly ? true : null,
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

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  protected clearFilters(): void {
    this.filters.reset();
  }

  protected get filtering(): boolean {
    return Object.values(this.filters.getRawValue()).some((value) => !!value);
  }

  /** El pago solo importa mientras la inscripción está vigente. */
  protected isInForce(enrollment: EnrollmentSummary): boolean {
    return IN_FORCE_STATUSES.includes(enrollment.status);
  }
}
