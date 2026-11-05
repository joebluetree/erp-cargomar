import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SKIP_ERROR_NOTIFICATION } from '../../../../core/errors/http-error.interceptor';
import { HolidayUploadService } from './holiday-upload.service';

describe('HolidayUploadService', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [HolidayUploadService, provideHttpClient(), provideHttpClientTesting()],
    });
    return { service: TestBed.inject(HolidayUploadService), http: TestBed.inject(HttpTestingController) };
  }

  const file = () => new File(['Republic Day,Monday,26-01-2026'], 'CPL-COKSF-2026.txt', { type: 'text/plain' });

  it('posts the file and the replace flag as form data, without the error notification, and is busy meanwhile', () => {
    const { service, http } = setup();
    let saved = '';

    service.upload(file(), true).subscribe((answer) => (saved = answer.fileName));

    expect(service.busy()).toBe(true);
    const req = http.expectOne('admin/holidays/file');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect((body.get('file') as File).name).toBe('CPL-COKSF-2026.txt');
    expect(body.get('replace')).toBe('true');
    expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);

    req.flush({ fileName: 'CPL-COKSF-2026.txt' });

    expect(saved).toBe('CPL-COKSF-2026.txt');
    expect(service.busy()).toBe(false);
  });

  it('sends replace false unless asked, and is no longer busy after a refusal', () => {
    const { service, http } = setup();

    service.upload(file(), false).subscribe({ error: () => undefined });
    const req = http.expectOne('admin/holidays/file');
    expect((req.request.body as FormData).get('replace')).toBe('false');

    req.flush({ title: 'A holiday list named CPL-COKSF-2026.txt already exists.' }, { status: 409, statusText: 'Conflict' });

    expect(service.busy()).toBe(false);
  });
});
