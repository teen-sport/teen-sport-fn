import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const UPPERCASE = /\p{Lu}/u;
const LOWERCASE = /\p{Ll}/u;
const DIGIT = /\p{Nd}/u;
const SYMBOL = /[^\p{L}\p{Nd}\s]/u;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  digit: boolean;
  symbol: boolean;
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH && utf8Bytes(password) <= PASSWORD_MAX_BYTES,
    uppercase: UPPERCASE.test(password),
    lowercase: LOWERCASE.test(password),
    digit: DIGIT.test(password),
    symbol: SYMBOL.test(password),
  };
}

export function maxUtf8Bytes(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return typeof value === 'string' && utf8Bytes(value) > max ? { maxbytes: { max } } : null;
  };
}

export const strongPassword: ValidatorFn = (control) => {
  const value = control.value;
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  return Object.values(checkPassword(value)).every(Boolean) ? null : { weakpassword: true };
};

export function sameValue(first: string, second: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(first)?.value;
    const b = group.get(second)?.value;
    return a === b ? null : { mismatch: true };
  };
}

export const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value !== '' && control.value.trim() === ''
    ? { required: true }
    : null;

/** El valor debe ser un número entero (un campo vacío se acepta; para exigirlo usa `required`). */
export const integer: ValidatorFn = (control) => {
  const value = control.value;
  return value === null || value === '' || Number.isInteger(value) ? null : { integer: true };
};
