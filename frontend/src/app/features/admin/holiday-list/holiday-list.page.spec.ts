import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { AuthSession, SESSION_STORAGE_KEY } from '../../../core/auth/auth-session';
import { testSession } from '../../../core/auth/auth-session.testing';
import { NotificationService } from '../../../core/notifications/notification.service';
import { Holiday } from './holiday-list.model';
import { HolidayListPage } from './holiday-list.page';
import { HolidayListService } from './holiday-list.service';

const HOLIDAYS: Holiday[] = [
  { holiday: 'Republic Day', day: 'Monday', date: '26-01-2026' },
  { holiday: 'Vishu', day: 'Thursday', date: '14-May-2026' },
  // The file says Tuesday although 1 May 2026 is a Friday: the screen shows the file's text as it is.
  { holiday: 'Labour Day', day: 'Tuesday', date: '01-May-2026' },
  { holiday: 'Local festival', day: null, date: null },
  { holiday: null, day: 'Friday', date: '25-12-2026' },
];

describe('HolidayListPage', () => {
  let fixture: ComponentFixture<HolidayListPage>;
  let http: HttpTestingController;
  let el: HTMLElement;
  const notifications = { error: vi.fn() };

  function create() {
    notifications.error.mockReset();
    TestBed.configureTestingModule({
      imports: [HolidayListPage],
      providers: [
        HolidayListService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    fixture = TestBed.createComponent(HolidayListPage);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  function answer(items: Holiday[] = HOLIDAYS) {
    http.expectOne('admin/holidays').flush({ branchCode: 'COKSF', branchName: 'Kochi Sea', items });
    fixture.detectChanges();
  }

  function fail(status: number) {
    http.expectOne('admin/holidays').flush({ status }, { status, statusText: 'x' });
    fixture.detectChanges();
  }

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const box = () => el.querySelector('[data-slot="holiday-box"]');
  const cellsOf = (row: Element) => Array.from(row.querySelectorAll('[role="cell"], [role="columnheader"]')).map((c) => text(c));
  const heading = () => cellsOf(el.querySelector('[data-slot="holiday-heading"]')!);
  const rows = () => Array.from(el.querySelectorAll('[data-slot="holiday-row"]')).map(cellsOf);

  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  it('shows the title Holiday List, and no box or loading message of its own until the holidays arrive', () => {
    create();

    expect(text(el.querySelector('h1'))).toBe('Holiday List');
    expect(el.querySelector('h1')!.getAttribute('data-slot')).toBe('page-title');
    expect(el.querySelector('[role="status"]')).toBeNull(); // no message of its own: the shell shows the spinner
    expect(box()).toBeNull();
    answer();
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('shows one box with the headings Holiday, Day and Date, then a row per holiday in the order received', () => {
    create();
    answer();

    expect(el.querySelectorAll('[data-slot="holiday-box"]')).toHaveLength(1);
    expect(heading()).toEqual(['Holiday', 'Day', 'Date']);
    expect(rows()).toEqual([
      // Exactly as the file writes them: no day calculated, no date reformatted.
      ['Republic Day', 'Monday', '26-01-2026'],
      ['Vishu', 'Thursday', '14-May-2026'],
      ['Labour Day', 'Tuesday', '01-May-2026'],
      ['Local festival', '—', '—'],
      ['—', 'Friday', '25-12-2026'],
    ]);
  });

  it('heads the box with the branch name, inside the box and above the columns', () => {
    create();
    answer();

    const header = box()!.querySelector('[data-slot="holiday-branch"]')!;
    expect(text(header)).toBe('Kochi Sea');
    expect(header.tagName).toBe('H2');
    expect(header.compareDocumentPosition(box()!.querySelector('[role="table"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(header.parentElement!.firstElementChild).toBe(header);
    expect(el.querySelectorAll('[data-slot="holiday-branch"]')).toHaveLength(1);
  });

  it('is a table to assistive technology, with column headers', () => {
    create();
    answer();

    const table = el.querySelector('[role="table"]')!;
    expect(table.querySelectorAll('[role="columnheader"]')).toHaveLength(3);
    expect(table.querySelectorAll('[role="row"]')).toHaveLength(HOLIDAYS.length + 1);
    expect(table.querySelectorAll('[role="cell"]')).toHaveLength(HOLIDAYS.length * 3);
  });

  it('uses the Profile box look, with all three columns left-aligned and the holiday in the label colour', () => {
    create();
    answer();

    expect(box()!.getAttribute('data-slot')).toBe('holiday-box');
    expect(Array.from(box()!.classList)).toEqual(expect.arrayContaining(['rounded-2xl', 'bg-profile-box', 'shadow-md']));
    // A quarter of the screen wide (full width on phones, never narrower than its rows) and as tall as its list.
    expect(Array.from(box()!.classList)).toEqual(
      expect.arrayContaining(['md:w-[25vw]', 'md:min-w-fit', 'w-full', 'h-fit']),
    );
    // The box is as tall as its list: no fixed height and no scroll of its own.
    expect(box()!.className).not.toMatch(/h-\[|overflow-auto/);
    const list = el.querySelector('[data-slot="holiday-rows"]')!;
    expect(Array.from(list.classList)).toEqual(expect.arrayContaining(['grid', 'grid-cols-[auto_auto_auto]']));
    // The text size is the Profile's: the card's own size, with none of its own on the list or the branch heading.
    expect(list.className).not.toMatch(/text-(xs|sm|base|lg|xl)/);
    expect(el.querySelector('[data-slot="holiday-branch"]')?.className ?? '').not.toMatch(/text-(xs|sm|base|lg|xl)/);
    const [reason, day, date] = Array.from(list.querySelector('[data-slot="holiday-row"]')!.children);
    const headings = Array.from(list.querySelectorAll('[role="columnheader"]'));
    expect([...headings, reason, day, date].every((c) => c.classList.contains('text-left'))).toBe(true);
    expect(headings.every((h) => h.classList.contains('font-semibold'))).toBe(true);
    expect(reason.classList).toContain('text-profile-label');
    expect(date.classList).toContain('font-medium');
  });

  it('is view only: no inputs and no buttons but Back', () => {
    create();
    answer();

    expect(el.querySelectorAll('input, textarea, select')).toHaveLength(0);
    // The only button is Back.
    expect(Array.from(el.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual(['Back']);
  });

  it('says Holiday List Not Found on 404, with no notification and no box', () => {
    create();
    fail(404);

    expect(text(el.querySelector('[data-slot="not-found"]'))).toBe('Holiday List Not Found');
    expect(box()).toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('says there are no holidays when the list is empty', () => {
    create();
    answer([]);

    expect(text(el.querySelector('[data-slot="no-holidays"]'))).toBe('There are no holidays in the list.');
    expect(box()).toBeNull();
  });

  it('shows an alert with Retry when the load fails, and Retry loads again', () => {
    create();
    fail(500);

    const alert = el.querySelector('[role="alert"]')!;
    expect(text(alert)).toContain('The holiday list could not be loaded.');
    alert.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    answer();
    expect(rows()).toHaveLength(HOLIDAYS.length);
  });

  describe('following the session', () => {
    beforeEach(() => sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession())));

    it('loads the new list after a branch switch', () => {
      create();
      answer();

      TestBed.inject(AuthSession).start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
      fixture.detectChanges();
      fail(404);

      expect(text(el.querySelector('[data-slot="not-found"]'))).toBe('Holiday List Not Found');
    });

    it('loads the new list after a year switch', () => {
      create();
      answer();

      TestBed.inject(AuthSession).start(testSession({ yearId: 'y-2', yearName: '2025-2026' }));
      fixture.detectChanges();
      answer([{ holiday: 'Older', day: 'Thursday', date: '01-01-2025' }]);

      expect(rows()).toEqual([['Older', 'Thursday', '01-01-2025']]);
    });

    it('does not load again when the session changes in another way', () => {
      create();
      answer();

      TestBed.inject(AuthSession).start(testSession({ userName: 'OTHER' }));
      fixture.detectChanges();

      http.expectNone('admin/holidays');
    });
  });
});

@Component({ template: 'stub' })
class Stub {}

describe('HolidayListPage for a listed branch', () => {
  const notifications = { error: vi.fn() };

  async function open(...urls: string[]) {
    notifications.error.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Stub },
          { path: 'reports/branches', component: Stub },
          { path: 'reports/branches/:id/holidays', providers: [HolidayListService], component: HolidayListPage },
          { path: 'admin/holidays', providers: [HolidayListService], component: HolidayListPage },
          { path: 'admin/profile', component: Stub },
        ]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    TestBed.inject(Router).setUpLocationChangeListener();
    const harness = await RouterTestingHarness.create();
    for (const url of urls) await harness.navigateByUrl(url);
    const http = TestBed.inject(HttpTestingController);
    const el = () => harness.routeNativeElement as HTMLElement;
    return { harness, http, el, router: TestBed.inject(Router) };
  }

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const rowsOf = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('[data-slot="holiday-row"]')).map((r) => Array.from(r.children).map((c) => text(c)));

  async function settle(fixture: ComponentFixture<unknown>) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  }

  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  it('requests that branch, and heads the box with its name above its rows', async () => {
    const { harness, http, el } = await open('/reports/branches/b-2/holidays');

    http.expectNone('admin/holidays');
    http.expectOne('reports/branches/b-2/holidays').flush({
      branchCode: 'BLRAF',
      branchName: 'Bangalore',
      items: [{ holiday: 'Republic Day', day: 'Monday', date: '26-01-2026' }],
    });
    harness.detectChanges();

    expect(text(el().querySelector('h1'))).toBe('Holiday List');
    const header = el().querySelector('[data-slot="holiday-box"] [data-slot="holiday-branch"]');
    expect(text(header)).toBe('Bangalore');
    expect(el().querySelectorAll('[data-slot="holiday-branch"]')).toHaveLength(1);
    expect(rowsOf(el())).toEqual([['Republic Day', 'Monday', '26-01-2026']]);
  });

  it('has a Back button before the title that returns to the Branch List', async () => {
    const { harness, http, el, router } = await open('/reports/branches', '/reports/branches/b-2/holidays');
    http.expectOne('reports/branches/b-2/holidays').flush({ branchCode: 'BLRAF', branchName: 'Bangalore', items: [{ holiday: 'A', day: 'B', date: 'C' }] });
    harness.detectChanges();

    const back = el().querySelector<HTMLButtonElement>('button[aria-label="Back"]')!;
    expect(back.parentElement!.firstElementChild).toBe(back);
    expect(back.parentElement!.querySelector('h1')).not.toBeNull();
    back.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/reports/branches');
  });

  it('sets the header off from the page with a line, in both modes', async () => {
    const { harness, http, el } = await open('/reports/branches/b-2/holidays');
    http.expectOne('reports/branches/b-2/holidays').flush({ branchCode: 'BLRAF', branchName: 'Bangalore', items: [{ holiday: 'A', day: 'B', date: 'C' }] });
    harness.detectChanges();
    const rule = el().querySelector('[data-slot="page-rule"]')!;
    expect(rule.previousElementSibling!.querySelector('h1')).not.toBeNull();
    expect(rule.querySelector('hr')).not.toBeNull();

    await harness.navigateByUrl('/admin/holidays');
    http.expectOne('admin/holidays').flush({ branchCode: 'COKSF', branchName: 'Kochi Sea', items: [] });
    harness.detectChanges();
    expect(el().querySelector('[data-slot="page-rule"]')).not.toBeNull();
  });

  it("has a Back button on the user's own list too, which returns to the page the user came from", async () => {
    const { harness, http, el, router } = await open('/admin/profile', '/admin/holidays');
    http.expectOne('admin/holidays').flush({ branchCode: 'COKSF', branchName: 'Kochi Sea', items: [] });
    harness.detectChanges();

    const back = el().querySelector<HTMLButtonElement>('button[aria-label="Back"]')!;
    expect(back.parentElement!.firstElementChild).toBe(back);
    expect(text(back.parentElement!.querySelector('h1'))).toBe('Holiday List');
    back.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/admin/profile');
  });

  it("goes to the Dashboard from the user's own list when it was opened directly", async () => {
    const { harness, http, el, router } = await open('/admin/holidays');
    http.expectOne('admin/holidays').flush({ branchCode: 'COKSF', branchName: 'Kochi Sea', items: [] });
    harness.detectChanges();

    el().querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/');
  });

  it('goes to the Branch List when opened directly', async () => {
    const { harness, http, el, router } = await open('/reports/branches/b-2/holidays');
    http.expectOne('reports/branches/b-2/holidays').flush({ branchCode: 'BLRAF', branchName: 'Bangalore', items: [{ holiday: 'A', day: 'B', date: 'C' }] });
    harness.detectChanges();

    el().querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/reports/branches?menuId=NS-BRANCHLIST');
  });

  it('says Holiday List Not Found on 404, without a notification', async () => {
    const { harness, http, el } = await open('/reports/branches/b-other/holidays');

    http.expectOne('reports/branches/b-other/holidays').flush({ title: 'Holiday list not found.' }, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();

    expect(text(el().querySelector('[data-slot="not-found"]'))).toBe('Holiday List Not Found');
    expect(el().querySelector('[data-slot="holiday-branch"]')).toBeNull();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('reloads after a year switch, but not after a branch switch', async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
    const { harness, http } = await open('/reports/branches/b-2/holidays');
    http.expectOne('reports/branches/b-2/holidays').flush({ branchCode: 'BLRAF', branchName: 'Bangalore', items: [{ holiday: 'A', day: 'B', date: 'C' }] });

    TestBed.inject(AuthSession).start(testSession({ branchId: 'b-9', branchName: 'Chennai' }));
    harness.detectChanges();
    http.expectNone('reports/branches/b-2/holidays');

    TestBed.inject(AuthSession).start(testSession({ branchId: 'b-9', yearId: 'y-2' }));
    harness.detectChanges();
    http.expectOne('reports/branches/b-2/holidays').flush({ branchCode: 'BLRAF', branchName: 'Bangalore', items: [{ holiday: 'A', day: 'B', date: 'C' }] });
  });
});

