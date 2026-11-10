import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SessionService } from '../../../Core/Auth/session.service';
import { toApiError } from '../../../Core/http/api-error';
import { formatDate } from '../../../shared/format';
import { attendanceHistoryRoute } from '../../attendance/sessions-route';
import { Group } from '../../groups/group.models';
import { reportErrorMessage } from '../report-errors';
import { RecurrentAbsence } from '../report.models';
import { ReportService } from '../report.service';

/** Cuántas inasistencias seguidas se ofrecen como mínimo. El servidor usa 3 si no se indica. */
const MIN_OPTIONS = [2, 3, 4, 5, 6];

/**
 * Deportistas con inasistencias seguidas (R4): los que en su último tramo de sesiones registradas
 * suman al menos N ausencias sin haber asistido en medio. Sirve para que el entrenador y el
 * administrador detecten a tiempo a quien está dejando de asistir. Cada nombre lleva a su historial.
 */
@Component({
  selector: 'app-recurrent-absences',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recurrent-absences.html',
})
export class RecurrentAbsences {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(ReportService);
  private readonly auth = inject(SessionService);

  /** Grupos para el filtro; los carga la pantalla de reportes. */
  readonly groups = input<Group[]>([]);

  protected readonly minOptions = MIN_OPTIONS;
  protected readonly formatDate = formatDate;
  protected readonly historyRoute = computed(() => attendanceHistoryRoute(this.auth.role()));
  protected readonly filters = this.fb.group({ minConsecutive: '3', groupId: '', dateFrom: '' });
  protected readonly absences = signal<RecurrentAbsence[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  /** El mínimo con el que se pidió la lista que se está mostrando, para el texto de «no hay». */
  protected readonly shownMinimum = signal(3);

  private request: Subscription | null = null;

  constructor() {
    this.load();
  }

  protected load(): void {
    const value = this.filters.getRawValue();
    const minimum = Number(value.minConsecutive) || 3;
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    this.request = this.service
      .recurrentAbsences({
        minConsecutive: minimum,
        groupId: value.groupId ? Number(value.groupId) : undefined,
        dateFrom: value.dateFrom || undefined,
      })
      .subscribe({
        next: (absences) => {
          this.shownMinimum.set(minimum);
          this.absences.set(absences);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loadError.set(reportErrorMessage(toApiError(error)));
          this.loading.set(false);
        },
      });
  }
}
