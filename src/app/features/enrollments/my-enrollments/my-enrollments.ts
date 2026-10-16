import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import {
  ENROLLMENT_STATUS_LABELS,
  EnrollmentStatus,
  IN_FORCE_STATUSES,
} from '../../../Core/Models/enrollment-status';
import { Page } from '../../../Core/Models/page';
import { formatPeriod } from '../../../shared/format';
import { Pagination } from '../../../shared/pagination/pagination';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { EnrollmentSummary } from '../enrollment.models';
import { EnrollmentService } from '../enrollment.service';

const PAGE_SIZE = 10;

/** «Mis inscripciones»: lista paginada con filtro por estado; cada fila lleva al detalle. */
@Component({
  selector: 'app-my-enrollments',
  imports: [ReactiveFormsModule, RouterLink, Pagination, StatusBadge],
  templateUrl: './my-enrollments.html',
  host: { class: 'page-wide' },
})
export class MyEnrollments {
  private readonly service = inject(EnrollmentService);

  protected readonly formatPeriod = formatPeriod;
  protected readonly statusOptions = (
    Object.entries(ENROLLMENT_STATUS_LABELS) as [EnrollmentStatus, string][]
  ).map(([value, label]) => ({ value, label }));

  protected readonly status = new FormControl<EnrollmentStatus | ''>('', { nonNullable: true });
  protected readonly result = signal<Page<EnrollmentSummary> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  private page = 0;

  constructor() {
    this.load();
    this.status.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.page = 0;
      this.load();
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service
      .list({ page: this.page, size: PAGE_SIZE, status: this.status.value || null })
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

  /** El pago solo importa mientras la inscripción está vigente. */
  protected isInForce(enrollment: EnrollmentSummary): boolean {
    return IN_FORCE_STATUSES.includes(enrollment.status);
  }
}
