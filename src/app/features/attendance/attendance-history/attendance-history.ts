import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SessionService } from '../../../Core/Auth/session.service';
import { toApiError } from '../../../Core/http/api-error';
import { Page } from '../../../Core/Models/page';
import { Pagination } from '../../../shared/pagination/pagination';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { formatDate, formatPercent } from '../../../shared/format';
import { Athlete } from '../../athletes/athlete.models';
import { AthleteService } from '../../athletes/athlete.service';
import { Group } from '../../groups/group.models';
import { GroupService } from '../../groups/group.service';
import { reportErrorMessage } from '../../reports/report-errors';
import { AthleteAttendanceReport } from '../../reports/report.models';
import { ReportService } from '../../reports/report.service';
import { AttendanceRecord } from '../attendance.models';
import { AttendanceService } from '../attendance.service';
import { attendanceHistoryRoute } from '../sessions-route';

const PAGE_SIZE = 20;

/**
 * Historial de asistencia (A9): las marcas registradas, de la más reciente a la más antigua, con
 * filtros por grupo, estado y fechas. El servidor devuelve a cada rol solo lo suyo: todo al
 * administrador, los grupos del entrenador y los deportistas del acudiente.
 *
 * Cuando se mira a un solo deportista (el acudiente lo elige de su lista; el administrador y el
 * entrenador llegan con `?athleteId=` desde el nombre de la tabla o desde los reportes) se muestra
 * además su resumen (R3): sesiones registradas, presentes, ausentes y porcentaje de asistencia.
 */
@Component({
  selector: 'app-attendance-history',
  imports: [ReactiveFormsModule, RouterLink, Pagination, StatusBadge],
  templateUrl: './attendance-history.html',
  host: { class: 'page-wide' },
})
export class AttendanceHistory {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(AttendanceService);
  private readonly reports = inject(ReportService);
  private readonly groupService = inject(GroupService);
  private readonly athleteService = inject(AthleteService);
  private readonly auth = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isGuardian = computed(() => this.auth.role() === 'GUARDIAN');
  /** Frase corta bajo el título que dice para qué sirve la pantalla según el rol. */
  protected readonly lead = computed(() =>
    this.isGuardian()
      ? 'Consulta si tus deportistas asistieron a sus sesiones.'
      : 'Revisa quién asistió a cada sesión. Filtra por grupo, asistencia o fechas.',
  );
  /** Ruta de esta pantalla para el rol, para los enlaces que vuelven a ella. */
  protected readonly base = computed(() => attendanceHistoryRoute(this.auth.role()));
  protected readonly formatDate = formatDate;
  protected readonly formatPercent = formatPercent;

  protected readonly filters = this.fb.group({
    groupId: '',
    athleteId: '',
    status: '',
    from: '',
    to: '',
  });

  protected readonly groups = signal<Group[]>([]);
  protected readonly athletes = signal<Athlete[]>([]);
  protected readonly result = signal<Page<AttendanceRecord> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly rangeError = signal(false);

  protected readonly summary = signal<AthleteAttendanceReport | null>(null);
  protected readonly summaryLoading = signal(false);
  protected readonly summaryError = signal<string | null>(null);

  /** El deportista que se está mirando, o null si se ven todos. */
  protected readonly athleteId = signal<number | null>(null);
  protected readonly athleteName = computed(() => {
    const id = this.athleteId();
    if (id === null) {
      return null;
    }
    const own = this.athletes().find((athlete) => athlete.id === id);
    if (own) {
      return `${own.firstNames} ${own.lastNames}`;
    }
    const athlete = this.result()?.content.find((record) => record.athlete.id === id)?.athlete;
    return athlete ? `${athlete.firstNames} ${athlete.lastNames}` : null;
  });

  private page = 0;
  private request: Subscription | null = null;
  private summaryRequest: Subscription | null = null;

  constructor() {
    if (this.isGuardian()) {
      this.athleteService.list({ size: 100 }).subscribe({
        next: (athletes) => this.athletes.set(athletes.content),
        error: () => this.athletes.set([]),
      });
    } else {
      this.groupService.list().subscribe({
        next: (groups) => this.groups.set(groups),
        error: () => this.groups.set([]),
      });
    }
    // La dirección puede traer `?athleteId=`; cada cambio de la dirección vuelve a pedir el historial.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('athleteId');
      this.filters.controls.athleteId.setValue(id && /^\d+$/.test(id) ? id : '');
      this.apply();
    });
  }

  protected get filtering(): boolean {
    const value = this.filters.getRawValue();
    return Object.values(value).some((field) => field !== '');
  }

  /** Aplica los filtros desde la primera página. No pide nada si el rango de fechas está al revés. */
  protected apply(): void {
    const { from, to } = this.filters.getRawValue();
    this.rangeError.set(Boolean(from && to && from > to));
    if (this.rangeError()) {
      return;
    }
    this.page = 0;
    this.load();
    this.loadSummary();
  }

  protected clearFilters(): void {
    this.filters.reset();
    this.apply();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  protected load(): void {
    const value = this.filters.getRawValue();
    this.athleteId.set(Number(value.athleteId) || null);
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    this.request = this.service
      .listRecords({
        page: this.page,
        size: PAGE_SIZE,
        athleteId: this.athleteId() ?? undefined,
        groupId: value.groupId ? Number(value.groupId) : undefined,
        from: value.from || undefined,
        to: value.to || undefined,
        status: value.status === 'PRESENT' || value.status === 'ABSENT' ? value.status : null,
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loadError.set(reportErrorMessage(toApiError(error)));
          this.loading.set(false);
        },
      });
  }

  /** R3: el resumen del deportista elegido, en el mismo rango de fechas del filtro. */
  protected loadSummary(): void {
    this.summaryRequest?.unsubscribe();
    const id = this.athleteId();
    this.summary.set(null);
    this.summaryError.set(null);
    if (id === null) {
      this.summaryLoading.set(false);
      return;
    }
    const { from, to } = this.filters.getRawValue();
    this.summaryLoading.set(true);
    this.summaryRequest = this.reports
      .athleteAttendance(id, { dateFrom: from || undefined, dateTo: to || undefined })
      .subscribe({
        next: (summary) => {
          this.summary.set(summary);
          this.summaryLoading.set(false);
        },
        error: (error: unknown) => {
          this.summaryError.set(reportErrorMessage(toApiError(error)));
          this.summaryLoading.set(false);
        },
      });
  }
}
