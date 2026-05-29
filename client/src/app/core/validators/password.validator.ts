import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    if (!value) return null;

    const errors: ValidationErrors = {};
    if (value.length < 8) errors['minLength'] = true;
    if (!/[A-Z]/.test(value)) errors['requireUppercase'] = true;
    if (!/[a-z]/.test(value)) errors['requireLowercase'] = true;
    if (!/\d/.test(value)) errors['requireNumber'] = true;
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(value)) errors['requireSpecial'] = true;

    return Object.keys(errors).length ? errors : null;
  };
}

export const PASSWORD_HINT =
  'Min. 8 characters with uppercase, lowercase, number and special character (!@#$%^&*…)';
