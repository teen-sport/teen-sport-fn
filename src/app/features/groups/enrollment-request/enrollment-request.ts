import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { formatMoney, formatPeriod } from '../../../shared/format';
import { Athlete } from '../../athletes/athlete.models';
import { GroupAvailability } from '../../catalog/catalog.models';
import { enrollmentErrorMessage } from '../../enrollments/enrollment-errors';
import { EnrollmentDetail } from '../../enrollments/enrollment.models';
import { EnrollmentService } from '../../enrollments/enrollment.service';

/**
 * Panel «Solicitar inscripción» de un grupo: se elige el deportista y se envía la solicitud (E6).
 * No navega por sí mismo: avisa con `requested` y la pantalla que lo contiene decide a dónde ir.
 */
@Component({
  selector: 'app-enrollment-request',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './enrollment-request.html',
  styleUrl: './enrollment-request.css',
})
export class EnrollmentRequest {
  private readonly service = inject(EnrollmentService);

  readonly group = input.required<GroupAvailability>();
  /** Mes de inicio «YYYY-MM» que eligió el acudiente en el filtro. */
  readonly period = input.required<string>();
  readonly athletes = input.required<Athlete[]>();

  /** La solicitud se creó; trae la inscripción nueva. */
  readonly requested = output<EnrollmentDetail>();
  /** El acudiente cerró el panel sin enviar. */
  readonly closed = output<void>();
  /** El servidor dijo que ya no hay cupo: la lista de grupos está desactualizada. */
  readonly spotsChanged = output<void>();

  protected readonly formatMoney = formatMoney;
  protected readonly formatPeriod = formatPeriod;
  protected readonly athleteId = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected selectId(): string {
    return `athlete-${this.group().groupId}`;
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    this.errorMessage.set(null);
    if (this.athleteId.invalid) {
      this.athleteId.markAsTouched();
      return;
    }

    this.submitting.set(true);
    this.service
      .create({
        athleteId: Number(this.athleteId.value),
        groupId: this.group().groupId,
        period: this.period(),
      })
      .subscribe({
        next: (enrollment) => this.requested.emit(enrollment),
        error: (error: unknown) => {
          const apiError = toApiError(error);
          this.errorMessage.set(enrollmentErrorMessage(apiError));
          if (apiError.code === 'NO_AVAILABLE_SPOTS') {
            this.spotsChanged.emit();
          }
          this.submitting.set(false);
        },
      });
  }
}
