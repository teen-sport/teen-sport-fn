import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { applyServerError, firstError } from '../../../shared/form-errors';
import { ID_TYPES, idTypeLabel } from '../../../shared/id-types';
import {
  checkPassword,
  integer,
  maxUtf8Bytes,
  notBlank,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  strongPassword,
} from '../../../shared/validators';
import { friendlyError } from '../../admin/admin-errors';
import { CoachUser, CreateCoachRequest, UpdateCoachRequest } from '../coach.models';
import { CoachService } from '../coach.service';

/**
 * Crear (U8) o editar (U9) un entrenador. Es el mismo formulario para las dos tareas: si la ruta trae
 * un `:id` (el del usuario) se edita, y si no, se crea. Al crearlo el administrador le pone una
 * contraseña inicial; al editarlo el documento solo se muestra, porque no se puede cambiar.
 */
@Component({
  selector: 'app-coach-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './coach-form.html',
  host: { class: 'page-narrow' },
})
export class CoachForm {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(CoachService);
  private readonly router = inject(Router);
  private readonly rawId = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly userId = this.rawId === null ? null : Number(this.rawId);
  protected readonly editing = this.userId !== null;
  protected readonly title = this.editing ? 'Editar entrenador' : 'Nuevo entrenador';
  protected readonly firstError = firstError;
  protected readonly idTypes = ID_TYPES;
  protected readonly idTypeLabel = idTypeLabel;

  protected readonly coach = signal<CoachUser | null>(null);
  protected readonly loading = signal(this.editing);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    firstNames: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    lastNames: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    idType: ['CC', [Validators.required]],
    idNumber: ['', [Validators.required, notBlank, Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, notBlank, Validators.maxLength(20)]],
    password: ['', [Validators.required, strongPassword, maxUtf8Bytes(PASSWORD_MAX_BYTES)]],
    specialty: ['', [Validators.maxLength(100)]],
    yearsOfExperience: this.fb.control<number | null>(null, [Validators.min(0), integer]),
  });

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  /** Requisitos de la contraseña inicial, que se van marcando mientras el administrador escribe. */
  protected readonly rules = computed(() => {
    const checks = checkPassword(this.passwordValue());
    return [
      {
        met: checks.length,
        text: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_BYTES} caracteres`,
      },
      { met: checks.uppercase, text: 'Una mayúscula' },
      { met: checks.lowercase, text: 'Una minúscula' },
      { met: checks.digit, text: 'Un número' },
      { met: checks.symbol, text: 'Un símbolo, como ! o #' },
    ];
  });

  constructor() {
    if (this.editing) {
      // Al editar no se pide ni se envía contraseña ni documento.
      this.form.controls.password.disable();
      this.form.controls.idType.disable();
      this.form.controls.idNumber.disable();
      this.load();
    }
  }

  protected load(): void {
    if (this.userId === null) {
      return;
    }
    if (!Number.isInteger(this.userId)) {
      this.loadError.set('El entrenador no existe.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    this.service.get(this.userId).subscribe({
      next: (coach) => {
        this.coach.set(coach);
        this.form.patchValue({
          firstNames: coach.firstNames,
          lastNames: coach.lastNames,
          idType: coach.idType,
          idNumber: coach.idNumber,
          email: coach.email,
          phone: coach.phone,
          specialty: coach.coach?.specialty ?? '',
          yearsOfExperience: coach.coach?.yearsOfExperience ?? null,
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
    const call =
      this.userId === null
        ? this.service.create(this.buildCreateRequest())
        : this.service.update(this.userId, this.buildUpdateRequest());
    call.subscribe({
      next: () =>
        void this.router.navigate(['/admin/coaches'], {
          queryParams: { saved: this.editing ? 'updated' : 'created' },
        }),
      error: (error: unknown) => {
        this.formError.set(
          applyServerError(this.form, friendlyError(toApiError(error)), {
            EMAIL_ALREADY_REGISTERED: 'email',
            ID_NUMBER_ALREADY_REGISTERED: 'idNumber',
            WEAK_PASSWORD: 'password',
          }),
        );
        this.submitting.set(false);
      },
    });
  }

  private buildCreateRequest(): CreateCoachRequest {
    const value = this.form.getRawValue();
    const request: CreateCoachRequest = {
      role: 'COACH',
      firstNames: value.firstNames.trim(),
      lastNames: value.lastNames.trim(),
      idType: value.idType,
      idNumber: value.idNumber.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      password: value.password,
    };
    this.addCoachData(request, value.specialty, value.yearsOfExperience);
    return request;
  }

  private buildUpdateRequest(): UpdateCoachRequest {
    const value = this.form.getRawValue();
    const request: UpdateCoachRequest = {
      firstNames: value.firstNames.trim(),
      lastNames: value.lastNames.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
    };
    this.addCoachData(request, value.specialty, value.yearsOfExperience);
    return request;
  }

  private addCoachData(
    request: { specialty?: string; yearsOfExperience?: number },
    specialty: string,
    years: number | null,
  ): void {
    const text = specialty.trim();
    if (text) {
      request.specialty = text;
    }
    if (years !== null) {
      request.yearsOfExperience = years;
    }
  }
}
