import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { applyServerError, firstError } from '../../../shared/form-errors';
import { todayInAcademy } from '../../../shared/format';
import { ID_TYPES } from '../../../shared/id-types';
import { notBlank, notFutureDate } from '../../../shared/validators';
import { GENDERS, AthleteRequest } from '../athlete.models';
import { AthleteService } from '../athlete.service';

/**
 * Registrar (E1) o editar (E4) un deportista. Es el mismo formulario para las dos tareas: si la ruta
 * trae un `:id` se edita, y si no, se crea.
 */
@Component({
  selector: 'app-athlete-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './athlete-form.html',
  host: { class: 'page-narrow' },
})
export class AthleteForm {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(AthleteService);
  private readonly router = inject(Router);
  private readonly rawId = inject(ActivatedRoute).snapshot.paramMap.get('id');

  /** Id del deportista que se edita; `null` cuando se está registrando uno nuevo. */
  protected readonly athleteId = this.rawId === null ? null : Number(this.rawId);
  protected readonly editing = this.athleteId !== null;

  protected readonly firstError = firstError;
  protected readonly idTypes = ID_TYPES;
  protected readonly genders = GENDERS;
  /** Tope del campo de fecha: nadie nace mañana. */
  protected readonly today = todayInAcademy();

  protected readonly loading = signal(this.editing);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly title = this.editing ? 'Editar deportista' : 'Registrar deportista';

  protected readonly form = this.fb.group({
    firstNames: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    lastNames: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    idType: ['TI', [Validators.required, Validators.maxLength(10)]],
    idNumber: ['', [Validators.required, notBlank, Validators.maxLength(50)]],
    birthDate: ['', [Validators.required, notFutureDate]],
    gender: ['', [Validators.maxLength(20)]],
  });

  constructor() {
    if (this.editing) {
      this.load();
    }
  }

  protected load(): void {
    if (this.athleteId === null) {
      return;
    }
    if (!Number.isInteger(this.athleteId)) {
      this.loadError.set('El deportista no existe.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    this.service.get(this.athleteId).subscribe({
      next: (athlete) => {
        this.form.patchValue({
          firstNames: athlete.firstNames,
          lastNames: athlete.lastNames,
          idType: athlete.idType,
          idNumber: athlete.idNumber,
          birthDate: athlete.birthDate,
          gender: athlete.gender ?? '',
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
      this.athleteId === null
        ? this.service.create(request)
        : this.service.update(this.athleteId, request);
    call.subscribe({
      next: () =>
        void this.router.navigate(['/guardian/athletes'], {
          queryParams: { saved: this.editing ? 'updated' : 'created' },
        }),
      error: (error: unknown) => {
        // La edad y el documento repetido se muestran junto al campo que los causó.
        this.formError.set(
          applyServerError(this.form, toApiError(error), {
            AGE_OUT_OF_RANGE: 'birthDate',
            DUPLICATE_ATHLETE: 'idNumber',
          }),
        );
        this.submitting.set(false);
      },
    });
  }

  private buildRequest(): AthleteRequest {
    const value = this.form.getRawValue();
    const request: AthleteRequest = {
      firstNames: value.firstNames.trim(),
      lastNames: value.lastNames.trim(),
      idType: value.idType,
      idNumber: value.idNumber.trim(),
      birthDate: value.birthDate,
    };
    if (value.gender) {
      request.gender = value.gender;
    }
    return request;
  }
}
