import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { toApiError } from '../../../Core/http/api-error';
import { formatPercent } from '../../../shared/format';
import { Group } from '../../groups/group.models';
import { reportErrorMessage } from '../report-errors';
import { ATTENDANCE_COVERAGE_TARGET, AttendanceReport as Report } from '../report.models';
import { ReportService } from '../report.service';

/**
 * Indicadores de asistencia (R2): cuántas sesiones ya pasadas tienen la asistencia registrada
 * («cobertura», con meta de RNF-10 de 90 % o más), qué porcentaje de las marcas fueron «presente», y
 * el detalle por grupo. Sin fechas el servidor usa desde el día 1 del mes hasta hoy. Al entrenador el
 * servidor le devuelve solo sus grupos.
 */
@Component({
  selector: 'app-attendance-report',
  imports: [ReactiveFormsModule],
  templateUrl: './attendance-report.html',
})
export class AttendanceReport {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(ReportService);

  /** Grupos para el filtro; los carga la pantalla de reportes. */
  readonly groups = input<Group[]>([]);

  protected readonly formatPercent = formatPercent;
  protected readonly target = ATTENDANCE_COVERAGE_TARGET;
  protected readonly filters = this.fb.group({ groupId: '', dateFrom: '', dateTo: '' });
  protected readonly report = signal<Report | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly rangeError = signal(false);

  /** La cobertura se compara con la meta con texto, no solo con color. */
  protected readonly meetsTarget = computed(
    () => (this.report()?.recordingCoverage ?? 0) >= ATTENDANCE_COVERAGE_TARGET,
  );

  private request: Subscription | null = null;

  constructor() {
    this.load();
  }

  protected apply(): void {
    const { dateFrom, dateTo } = this.filters.getRawValue();
    this.rangeError.set(Boolean(dateFrom && dateTo && dateFrom > dateTo));
    if (!this.rangeError()) {
      this.load();
    }
  }

  protected clear(): void {
    this.filters.reset();
    this.apply();
  }

  protected get filtering(): boolean {
    return Object.values(this.filters.getRawValue()).some((value) => value !== '');
  }

  protected load(): void {
    const value = this.filters.getRawValue();
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    this.request = this.service
      .attendance({
        dateFrom: value.dateFrom || undefined,
        dateTo: value.dateTo || undefined,
        groupId: value.groupId ? Number(value.groupId) : undefined,
      })
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loadError.set(reportErrorMessage(toApiError(error)));
          this.loading.set(false);
        },
      });
  }
}
