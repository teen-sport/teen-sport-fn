import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { toApiError } from '../../../Core/http/api-error';
import {
  ENROLLMENT_STATUS_LABELS,
  EnrollmentStatus,
  PAYMENT_STATUS_LABELS,
} from '../../../Core/Models/enrollment-status';
import {
  currentPeriod,
  formatHours,
  formatPercent,
  formatPeriod,
  periodRange,
} from '../../../shared/format';
import { reportErrorMessage } from '../report-errors';
import { EnrollmentReport as Report } from '../report.models';
import { ReportService } from '../report.service';

const STATUS_ORDER: EnrollmentStatus[] = ['PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'CANCELLED'];

/**
 * Indicadores de las inscripciones de un mes (R1), solo para el administrador: total de solicitudes,
 * cuántas hay en cada estado, porcentaje de inscripciones activas y de abandono, horas promedio que
 * tarda una confirmación, detalle por disciplina y estado de los pagos. El servidor hace las cuentas.
 */
@Component({
  selector: 'app-enrollment-report',
  imports: [ReactiveFormsModule],
  templateUrl: './enrollment-report.html',
})
export class EnrollmentReport {
  private readonly service = inject(ReportService);

  /** Los últimos 12 meses, terminando en el actual. */
  protected readonly periods = periodRange(11, 0);
  protected readonly period = new FormControl(currentPeriod(), { nonNullable: true });
  protected readonly formatPercent = formatPercent;
  protected readonly formatHours = formatHours;
  protected readonly formatPeriod = formatPeriod;
  protected readonly paymentLabels = PAYMENT_STATUS_LABELS;

  protected readonly report = signal<Report | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  /** Las cuatro filas de estados, con 0 en las que el servidor no trae. */
  protected readonly statuses = computed(() =>
    STATUS_ORDER.map((status) => ({
      status,
      label: ENROLLMENT_STATUS_LABELS[status],
      count: this.report()?.byStatus[status] ?? 0,
    })),
  );

  private request: Subscription | null = null;

  constructor() {
    this.period.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.load());
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    this.request = this.service.enrollments(this.period.value).subscribe({
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
