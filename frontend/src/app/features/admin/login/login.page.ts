import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { SERVER_ERROR_MESSAGE, isApiError } from '../../../core/errors/api-error';
import { NotificationService } from '../../../core/notifications/notification.service';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { PageTitle } from '../../../shared/ui/page-title/page-title';
import { LoginService } from './login.service';
import { RememberedLogin } from './remembered-login';

type Field = 'userCode' | 'password' | 'companyCode';

/** Required and not only spaces (BR-001.1). */
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}

/**
 * The login screen, shown outside the shell. User, Password and Company are required; the password can be
 * shown or hidden with the eye button (BR-001.2). Login starts the session and opens the Dashboard; Cancel resets
 * the screen. A refused login (401 or 403) is shown as a warning with the backend's message and every field keeps
 * its value; other failures are shown as errors, and backend validation messages go under their fields. With Remember
 * me ticked, a successful login is remembered in the browser and fills the screen the next time it opens.
 */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, NgIcon, HlmButtonImports, HlmCheckboxImports, HlmInputImports, HlmLabelImports, FieldError, PageTitle],
  providers: [provideIcons({ lucideEye, lucideEyeOff, lucideLoaderCircle })],
  templateUrl: './login.page.html',
})
export class LoginPage {
  protected readonly service = inject(LoginService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly remembered = inject(RememberedLogin);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    userCode: ['', notBlank],
    password: ['', notBlank],
    companyCode: ['', notBlank],
    remember: [false],
  });

  protected readonly messages: Record<Field, string> = {
    userCode: 'User is required.',
    password: 'Password is required.',
    companyCode: 'Company is required.',
  };

  /** True once Login was attempted, so every message shows even for fields not touched yet. */
  protected readonly submitted = signal(false);
  protected readonly showPassword = signal(false);

  constructor() {
    const remembered = this.remembered.read();
    if (remembered) {
      this.form.patchValue({ ...remembered, remember: true });
    }
  }

  /** The message to show under a field, or null. */
  protected error(field: Field): string | null {
    const control = this.form.controls[field];
    if (control.valid || !(control.touched || this.submitted())) {
      return null;
    }
    return (control.errors?.['server'] as string | undefined) ?? this.messages[field];
  }

  protected togglePassword(): void {
    this.showPassword.update((shown) => !shown);
  }

  protected login(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.service.busy()) {
      return;
    }
    const { userCode, password, companyCode, remember } = this.form.getRawValue();
    const credentials = { userCode: userCode.trim(), password, companyCode: companyCode.trim() };
    this.service.login(credentials).subscribe({
      next: () => {
        if (remember) {
          this.remembered.save(credentials);
        } else {
          this.remembered.forget();
        }
        void this.router.navigateByUrl('/');
      },
      error: (error: unknown) => this.reportFailure(error),
    });
  }

  /** Empties the three fields; Remember me and what is remembered stay as they are. */
  protected cancel(): void {
    this.form.reset({ userCode: '', password: '', companyCode: '', remember: this.form.controls.remember.value });
    this.submitted.set(false);
    this.showPassword.set(false);
  }

  /**
   * The login request is not reported by the error interceptor, so the page reports it, once: a refused login as a
   * warning, validation messages under their fields, anything else as an error. Nothing the user typed is cleared.
   */
  private reportFailure(error: unknown): void {
    if (!isApiError(error)) {
      this.notifications.error(SERVER_ERROR_MESSAGE);
    } else if (error.fieldErrors) {
      this.applyFieldErrors(error.fieldErrors);
    } else if (error.status === 401 || error.status === 403) {
      this.notifications.warn(error.message);
    } else {
      this.notifications.error(error.message);
    }
  }

  private applyFieldErrors(fieldErrors: Record<string, string[]>): void {
    for (const [field, texts] of Object.entries(fieldErrors)) {
      const control = this.form.controls[field as Field] as AbstractControl | undefined;
      control?.setErrors({ server: texts[0] });
      control?.markAsTouched();
    }
  }
}
