import { computed, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../Core/Auth/auth.service';
import { toApiError } from '../../../Core/http/api-error';
import { applyServerError, firstError } from '../../../shared/form-errors';
import {
  checkPassword,
  maxUtf8Bytes,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  sameValue,
  strongPassword,
} from '../../../shared/validators';

/** El back avisa de una contraseña débil con este código; se muestra junto al campo. */
const CODE_TO_FIELD = { WEAK_PASSWORD: 'newPassword' };

/**
 * Una sola pantalla con dos pasos:
 * 1. Sin token en la URL: pide el correo (U13) y el back envía el enlace.
 * 2. Con `?token=` (el enlace del correo): pide la contraseña nueva (U14).
 */
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // El token se guarda en memoria y se borra de la barra de direcciones
  // para que no quede en el historial ni se copie sin querer.
  private token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  protected readonly firstError = firstError;
  protected readonly step = signal<'request' | 'reset'>(this.token ? 'reset' : 'request');
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly linkSent = signal(false);
  /** El enlace venció, ya se usó o no es válido: hay que pedir uno nuevo. */
  protected readonly tokenRejected = signal(false);

  protected readonly requestForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly resetForm = this.fb.group(
    {
      newPassword: ['', [Validators.required, strongPassword, maxUtf8Bytes(PASSWORD_MAX_BYTES)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [sameValue('newPassword', 'confirmPassword')] },
  );

  private readonly passwordValue = toSignal(this.resetForm.controls.newPassword.valueChanges, {
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

  constructor() {
    if (this.token) {
      void this.router.navigate(['/forgot-password'], { replaceUrl: true });
    }
  }

  protected confirmError(): string | null {
    const confirm = this.resetForm.controls.confirmPassword;
    if (!confirm.touched && !confirm.dirty) {
      return null;
    }
    if (confirm.hasError('required')) {
      return 'Repite la contraseña.';
    }
    return this.resetForm.hasError('mismatch') ? 'Las contraseñas no coinciden.' : null;
  }

  protected requestLink(): void {
    if (this.submitting()) {
      return;
    }
    this.formError.set(null);
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const email = this.requestForm.getRawValue().email.trim();
    this.auth.requestPasswordReset({ email }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.linkSent.set(true);
      },
      error: (error: unknown) => {
        this.formError.set(applyServerError(this.requestForm, toApiError(error)));
        this.submitting.set(false);
      },
    });
  }

  protected changePassword(): void {
    if (this.submitting() || !this.token) {
      return;
    }
    this.formError.set(null);
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const newPassword = this.resetForm.getRawValue().newPassword;
    this.auth.confirmPasswordReset({ token: this.token, newPassword }).subscribe({
      next: () => {
        this.token = null;
        void this.router.navigate(['/login'], { queryParams: { passwordReset: 1 } });
      },
      error: (error: unknown) => {
        const apiError = toApiError(error);
        this.submitting.set(false);
        if (apiError.code === 'INVALID_RESET_TOKEN') {
          this.tokenRejected.set(true);
          return;
        }
        this.formError.set(applyServerError(this.resetForm, apiError, CODE_TO_FIELD));
      },
    });
  }

  /** Vuelve al primer paso desde el aviso de enlace vencido. */
  protected askForNewLink(): void {
    this.token = null;
    this.tokenRejected.set(false);
    this.formError.set(null);
    this.resetForm.reset();
    this.step.set('request');
  }
}
