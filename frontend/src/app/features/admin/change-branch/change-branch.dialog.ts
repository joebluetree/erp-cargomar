import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle } from '@ng-icons/lucide';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { AuthSession } from '../../../core/auth/auth-session';
import { SERVER_ERROR_MESSAGE, isApiError } from '../../../core/errors/api-error';
import { NotificationService } from '../../../core/notifications/notification.service';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { BranchOption, YearOption } from './change-branch.model';
import { ChangeBranchService } from './change-branch.service';

type Field = 'branch' | 'year';

/**
 * The Change Branch dialog (BR-001): Branch and Year are required dropdown lists (pick a row; no typing, no clearing)
 * that start at the session's current values; Year offers open years only. Select switches the session quietly (the header shows the change) and keeps the current page; Cancel, Escape and the close button leave it as it
 * is. A refused switch (403) is shown as a warning and the dialog stays open with its values.
 */
@Component({
  selector: 'app-change-branch-dialog',
  imports: [ReactiveFormsModule, NgIcon, HlmButtonImports, HlmDialogImports, HlmLabelImports, HlmSelectImports, FieldError],
  providers: [ChangeBranchService, provideIcons({ lucideLoaderCircle })],
  templateUrl: './change-branch.dialog.html',
  // The dialog's spacing between its header and its form (the dialog frame spaces its own children the same way).
  host: { class: 'grid gap-6' },
})
export class ChangeBranchDialog {
  protected readonly service = inject(ChangeBranchService);
  private readonly auth = inject(AuthSession);
  private readonly notifications = inject(NotificationService);
  private readonly ref = inject<BrnDialogRef<boolean>>(BrnDialogRef);

  protected readonly form = new FormGroup({
    branch: new FormControl<BranchOption | null>(null, Validators.required),
    year: new FormControl<YearOption | null>(null, Validators.required),
  });

  protected readonly messages: Record<Field, string> = {
    branch: 'Branch is required.',
    year: 'Year is required.',
  };

  protected readonly branches = signal<BranchOption[]>([]);
  protected readonly years = signal<YearOption[]>([]);
  /** True until the lists have arrived; Select stays disabled meanwhile. */
  protected readonly loading = signal(true);
  /** True once Select was attempted, so every message shows even for fields not touched yet. */
  protected readonly submitted = signal(false);

  protected readonly branchName = (branch: BranchOption) => branch.name;
  protected readonly yearName = (year: YearOption) => year.name;
  protected readonly sameId = (item: { id: string }, value: { id: string } | null | undefined) => item.id === value?.id;

  constructor() {
    this.service
      .options()
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe({
        next: (options) => {
          const current = this.auth.session();
          this.branches.set(options.branches);
          this.years.set(options.years);
          this.form.setValue({
            branch: options.branches.find((b) => b.id === current?.branchId) ?? null,
            year: options.years.find((y) => y.id === current?.yearId) ?? null,
          });
          this.loading.set(false);
        },
        // The error interceptor has shown the notification; with nothing to choose from, the dialog closes.
        error: () => this.ref.close(false),
      });
  }

  /** The message to show under a field, or null. */
  protected error(field: Field): string | null {
    const control = this.form.controls[field];
    return control.valid || !(control.touched || this.submitted()) ? null : this.messages[field];
  }

  protected select(): void {
    this.submitted.set(true);
    const { branch, year } = this.form.getRawValue();
    if (!branch || !year) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.service.busy() || this.loading()) {
      return;
    }
    this.service.change({ branchId: branch.id, yearId: year.id }).subscribe({
      // No notification: the header showing the new branch and year is the confirmation.
      next: () => this.ref.close(true),
      error: (error: unknown) => this.reportFailure(error),
    });
  }

  protected cancel(): void {
    this.ref.close(false);
  }

  /** 403 is an expected refusal (a warning); 401 has already ended the session, so the dialog just closes. */
  private reportFailure(error: unknown): void {
    if (!isApiError(error)) {
      this.notifications.error(SERVER_ERROR_MESSAGE);
    } else if (error.status === 401) {
      this.ref.close(false);
    } else if (error.status === 403) {
      this.notifications.warn(error.message);
    } else {
      this.notifications.error(error.message);
    }
  }
}
