import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { SKIP_ERROR_NOTIFICATION } from '../../../../core/errors/http-error.interceptor';

/** What the backend answers for a saved holiday file: the name it was saved under. */
export interface HolidayUpload {
  fileName: string;
}

/**
 * Uploads a holiday list file (admin-list-upload design D5). Provided by the upload dialog. A refusal (400, 403) and an
 * existing file (409) are answered by the dialog itself, so the error interceptor stays silent for this request.
 */
@Injectable()
export class HolidayUploadService {
  private readonly http = inject(HttpClient);

  private readonly busyState = signal(false);
  /** True while an upload is in flight. */
  readonly busy = this.busyState.asReadonly();

  /** Sends the file as multipart form data; `replace` replaces an existing file of the same name. */
  upload(file: File, replace: boolean): Observable<HolidayUpload> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('replace', replace ? 'true' : 'false');
    this.busyState.set(true);
    return this.http
      .post<HolidayUpload>('admin/holidays/file', form, { context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true) })
      .pipe(finalize(() => this.busyState.set(false)));
  }
}
