
import { switchMap } from 'rxjs';
import { homeRouteFor } from '../../../Core/Auth/role-home';
import { toApiError } from '../../../Core/http/api-error';
import { applyServerError, firstError } from '../../../shared/form-errors';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RegisterGuardianRequest } from '../../../Core/Auth/auth.models';
import { AuthService } from '../../../Core/Auth/auth.service';
import { computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  checkPassword,
  maxUtf8Bytes,
  notBlank,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  sameValue,
  strongPassword,
} from '../../../shared/validators';


const CODE_TO_FIELD = {
  EMAIL_ALREADY_REGISTERED: 'email',
  ID_NUMBER_ALREADY_REGISTERED: 'idNumber',
  WEAK_PASSWORD: 'password',
  DATA_POLICY_NOT_ACCEPTED: 'acceptedDataPolicy',
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly firstError = firstError;
  protected readonly idTypes = [
    { value: 'CC', label: 'Cédula de ciudadanía' },
    { value: 'CE', label: 'Cédula de extranjería' },
  ];

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group(
    {
      firstNames: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
      lastNames: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
      idType: ['CC', [Validators.required]],
      idNumber: ['', [Validators.required, notBlank, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, notBlank, Validators.maxLength(20)]],
      homeAddress: ['', [Validators.maxLength(255)]],
      password: ['', [Validators.required, strongPassword, maxUtf8Bytes(PASSWORD_MAX_BYTES)]],
      confirmPassword: ['', [Validators.required]],
      acceptedDataPolicy: [false, [Validators.requiredTrue]],
    },
    { validators: [sameValue('password', 'confirmPassword')] },
  );
  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

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

  protected confirmError(): string | null {
    const confirm = this.form.controls.confirmPassword;
    if (!confirm.touched && !confirm.dirty) {
      return null;
    }
    if (confirm.hasError('required')) {
      return 'Repite la contraseña.';
    }
    return this.form.hasError('mismatch') ? 'Las contraseñas no coinciden.' : null;
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
    let registered = false;

    this.auth
      .register(request)
      .pipe(
        switchMap(() => {
          registered = true;
          return this.auth.login({ email: request.email, password: request.password });
        }),
      )
      .subscribe({
        next: (response) => void this.router.navigateByUrl(homeRouteFor(response.user.role)),
        error: (error: unknown) => {
          if (registered) {
            void this.router.navigate(['/login'], { queryParams: { registered: 1 } });
            return;
          }
          this.formError.set(applyServerError(this.form, toApiError(error), CODE_TO_FIELD));
          this.submitting.set(false);
        },
      });
  }


  private buildRequest(): RegisterGuardianRequest {
    const value = this.form.getRawValue();
    const homeAddress = value.homeAddress.trim();
    return {
      firstNames: value.firstNames.trim(),
      lastNames: value.lastNames.trim(),
      idType: value.idType,
      idNumber: value.idNumber.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      ...(homeAddress ? { homeAddress } : {}),
      password: value.password,
      acceptedDataPolicy: value.acceptedDataPolicy,
    };
  }


}
