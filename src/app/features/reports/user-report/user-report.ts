import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { toApiError } from '../../../Core/http/api-error';
import { ROLE_LABELS } from '../../../Core/Models/role';
import { currentPeriod, formatPercent, formatPeriod, periodRange } from '../../../shared/format';
import { reportErrorMessage } from '../report-errors';
import { UserReport as Report } from '../report.models';
import { ReportService } from '../report.service';

/**
 * Indicadores de las cuentas de usuario (R5), solo para el administrador: cuentas creadas en el mes,
 * cuentas inactivas hoy, acudientes con deportista y el porcentaje que representan, y el detalle por
 * rol. Lo creado se cuenta en el mes elegido; lo activo e inactivo es el estado de hoy, porque la
 * cuenta no guarda historial de estados. El servidor hace las cuentas.
 */
@Component({
  selector: 'app-user-report',
  imports: [ReactiveFormsModule],
  templateUrl: './user-report.html',
})
export class UserReport {
  private readonly service = inject(ReportService);

  /** Los últimos 12 meses, terminando en el actual. */
  protected readonly periods = periodRange(11, 0);
  protected readonly period = new FormControl(currentPeriod(), { nonNullable: true });
  protected readonly formatPercent = formatPercent;
  protected readonly formatPeriod = formatPeriod;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly report = signal<Report | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  private request: Subscription | null = null;

  constructor() {
    this.period.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.load());
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    this.request = this.service.users(this.period.value).subscribe({
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
