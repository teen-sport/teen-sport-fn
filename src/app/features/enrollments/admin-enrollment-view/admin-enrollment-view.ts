import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { toApiError } from '../../../Core/http/api-error';
import { IN_FORCE_STATUSES } from '../../../Core/Models/enrollment-status';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import {
  currentPeriod,
  formatInstantDate,
  formatPeriod,
  formatSchedule,
} from '../../../shared/format';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { CatalogService } from '../../catalog/catalog.service';
import { GroupAvailability } from '../../catalog/catalog.models';
import { DisciplineService } from '../../disciplines/discipline.service';
import { adminEnrollmentErrorMessage } from '../enrollment-errors';
import { EnrollmentDetail } from '../enrollment.models';
import { EnrollmentService } from '../enrollment.service';
import { EnrollmentGroupChange } from '../enrollment-group-change/enrollment-group-change';
import { EnrollmentPayments } from '../enrollment-payments/enrollment-payments';
import { EnrollmentReview } from '../enrollment-review/enrollment-review';

/** Explicación, en palabras del administrador, de lo que significa cada estado. */
const STATUS_HELP: Record<EnrollmentDetail['status'], string> = {
  PENDING_REVIEW: 'El acudiente espera tu respuesta. El cupo del grupo ya está reservado.',
  ACTIVE: 'La inscripción está confirmada: el deportista hace parte del grupo.',
  REJECTED: 'La solicitud se rechazó. Es un estado final.',
  CANCELLED: 'La inscripción se canceló y ya no ocupa cupo. Es un estado final.',
};

/**
 * Detalle de una inscripción para el administrador. Según el estado ofrece lo que corresponde:
 * en revisión → confirmar o rechazar; activa → registrar pagos, cambiar de grupo o cancelar;
 * rechazada o cancelada → solo consulta. Cada panel hace su propia petición y avisa con `changed`;
 * aquí se vuelve a pedir la inscripción al servidor para mostrar siempre su estado real.
 */
@Component({
  selector: 'app-admin-enrollment-view',
  imports: [
    RouterLink,
    StatusBadge,
    ConfirmDialog,
    EnrollmentReview,
    EnrollmentPayments,
    EnrollmentGroupChange,
  ],
  templateUrl: './admin-enrollment-view.html',
  host: { class: 'page-narrow' },
})
export class AdminEnrollmentView {
  private readonly service = inject(EnrollmentService);
  private readonly catalog = inject(CatalogService);
  private readonly disciplines = inject(DisciplineService);
  private readonly enrollmentId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly formatPeriod = formatPeriod;
  protected readonly formatSchedule = formatSchedule;
  protected readonly formatInstantDate = formatInstantDate;
  protected readonly statusHelp = STATUS_HELP;

  protected readonly enrollment = signal<EnrollmentDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly confirmingCancel = signal(false);

  /** Mensualidad y grupos con cupo: ayudas para los paneles; si no cargan, la pantalla sigue. */
  protected readonly monthlyFee = signal<number | null>(null);
  protected readonly groups = signal<GroupAvailability[]>([]);
  protected readonly helpersFailed = signal(false);

  protected readonly inForce = computed(() => {
    const current = this.enrollment();
    return !!current && IN_FORCE_STATUSES.includes(current.status);
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    if (!Number.isInteger(this.enrollmentId) || this.enrollmentId <= 0) {
      this.loadError.set('La inscripción no existe.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    this.service.get(this.enrollmentId).subscribe({
      next: (enrollment) => {
        this.show(enrollment);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(adminEnrollmentErrorMessage(toApiError(error)));
        this.loading.set(false);
      },
    });
  }

  /** Un panel hizo un cambio: se muestra su aviso y se vuelve a pedir la inscripción. */
  protected onChanged(notice: string): void {
    this.actionError.set(null);
    this.service.get(this.enrollmentId).subscribe({
      next: (enrollment) => {
        this.show(enrollment);
        this.notice.set(notice);
      },
      error: (error: unknown) => {
        this.notice.set(notice);
        this.actionError.set(adminEnrollmentErrorMessage(toApiError(error)));
      },
    });
  }

  protected askToCancel(): void {
    this.actionError.set(null);
    this.confirmingCancel.set(true);
  }

  protected closeCancel(): void {
    this.confirmingCancel.set(false);
  }

  protected cancel(reason: string | undefined): void {
    this.busy.set(true);
    this.service.cancel(this.enrollmentId, reason).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmingCancel.set(false);
        this.onChanged('La inscripción se canceló y el cupo quedó libre.');
      },
      error: (error: unknown) => {
        this.actionError.set(adminEnrollmentErrorMessage(toApiError(error)));
        this.confirmingCancel.set(false);
        this.busy.set(false);
      },
    });
  }

  private show(enrollment: EnrollmentDetail): void {
    this.enrollment.set(enrollment);
    if (IN_FORCE_STATUSES.includes(enrollment.status)) {
      this.loadHelpers(enrollment);
    }
  }

  /**
   * La mensualidad de la disciplina y los grupos con cupo. El API solo ofrece cupos desde el mes
   * actual, así que una inscripción de un mes ya pasado consulta el actual.
   */
  private loadHelpers(enrollment: EnrollmentDetail): void {
    const now = currentPeriod();
    const period = enrollment.period < now ? now : enrollment.period;
    forkJoin({
      discipline: this.disciplines.get(enrollment.discipline.id).pipe(catchError(() => of(null))),
      groups: this.catalog
        .availability(period, enrollment.discipline.id)
        .pipe(catchError(() => of(null))),
    }).subscribe(({ discipline, groups }) => {
      this.monthlyFee.set(discipline?.monthlyFee ?? null);
      this.groups.set(groups ?? []);
      this.helpersFailed.set(discipline === null || groups === null);
    });
  }
}
