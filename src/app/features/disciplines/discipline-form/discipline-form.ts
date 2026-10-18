import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { applyServerError, firstError } from '../../../shared/form-errors';
import { notBlank } from '../../../shared/validators';
import { friendlyError } from '../../admin/admin-errors';
import { DisciplineRequest } from '../discipline.models';
import { DisciplineService } from '../discipline.service';

/** Mayor mensualidad que acepta el API (DECIMAL(10,2)). */
const MAX_FEE = 99_999_999.99;

/**
 * Crear (H3) o editar (H4) una disciplina. Es el mismo formulario para las dos tareas: si la ruta
 * trae un `:id` se edita, y si no, se crea. Un cambio de mensualidad rige para los pagos que se
 * registren desde ese momento.
 */
@Component({
  selector: 'app-discipline-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './discipline-form.html',
  host: { class: 'page-narrow' },
})
export class DisciplineForm {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(DisciplineService);
  private readonly router = inject(Router);
  private readonly rawId = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly disciplineId = this.rawId === null ? null : Number(this.rawId);
  protected readonly editing = this.disciplineId !== null;
  protected readonly title = this.editing ? 'Editar disciplina' : 'Nueva disciplina';
  protected readonly firstError = firstError;

  protected readonly loading = signal(this.editing);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    monthlyFee: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(MAX_FEE),
    ]),
  });

  constructor() {
    if (this.editing) {
      this.load();
    }
  }

  protected load(): void {
    if (this.disciplineId === null) {
      return;
    }
    if (!Number.isInteger(this.disciplineId)) {
      this.loadError.set('La disciplina no existe.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    this.service.get(this.disciplineId).subscribe({
      next: (discipline) => {
        this.form.patchValue({
          name: discipline.name,
          description: discipline.description ?? '',
          monthlyFee: discipline.monthlyFee,
        });
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const request = this.buildRequest();
    const call =
      this.disciplineId === null
        ? this.service.create(request)
        : this.service.update(this.disciplineId, request);
    call.subscribe({
      next: () =>
        void this.router.navigate(['/admin/disciplines'], {
          queryParams: { saved: this.editing ? 'updated' : 'created' },
        }),
      error: (error: unknown) => {
        // El nombre repetido se muestra junto al campo; el resto, arriba del formulario.
        this.formError.set(
          applyServerError(this.form, friendlyError(toApiError(error)), {
            DUPLICATE_DISCIPLINE: 'name',
          }),
        );
        this.submitting.set(false);
      },
    });
  }

  private buildRequest(): DisciplineRequest {
    const value = this.form.getRawValue();
    const request: DisciplineRequest = {
      name: value.name.trim(),
      monthlyFee: value.monthlyFee as number,
    };
    const description = value.description.trim();
    if (description) {
      request.description = description;
    }
    return request;
  }
}
