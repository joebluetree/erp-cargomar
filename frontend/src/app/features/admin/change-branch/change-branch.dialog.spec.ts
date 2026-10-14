import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { vi } from 'vitest';
import { AuthSession } from '../../../core/auth/auth-session';
import { testSession } from '../../../core/auth/auth-session.testing';
import { httpErrorInterceptor } from '../../../core/errors/http-error.interceptor';
import { NotificationService } from '../../../core/notifications/notification.service';
import { ChangeBranchDialog } from './change-branch.dialog';
import { CHANGE_RESPONSE, SESSION_OPTIONS } from './change-branch.testing';

describe('ChangeBranchDialog', () => {
  const notifications = { error: vi.fn(), warn: vi.fn(), success: vi.fn() };
  let controller: HttpTestingController;
  let auth: AuthSession;
  let closed: unknown[];

  beforeEach(() => {
    sessionStorage.clear();
    Object.values(notifications).forEach((fn) => fn.mockReset());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthSession);
    auth.start(testSession()); // Kochi, 2025-2026
  });

  afterEach(() => {
    controller.verify();
    document.body.replaceChildren();
  });

  const settle = async () => {
    const app = TestBed.inject(ApplicationRef);
    app.tick();
    await app.whenStable();
    await new Promise((r) => setTimeout(r));
    app.tick();
  };

  /** Opens the dialog the way the header does and answers the options request. */
  async function open(options = SESSION_OPTIONS) {
    closed = [];
    TestBed.inject(HlmDialogService).open(ChangeBranchDialog).closed$.subscribe((result) => closed.push(result));
    await settle();
    controller.expectOne('admin/session/options').flush(options);
    await settle();
  }

  const dialog = () => document.querySelector('[role="dialog"]') as HTMLElement | null;
  /** A field's trigger: the button that shows the chosen name and opens the list (no text input). */
  const field = (id: string) => document.getElementById(id) as HTMLButtonElement;
  const branch = () => field('change-branch-branch');
  const year = () => field('change-branch-year');
  const shown = (trigger: HTMLButtonElement) => trigger.textContent?.trim();
  const button = (name: string) =>
    Array.from(dialog()!.querySelectorAll('button')).find((b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name)!;
  const fieldErrors = () => Array.from(document.querySelectorAll('[data-slot="field-error"]')).map((e) => e.textContent?.trim());

  const listed = () => Array.from(document.querySelectorAll<HTMLElement>('hlm-select-item'));

  /** Opens a field's list and picks the row with this name. */
  async function choose(trigger: HTMLButtonElement, name: string) {
    trigger.click();
    await settle();
    listed().find((row) => row.textContent?.trim() === name)!.click();
    await settle();
  }

  /** The options with the session's year (y-1) closed, so it is not offered. */
  const yearClosed = { ...SESSION_OPTIONS, years: SESSION_OPTIONS.years.filter((y) => y.id !== 'y-1') };

  describe('layout', () => {
    it('is titled "Change Branch", with Branch and Year and then Select and Cancel at the bottom right', async () => {
      await open();

      expect(dialog()!.querySelector('[hlmDialogTitle]')!.textContent?.trim()).toBe('Change Branch');
      const labels = Array.from(dialog()!.querySelectorAll('label')).map((l) => [l.textContent?.trim(), l.getAttribute('for')]);
      expect(labels).toEqual([
        ['Branch', 'change-branch-branch'],
        ['Year', 'change-branch-year'],
      ]);
      expect(branch().compareDocumentPosition(year()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      const row = button('Select').parentElement!;
      expect(Array.from(row.children).map((b) => b.textContent?.trim())).toEqual(['Select', 'Cancel']);
      expect(Array.from(row.classList)).toEqual(expect.arrayContaining(['flex', 'justify-end']));
      expect(button('Select').getAttribute('type')).toBe('submit');
      expect(button('Select').classList).toContain('bg-primary-surface');
    });

    it('puts each label on the same line as its field on wider screens, and stacks them on narrow ones', async () => {
      await open();

      const rows = Array.from(dialog()!.querySelectorAll('[data-slot="field-row"]'));
      expect(rows.length).toBe(2);
      for (const [row, id] of [[rows[0], 'change-branch-branch'], [rows[1], 'change-branch-year']] as const) {
        expect(Array.from(row.classList)).toEqual(
          expect.arrayContaining(['flex', 'flex-col', 'sm:grid', 'sm:grid-cols-[6rem_1fr]', 'sm:items-center']),
        );
        const label = row.querySelector('label')!;
        expect(label.getAttribute('for')).toBe(id);
        expect(row.firstElementChild).toBe(label);
        expect(label.nextElementSibling!.contains(field(id))).toBe(true);
      }
    });

    it('shows a required message under its field, in the field column', async () => {
      await open(yearClosed);

      button('Select').click();
      await settle();

      const message = dialog()!.querySelector('[data-slot="field-error"]')!;
      expect(message.textContent?.trim()).toBe('Year is required.');
      expect(message.closest('[data-slot="field-row"]')!.contains(year())).toBe(true);
      expect(Array.from(message.classList)).toEqual(expect.arrayContaining(['sm:col-start-2', 'text-destructive']));
      controller.expectNone('admin/session/change');
    });

    it('starts at the current branch and year', async () => {
      await open();

      expect(shown(branch())).toBe('Kochi');
      expect(shown(year())).toBe('2025-2026');
    });

    it("opens a field's list when activated, offering the backend's branches and years in their order", async () => {
      await open();

      branch().click();
      await settle();
      expect(listed().map((row) => row.textContent?.trim())).toEqual(['Kochi', 'Mumbai']);
      listed()[1].click();
      await settle();
      expect(shown(branch())).toBe('Mumbai');

      year().click();
      await settle();
      expect(listed().map((row) => row.textContent?.trim())).toEqual(['2025-2026', '2024-2025']);
    });

    it('has no text input and no clear button in either field', async () => {
      await open();

      expect(dialog()!.querySelector('form input')).toBeNull();
      const labels = Array.from(dialog()!.querySelectorAll('form button')).map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim());
      expect(labels).toEqual(['Kochi', '2025-2026', 'Select', 'Cancel']);
    });
  });

  describe('select', () => {
    it('switches to the chosen branch and year and closes, without a notification', async () => {
      await open();
      await choose(branch(), 'Mumbai');
      await choose(year(), '2024-2025');

      button('Select').click();
      await settle();
      const req = controller.expectOne('admin/session/change');
      expect(req.request.body).toEqual({ branchId: 'b-2', yearId: 'y-0' });
      req.flush(CHANGE_RESPONSE);
      await settle();

      expect(notifications.success).not.toHaveBeenCalled();
      expect(notifications.warn).not.toHaveBeenCalled();
      expect(notifications.error).not.toHaveBeenCalled();
      expect(auth.details()).toEqual({ company: 'Cargomar Pvt Ltd', user: 'ADMIN', branch: 'Mumbai', year: '2024-2025' });
      expect(closed).toEqual([true]);
      expect(dialog()).toBeNull();
    });

    it('starts with Year empty when the session year has been closed, and asks for a year without sending', async () => {
      await open(yearClosed);
      expect(shown(year())).toBe('Select a year');

      button('Select').click();
      await settle();

      expect(fieldErrors()).toEqual(['Year is required.']);
      expect(year().getAttribute('aria-invalid')).toBe('true');
      controller.expectNone('admin/session/change');
      expect(dialog()).not.toBeNull();
    });

    it('disables Select and shows progress while the switch is in flight, and sends it once', async () => {
      await open();
      await choose(branch(), 'Mumbai');

      button('Select').click();
      await settle();
      expect(button('Selecting…').disabled).toBe(true);
      button('Selecting…').click();
      await settle();

      controller.expectOne('admin/session/change').flush(CHANGE_RESPONSE);
      await settle();
    });

    it('shows a refusal as a warning and stays open with the values', async () => {
      await open();
      await choose(branch(), 'Mumbai');
      const before = auth.session();

      button('Select').click();
      await settle();
      controller.expectOne('admin/session/change')
        .flush({ title: 'This branch is not available to you.', status: 403 }, { status: 403, statusText: 'Forbidden' });
      await settle();

      expect(notifications.warn).toHaveBeenCalledExactlyOnceWith('This branch is not available to you.');
      expect(notifications.error).not.toHaveBeenCalled();
      expect(dialog()).not.toBeNull();
      expect(shown(branch())).toBe('Mumbai');
      expect(button('Select').disabled).toBe(false);
      expect(auth.session()).toEqual(before);
    });

    it('closes when the session has ended (401)', async () => {
      await open();

      button('Select').click();
      await settle();
      controller.expectOne('admin/session/change').flush({ title: 'x', status: 401 }, { status: 401, statusText: 'Unauthorized' });
      await settle();

      expect(dialog()).toBeNull();
      expect(notifications.warn).not.toHaveBeenCalled();
    });
  });

  describe('leaving without a change', () => {
    it('Cancel closes the dialog and sends nothing', async () => {
      await open();
      await choose(branch(), 'Mumbai');
      const before = auth.session();

      button('Cancel').click();
      await settle();

      expect(dialog()).toBeNull();
      expect(closed).toEqual([false]);
      controller.expectNone('admin/session/change');
      expect(auth.session()).toEqual(before);
    });

    it('Escape closes the dialog and sends nothing', async () => {
      await open();

      dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();

      expect(dialog()).toBeNull();
      controller.expectNone('admin/session/change');
    });

    it('closes when the lists cannot be loaded (the interceptor shows the error)', async () => {
      closed = [];
      TestBed.inject(HlmDialogService).open(ChangeBranchDialog).closed$.subscribe((result) => closed.push(result));
      await settle();

      controller.expectOne('admin/session/options').flush({ title: 'boom' }, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(notifications.error).toHaveBeenCalledTimes(1);
      expect(dialog()).toBeNull();
    });
  });
});
