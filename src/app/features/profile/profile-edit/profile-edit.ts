import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { applyServerError, firstError } from '../../../shared/form-errors';
import { integer, notBlank } from '../../../shared/validators';
import { MyProfile, UpdateProfileRequest } from '../profile.models';
import { ProfileService } from '../profile.service';

/** U4: edita los datos propios. El API reemplaza todos los campos, por eso se envían completos. */
@Component({
  selector: 'app-profile-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile-edit.html',
  host: { class: 'page-narrow' },
})
export class ProfileEdit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly firstError = firstError;
  protected readonly profile = signal<MyProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly isGuardian = computed(() => !!this.profile()?.guardian);
  protected readonly isCoach = computed(() => !!this.profile()?.coach);

  protected readonly form = this.fb.group({
    firstNames: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    lastNames: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
    phone: ['', [Validators.required, notBlank, Validators.maxLength(20)]],
    homeAddress: ['', [Validators.maxLength(255)]],
    specialty: ['', [Validators.maxLength(100)]],
    yearsOfExperience: this.fb.control<number | null>(null, [Validators.min(0), integer]),
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.getMe().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.form.patchValue({
          firstNames: profile.firstNames,
          lastNames: profile.lastNames,
          phone: profile.phone,
          homeAddress: profile.guardian?.homeAddress ?? '',
          specialty: profile.coach?.specialty ?? '',
          yearsOfExperience: profile.coach?.yearsOfExperience ?? null,
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
    this.service.update(this.buildRequest()).subscribe({
      next: () => void this.router.navigate(['/profile'], { queryParams: { updated: 1 } }),
      error: (error: unknown) => {
        this.formError.set(applyServerError(this.form, toApiError(error)));
        this.submitting.set(false);
      },
    });
  }

  private buildRequest(): UpdateProfileRequest {
    const value = this.form.getRawValue();
    const request: UpdateProfileRequest = {
      firstNames: value.firstNames.trim(),
      lastNames: value.lastNames.trim(),
      phone: value.phone.trim(),
    };
    if (this.isGuardian()) {
      request.homeAddress = value.homeAddress.trim();
    }
    if (this.isCoach()) {
      request.specialty = value.specialty.trim();
      if (value.yearsOfExperience !== null) {
        request.yearsOfExperience = value.yearsOfExperience;
      }
    }
    return request;
  }
}
