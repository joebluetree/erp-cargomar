import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { vi } from 'vitest';
import { httpErrorInterceptor } from '../../../../core/errors/http-error.interceptor';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { HolidayUploadDialog, MAX_FILES } from './holiday-upload.dialog';

describe('HolidayUploadDialog', () => {
  const notifications = { error: vi.fn(), warn: vi.fn(), success: vi.fn() };
  let http: HttpTestingController;
  let closed: unknown[];

  beforeEach(() => {
    Object.values(notifications).forEach((fn) => fn.mockReset());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    document.body.replaceChildren();
  });

  const settle = async () => {
    const app = TestBed.inject(ApplicationRef);
    app.tick();
    await app.whenStable();
    await new Promise((r) => setTimeout(r));
    app.tick();
  };

  async function open() {
    closed = [];
    TestBed.inject(HlmDialogService).open(HolidayUploadDialog).closed$.subscribe((result) => closed.push(result));
    await settle();
  }

  const dialog = () => document.querySelector('[role="dialog"]') as HTMLElement | null;
  const input = () => document.getElementById('holiday-upload-file') as HTMLInputElement;
  const buttons = () => Array.from(dialog()!.querySelectorAll('form button')) as HTMLButtonElement[];
  const submit = () => buttons().find((b) => b.type === 'submit')!;
  const cancel = () => buttons().find((b) => b.textContent?.trim() === 'Cancel')!;
  /** Each file's row: its state, and its parts (name, then result or reason on its own line) joined by a space. */
  const results = () =>
    Array.from(document.querySelectorAll('[data-slot="upload-result"]')).map((r) => [
      r.getAttribute('data-state'),
      Array.from(r.children)
        .map((part) => part.textContent?.replace(/\s+/g, ' ').trim())
        .join(' '),
    ]);

  /** Chooses files in the file field, as the browser's picker would. */
  async function choose(...names: string[]) {
    const files = names.map((name) => new File(['Republic Day,Monday,26-01-2026'], name, { type: 'text/plain' }));
    const list = Object.assign([...files], { item: (i: number) => files[i] ?? null }) as unknown as FileList;
    Object.defineProperty(input(), 'files', { value: list, configurable: true });
    input().dispatchEvent(new Event('change'));
    await settle();
  }

  /** The waiting upload request, with the name of the file it sends and its replace flag. */
  function next(): { req: TestRequest; name: string; replace: string } {
    const req = http.expectOne('admin/holidays/file');
    const body = req.request.body as FormData;
    return { req, name: (body.get('file') as File).name, replace: String(body.get('replace')) };
  }

  function conflict(req: TestRequest, name: string) {
    req.flush({ title: `A holiday list named ${name} already exists.`, status: 409 }, { status: 409, statusText: 'Conflict' });
  }

  it('shows the title, a multiple .txt file field, the naming hint, and Upload then Cancel', async () => {
    await open();

    expect(dialog()!.querySelector('h2')?.textContent?.trim()).toBe('Upload Holiday List');
    expect(input().multiple).toBe(true);
    expect(input().accept).toContain('.txt');
    expect(dialog()!.textContent).toContain('<company code>-<branch code>-<year code>.txt');
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Upload', 'Cancel']);
    expect(submit().disabled).toBe(true);
  });

  it('lists the chosen files, one row each, above the file field until they are sent', async () => {
    await open();
    const selected = () =>
      Array.from(document.querySelectorAll('[data-slot="selected-file"]')).map((r) => r.textContent?.trim());
    expect(selected()).toEqual([]);

    await choose('CPL-COKSF-2026.txt', 'CPL-MAASF-2026.txt');
    expect(selected()).toEqual(['CPL-COKSF-2026.txt', 'CPL-MAASF-2026.txt']);
    const list = document.querySelector('[data-slot="selected-files"]')!;
    expect(list.compareDocumentPosition(input()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    submit().click();
    await settle();
    expect(selected()).toEqual([]);
    next().req.flush({ fileName: 'CPL-COKSF-2026.txt' });
    await settle();
    next().req.flush({ fileName: 'CPL-MAASF-2026.txt' });
    await settle();
  });

  it('sends the chosen files one after another, each once, and closes with their names when all are saved', async () => {
    await open();
    await choose('CPL-COKSF-2026.txt', 'cpl-maasf-2026.TXT');

    submit().click();
    await settle();
    expect(submit().textContent?.trim()).toBe('Uploading…');
    expect(submit().disabled).toBe(true);

    const first = next();
    expect([first.name, first.replace]).toEqual(['CPL-COKSF-2026.txt', 'false']);
    first.req.flush({ fileName: 'CPL-COKSF-2026.txt' });
    await settle();
    const second = next();
    expect(second.name).toBe('cpl-maasf-2026.TXT');
    second.req.flush({ fileName: 'CPL-MAASF-2026.txt' });
    await settle();

    expect(closed).toEqual([['CPL-COKSF-2026.txt', 'CPL-MAASF-2026.txt']]);
  });

  it("shows each file's result, keeps going after a refusal, and stays open", async () => {
    await open();
    await choose('CPL-COKSF-2026.txt', 'holidays.txt', 'CPL-MAASF-2026.txt');

    submit().click();
    await settle();
    next().req.flush({ fileName: 'CPL-COKSF-2026.txt' });
    await settle();
    next().req.flush({ title: 'The file name must follow the rule.', status: 400 }, { status: 400, statusText: 'Bad' });
    await settle();
    next().req.flush({ title: 'You may not upload holiday lists.', status: 403 }, { status: 403, statusText: 'Forbidden' });
    await settle();

    expect(results()).toEqual([
      ['saved', 'CPL-COKSF-2026.txt — uploaded as CPL-COKSF-2026.txt'],
      ['refused', 'holidays.txt The file name must follow the rule.'],
      ['refused', 'CPL-MAASF-2026.txt You may not upload holiday lists.'],
    ]);
    expect(closed).toEqual([]);
    expect(submit().disabled).toBe(true); // nothing left to send until other files are chosen
    expect(notifications.warn).not.toHaveBeenCalled();
  });

  it('asks to replace the files that exist, and Replace sends only those again with replace', async () => {
    await open();
    await choose('CPL-COKSF-2026.txt', 'CPL-MAASF-2026.txt');

    submit().click();
    await settle();
    conflict(next().req, 'CPL-COKSF-2026.txt');
    await settle();
    next().req.flush({ fileName: 'CPL-MAASF-2026.txt' });
    await settle();

    expect(results()[0]).toEqual(['exists', 'CPL-COKSF-2026.txt A holiday list named CPL-COKSF-2026.txt already exists. Replace it?']);
    expect(submit().textContent?.trim()).toBe('Replace');
    expect(closed).toEqual([]);

    submit().click();
    await settle();
    const again = next();
    expect([again.name, again.replace]).toEqual(['CPL-COKSF-2026.txt', 'true']);
    again.req.flush({ fileName: 'CPL-COKSF-2026.txt' });
    await settle();

    // The names come in the order the files were chosen.
    expect(closed).toEqual([['CPL-COKSF-2026.txt', 'CPL-MAASF-2026.txt']]);
  });

  it('starts over when other files are chosen', async () => {
    await open();
    await choose('CPL-COKSF-2026.txt');
    submit().click();
    await settle();
    conflict(next().req, 'CPL-COKSF-2026.txt');
    await settle();

    await choose('CPL-COKSF-2025.txt');

    expect(results()).toEqual([]);
    expect(submit().textContent?.trim()).toBe('Upload');
    expect(submit().disabled).toBe(false);
  });

  it(`refuses more than ${MAX_FILES} files at a time and sends nothing`, async () => {
    await open();
    await choose(...Array.from({ length: MAX_FILES + 1 }, (_, i) => `CPL-B${i}-2026.txt`));

    expect(dialog()!.textContent).toContain(`Choose at most ${MAX_FILES} files at a time.`);
    expect(submit().disabled).toBe(true);
  });

  it('closes with the names saved so far when cancelled after a partial upload', async () => {
    await open();
    await choose('CPL-COKSF-2026.txt', 'holidays.txt');
    submit().click();
    await settle();
    next().req.flush({ fileName: 'CPL-COKSF-2026.txt' });
    await settle();
    next().req.flush({ title: 'Bad name.', status: 400 }, { status: 400, statusText: 'Bad' });
    await settle();

    cancel().click();
    await settle();

    expect(closed).toEqual([['CPL-COKSF-2026.txt']]);
  });

  it('sends nothing on Cancel before Upload and closes with no names', async () => {
    await open();
    await choose('CPL-COKSF-2026.txt');

    cancel().click();
    await settle();

    http.expectNone('admin/holidays/file');
    expect(closed).toEqual([[]]);
  });
});
