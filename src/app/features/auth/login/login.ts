import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../Core/Auth/auth.service';
import { homeRouteFor } from '../../../Core/Auth/role-home';
import { toApiError } from '../../../Core/http/api-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly notice = this.noticeFor(
    this.query.get('reason'),
    this.query.has('registered'),
  );

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

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
    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email.trim(), password }).subscribe({
      next: (response) => {
        this.submitting.set(false);
        void this.router.navigateByUrl(homeRouteFor(response.user.role));
      },
      error: (error: unknown) => {
        this.formError.set(toApiError(error).message);
        this.submitting.set(false);
      },
    });
  }

  private noticeFor(reason: string | null, registered: boolean): string | null {
    if (registered) {
      return 'Tu cuenta está lista. Inicia sesión para continuar.';
    }
    if (reason === 'expired') {
      return 'Tu sesión expiró. Inicia sesión de nuevo.';
    }
    if (reason === 'signin') {
      return 'Inicia sesión para continuar.';
    }
    return null;
  }
}
