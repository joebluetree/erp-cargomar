import { Component, computed, inject, signal } from '@angular/core';
import { catchError, concatMap, from, map, of } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle } from '@ng-icons/lucide';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { SERVER_ERROR_MESSAGE, isApiError } from '../../../core/errors/api-error';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { HolidayUploadService } from './holiday-upload.service';

/**
 * The Upload Holiday List dialog (admin-list-upload design D5): one or more `.txt` files (at most 20), Upload and
 * Cancel. Each file keeps its own name, which must follow the holiday file rule, and is sent on its own, one after
 * another; the backend checks each. Every file shows its result. Files that exist (409) wait for Replace, which sends
 * only them again with `replace`; refused files (400, 403) show the backend's reason. When every file is saved the
 * dialog closes; it always closes with the names saved, also when cancelled after a partial upload.
 */
@Component({
  selector: 'app-holiday-upload-dialog',
  imports: [NgIcon, HlmButtonImports, HlmDialogImports, FieldError],
  providers: [HolidayUploadService, provideIcons({ lucideLoaderCircle })],
  templateUrl: './holiday-upload.dialog.html',
  host: { class: 'grid gap-6' },
})
export class HolidayUploadDialog {
  protected readonly service = inject(HolidayUploadService);
  private readonly ref = inject<BrnDialogRef<readonly string[]>>(BrnDialogRef);

  /** The files chosen, at most {@link MAX_FILES}. */
  protected readonly files = signal<readonly File[]>([]);
  /** Each chosen file's result so far, in the order chosen. */
  protected readonly results = signal<readonly FileResult[]>([]);
  /** True while the files are being sent, one after another. */
  protected readonly sending = signal(false);
  /** More files were chosen than may be sent at once. */
  protected readonly tooMany = signal(false);

  /** The files that exist and wait for Replace. */
  protected readonly existing = computed(() => this.results().filter((r) => r.state === 'exists'));
  /** The names saved so far; the dialog closes with them, also when cancelled after a partial upload. */
  private readonly saved = computed(() => this.results().filter((r) => r.state === 'saved').map((r) => r.savedAs!));

  protected readonly maxFiles = MAX_FILES;

  protected choose(event: Event): void {
    const chosen = Array.from((event.target as HTMLInputElement).files ?? []);
    this.tooMany.set(chosen.length > MAX_FILES);
    this.files.set(chosen.length > MAX_FILES ? [] : chosen);
    this.results.set([]);
  }

  /** Sends every chosen file once, one after another; each file gets its own result. */
  protected upload(): void {
    if (this.files().length === 0 || this.sending()) return;
    this.results.set(this.files().map((file) => ({ file, state: 'pending' })));
    this.send(this.files(), false);
  }

  /** Sends again, with replace, only the files that exist. */
  protected replace(): void {
    if (this.existing().length === 0 || this.sending()) return;
    this.send(this.existing().map((r) => r.file), true);
  }

  protected cancel(): void {
    this.ref.close(this.saved());
  }

  private send(files: readonly File[], replace: boolean): void {
    this.sending.set(true);
    from(files)
      .pipe(
        concatMap((file) =>
          this.service.upload(file, replace).pipe(
            map((answer): FileResult => ({ file, state: 'saved', savedAs: answer.fileName })),
            catchError((error: unknown) => of(this.failed(file, error))),
          ),
        ),
      )
      .subscribe({
        next: (result) => {
          if (result.state === 'ended') {
            this.ref.close(this.saved()); // 401: the session has ended
            return;
          }
          this.results.update((all) => all.map((r) => (r.file === result.file ? result : r)));
        },
        complete: () => {
          this.sending.set(false);
          if (this.results().every((r) => r.state === 'saved')) this.ref.close(this.saved());
        },
      });
  }

  /** 409: exists, waiting for Replace; 400 and 403: refused with the backend's reason; 401: the session ended. */
  private failed(file: File, error: unknown): FileResult {
    if (!isApiError(error)) return { file, state: 'refused', message: SERVER_ERROR_MESSAGE };
    if (error.status === 401) return { file, state: 'ended' };
    if (error.status === 409) return { file, state: 'exists', message: `${error.message} Replace it?` };
    return { file, state: 'refused', message: error.message };
  }
}

/** How many files may be uploaded at once. */
export const MAX_FILES = 20;

/** One chosen file and what happened to it. */
interface FileResult {
  file: File;
  state: 'pending' | 'saved' | 'exists' | 'refused' | 'ended';
  /** The name it was saved under. */
  savedAs?: string;
  /** Why it was refused, or that it exists. */
  message?: string;
}
