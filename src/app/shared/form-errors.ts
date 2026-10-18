import { AbstractControl, FormGroup } from '@angular/forms';
import { ApiError } from '../Core/Models/api-error';

export function firstError(control: AbstractControl | null): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) {
    return null;
  }
  const errors = control.errors;
  if (typeof errors['server'] === 'string') {
    return errors['server'];
  }
  if (errors['required']) {
    return 'Este campo es obligatorio.';
  }
  if (errors['email']) {
    return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  }
  if (errors['maxlength']) {
    return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
  }
  if (errors['min']) {
    return `El valor mínimo es ${errors['min'].min}.`;
  }
  if (errors['integer']) {
    return 'Escribe un número entero.';
  }
  if (errors['maxbytes']) {
    return 'La contraseña es demasiado larga.';
  }
  if (errors['weakpassword']) {
    return 'La contraseña no cumple todos los requisitos.';
  }
  return null;
}

export function applyServerError(
  form: FormGroup,
  error: ApiError,
  codeToField: Partial<Record<string, string>> = {},
): string | null {
  let placed = false;
  const place = (field: string, message: string): void => {
    const control = form.get(field);
    if (control) {
      control.setErrors({ ...control.errors, server: message });
      control.markAsTouched();
      placed = true;
    }
  };
  for (const detail of error.details) {
    place(detail.field, detail.message);
  }
  const mapped = codeToField[error.code];
  if (mapped) {
    place(mapped, error.message);
  }
  return placed ? null : error.message;
}
