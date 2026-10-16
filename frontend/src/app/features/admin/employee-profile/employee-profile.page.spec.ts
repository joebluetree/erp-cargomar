import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { NotificationService } from '../../../core/notifications/notification.service';
import { EMPTY_VALUE, EmployeeProfile, addressLines, formatDate, initialsOf, profileSections } from './employee-profile.model';
import { EmployeeProfilePage } from './employee-profile.page';
import { EmployeeProfileService } from './employee-profile.service';
import { PROFILE } from './employee-profile.testing';

describe('EmployeeProfilePage', () => {
  let fixture: ComponentFixture<EmployeeProfilePage>;
  let http: HttpTestingController;
  let el: HTMLElement;

  function create() {
    TestBed.configureTestingModule({
      imports: [EmployeeProfilePage],
      providers: [
        EmployeeProfileService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { error: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(EmployeeProfilePage);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  function answer(profile: EmployeeProfile = PROFILE) {
    http.expectOne('admin/profile').flush(profile);
    fixture.detectChanges();
  }

  function fail(status: number) {
    http.expectOne('admin/profile').flush({ status }, { status, statusText: 'x' });
    fixture.detectChanges();
  }

  const sections = () => Array.from(el.querySelectorAll<HTMLElement>('[data-slot="profile-section"]'));
  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const titleOf = (section: Element) => text(section.querySelector('h2'));
  /** One box by its heading; the first box, which has none, is `BASIC`. */
  const BASIC = '';
  const box = (title: string) => sections().find((s) => titleOf(s) === title)!;
  /** One side of the Address box by its sub-heading. */
  const part = (title: string) =>
    Array.from(box('Address').querySelectorAll('[data-slot="address-part"]')).find((p) => text(p.querySelector('h3')) === title)!;
  /** The label-value rows of a box or part, as [label, value] pairs. */
  const rowsOf = (scope: Element) =>
    Array.from(scope.querySelectorAll('dl > div')).map((d) => [text(d.querySelector('dt')), text(d.querySelector('dd'))]);
  const valueOf = (scope: Element, label: string) => rowsOf(scope).find(([l]) => l === label)?.[1];

  it('loads the profile on open and shows a loading message meanwhile, without boxes', () => {
    create();

    expect(text(el.querySelector('[role="status"]'))).toContain('Loading profile');
    expect(sections()).toEqual([]);
    answer();
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('puts the boxes in rows when they fit: basic, Contact and Bank first; Address and IDs below', () => {
    create();
    answer();

    expect(text(el.querySelector('h1'))).toBe('Profile');
    const grid = el.querySelector('[data-slot="profile-columns"]')!;
    expect(grid.getAttribute('data-layout')).toBe('rows');
    expect(['grid', 'w-max', 'grid-cols-[max-content_max-content_max-content]'].every((c) => grid.classList.contains(c))).toBe(true);
    // One grid holding the boxes directly, in stacked order, so boxes on a row share its height (rows place them explicitly).
    expect(Array.from(grid.children)).toEqual(sections());
    expect(sections().map(titleOf)).toEqual([BASIC, 'Address', 'Contact Details', 'Bank Details', 'ID and Documents']);
    const classesOf = (title: string) => (title === BASIC ? sections()[0] : box(title)).className.split(' ');
    expect(classesOf(BASIC)).toEqual(expect.arrayContaining(['col-start-1', 'row-start-1']));
    expect(classesOf('Contact Details')).toEqual(expect.arrayContaining(['col-start-2', 'row-start-1']));
    expect(classesOf('Bank Details')).toEqual(expect.arrayContaining(['col-start-3', 'row-start-1']));
    expect(classesOf('Address')).toEqual(expect.arrayContaining(['col-start-1', 'row-start-2']));
    expect(classesOf('ID and Documents')).toEqual(expect.arrayContaining(['col-[2/span_2]', 'row-start-2', 'max-w-none']));
    // Nothing aligns to the start, so every box stretches to its row's height.
    expect(sections().some((s) => /self-start/.test(s.className))).toBe(false);
  });

  describe('when the boxes do not fit', () => {
    /** A stand-in for the browser's ResizeObserver: the test sets the sizes and calls `resize()`. */
    class FakeResizeObserver {
      static instances: FakeResizeObserver[] = [];
      readonly disconnect = vi.fn();
      constructor(private readonly callback: () => void) {
        FakeResizeObserver.instances.push(this);
      }
      observe(): void {}
      resize(): void {
        this.callback();
      }
    }

    beforeEach(() => {
      FakeResizeObserver.instances = [];
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      // The page measures in the next animation frame; here the frame runs at once.
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });
    afterEach(() => vi.unstubAllGlobals());

    /** Sets the space available (host) and the grid's width, then lets the observer report a resize. */
    function resizeTo(available: number, gridWidth: number) {
      const host = el.querySelector<HTMLElement>('[data-slot="profile-host"]')!;
      const grid = el.querySelector<HTMLElement>('[data-slot="profile-columns"]')!;
      host.getBoundingClientRect = () => ({ width: available }) as DOMRect;
      grid.getBoundingClientRect = () => ({ width: gridWidth }) as DOMRect;
      FakeResizeObserver.instances.at(-1)!.resize();
      fixture.detectChanges();
    }

    const layout = () => el.querySelector('[data-slot="profile-columns"]')!.getAttribute('data-layout');

    it('stacks all boxes at full width (basic, Address, Contact, Bank, IDs), and puts them back in rows when they fit again', () => {
      create();
      answer();
      fixture.detectChanges();
      expect(FakeResizeObserver.instances).toHaveLength(1);

      // The boxes need 1500px in rows; only 1000px is available.
      resizeTo(1000, 1500);
      expect(layout()).toBe('stacked');
      const grid = el.querySelector('[data-slot="profile-columns"]')!;
      expect(['w-full', 'grid-cols-1'].every((c) => grid.classList.contains(c))).toBe(true);
      expect(grid.classList.contains('grid-cols-[max-content_max-content_max-content]')).toBe(false);
      expect(sections().map(titleOf)).toEqual([BASIC, 'Address', 'Contact Details', 'Bank Details', 'ID and Documents']);
      expect(sections().some((s) => /(col|row)-start|col-\[|max-w-/.test(s.className))).toBe(false);
      expect(sections().every((s) => s.classList.contains('w-full'))).toBe(true);

      // Still too narrow (the remembered row width is used while stacked).
      resizeTo(1400, 1000);
      expect(layout()).toBe('stacked');

      // Wide enough again: back in rows.
      resizeTo(1600, 1000);
      expect(layout()).toBe('rows');
      expect(box('Contact Details').classList.contains('col-start-2')).toBe(true);
    });

    it('stays in rows while the boxes fit', () => {
      create();
      answer();
      fixture.detectChanges();

      resizeTo(1500, 1500);
      expect(layout()).toBe('rows');
    });

    it('stops watching the sizes when the page goes away', () => {
      create();
      answer();
      fixture.detectChanges();
      const observer = FakeResizeObserver.instances.at(-1)!;

      fixture.destroy();
      expect(observer.disconnect).toHaveBeenCalled();
    });
  });

  it('puts tinted rounded boxes directly on the page, with no backdrop', () => {
    create();
    answer();

    expect(el.querySelector('[data-slot="profile-backdrop"], [class*="bg-profile-backdrop"]')).toBeNull();
    const style = ['bg-profile-box', 'w-full', 'rounded-2xl', 'shadow-md', 'ring-0'];
    expect(sections().every((s) => style.every((c) => s.classList.contains(c)))).toBe(true);
    // In rows a box is at most 48rem wide, except ID and Documents, which fills the width of Contact and Bank.
    expect(sections().map((s) => s.classList.contains('max-w-[48rem]'))).toEqual([true, true, true, true, false]); // IDs is last
    // Sized by their column, not by themselves: no box shrinks to its own content inside the column.
    expect(sections().some((s) => s.classList.contains('sm:w-fit'))).toBe(false);
  });

  it('shows one Address box with Current on the left and Permanent on the right, each with its rows', () => {
    create();
    answer();

    const parts = box('Address').querySelector('[data-slot="address-parts"]')!;
    expect(parts.classList.contains('sm:grid-cols-2')).toBe(true);
    expect(Array.from(parts.querySelectorAll('h3')).map((h) => text(h))).toEqual(['Current', 'Permanent']);
    expect(rowsOf(part('Current'))).toEqual([
      ['Address', 'House 1 Road 2 Area 3 P.O. PO 1'],
      ['City', 'Kochi'],
      ['State', 'KERALA'],
      ['PIN Code', '682001'],
      ['Country', 'INDIA'],
    ]);
    expect(rowsOf(part('Permanent')).map(([label]) => label)).toEqual(['Address', 'City', 'State', 'PIN Code', 'Country']);
    // The address lines are under one label, one per line.
    const address = part('Current').querySelector('dd')!;
    expect(address.textContent).toBe('House 1\nRoad 2\nArea 3\nP.O. PO 1');
    expect(address.classList.contains('whitespace-pre-line')).toBe(true);
  });

  it('shows every headed box as label-value rows', () => {
    create();
    answer();

    const lists = sections().slice(1).flatMap((s) => Array.from(s.querySelectorAll('dl')));
    expect(lists.length).toBe(5); // Address (2 parts), Bank, Contact, IDs
    expect(lists.every((dl) => dl.classList.contains('grid-cols-[auto_1fr]'))).toBe(true);
    expect(rowsOf(box('Bank Details'))).toEqual([
      ['Bank A/C No', '123456789'],
      ['Bank Name', 'SBI'],
      ['Branch', 'Kochi'],
      ['IFSC Code', 'SBIN0000001'],
    ]);
    expect(rowsOf(box('Contact Details'))).toEqual([
      ['Mobile', '9876543210'],
      ['Email', 'asha@example.com'],
    ]);
    expect(rowsOf(box('ID and Documents')).map(([label]) => label)).toEqual(['Aadhaar', 'PAN', 'PF', 'ESI No', 'UAN']);
    expect(Array.from(el.querySelectorAll('dd')).every((d) => d.classList.contains('max-w-[18rem]'))).toBe(true);
    // Labels stay on one line; long values (an email) may break anywhere instead of being cut off by the box.
    expect(Array.from(el.querySelectorAll('dt')).every((d) => d.classList.contains('whitespace-nowrap'))).toBe(true);
    expect(Array.from(el.querySelectorAll('dd')).every((d) => d.classList.contains('[overflow-wrap:anywhere]'))).toBe(true);
  });

  it('shows a big image column on the left and the name with label-value rows on the right, without a heading', () => {
    create();
    answer();

    const first = sections()[0];
    expect(first.querySelector('h2, [data-slot="card-header"]')).toBeNull();
    expect(first.getAttribute('aria-label')).toBe('Asha Nair');
    const summary = first.querySelector('[data-slot="profile-summary"]')!;
    expect(summary.classList.contains('md:grid-cols-[auto_1fr]')).toBe(true);
    const [image, details] = Array.from(summary.children);
    expect(image.tagName.toLowerCase()).toBe('hlm-avatar');
    expect(image.classList.contains('md:size-48')).toBe(true);
    expect(text(image.querySelector('[data-slot="avatar-fallback"]'))).toBe('AN');
    expect(text(details.querySelector('[data-slot="employee-name"]'))).toBe('Asha Nair');
    const rows = details.querySelector('[data-slot="basic-rows"]')!;
    expect(rows.classList.contains('grid-cols-[auto_1fr]')).toBe(true);
    expect(rowsOf(rows)).toEqual([
      ['Employee Code', 'EMP01'],
      ["Father's Name", 'Ravi Nair'],
      ['Spouse Name', '—'],
      ['Marital Status', 'MARRIED'],
      ['Date of Birth', '05-03-1990'],
    ]);
  });

  it('uses the reference colours for headings and labels, and plain text for values', () => {
    create();
    answer();

    const headings = Array.from(el.querySelectorAll('h2, h3'));
    expect(headings).toHaveLength(6); // four boxes and the two Address sides
    expect(headings.every((h) => h.classList.contains('text-profile-heading'))).toBe(true);
    expect(el.querySelector('[data-slot="employee-name"]')!.classList.contains('text-profile-heading')).toBe(true);
    // Every label is blue, the basic box's rows too.
    const basicLabels = Array.from(sections()[0].querySelectorAll('dt'));
    expect(basicLabels.every((l) => l.classList.contains('text-profile-label'))).toBe(true);
    const otherLabels = sections().slice(1).flatMap((s) => Array.from(s.querySelectorAll('dt')));
    expect(otherLabels.every((l) => l.classList.contains('text-profile-label'))).toBe(true);
    expect(Array.from(el.querySelectorAll('dd')).some((d) => /text-profile/.test(d.className))).toBe(false);
    expect(el.querySelector('h1')!.className).not.toContain('text-profile');
  });

  it('shows the values, the date of birth as day-month-year and the place names', () => {
    create();
    answer();

    expect(valueOf(sections()[0], "Father's Name")).toBe('Ravi Nair');
    expect(valueOf(sections()[0], 'Date of Birth')).toBe('05-03-1990');
    expect([valueOf(part('Current'), 'State'), valueOf(part('Current'), 'Country')]).toEqual(['KERALA', 'INDIA']);
    expect(valueOf(part('Permanent'), 'City')).toBe('Chennai');
    expect(valueOf(box('ID and Documents'), 'PAN')).toBe('ABCDE1234F');
    expect(valueOf(box('ID and Documents'), 'ESI No')).toBe('ESI-1');
  });

  it('shows the email in lower case', () => {
    create();
    answer({ ...PROFILE, email: 'VSPRADEEP1973@GMAIL.COM' });

    expect(valueOf(box('Contact Details'), 'Email')).toBe('vspradeep1973@gmail.com');
  });

  it('shows a dash for an empty value, and leaves empty address lines out', () => {
    create();
    answer({
      ...PROFILE,
      dateOfBirth: null,
      mobile: '  ',
      currentAddress: { ...PROFILE.currentAddress, address3: null, poBox: ' ' },
      permanentAddress: { ...PROFILE.permanentAddress, address1: null, address2: null, address3: null, poBox: null },
    });

    expect(valueOf(sections()[0], 'Spouse Name')).toBe('—');
    expect(valueOf(sections()[0], 'Date of Birth')).toBe('—');
    expect(valueOf(box('Contact Details'), 'Mobile')).toBe('—');
    expect(valueOf(box('Contact Details'), 'Email')).toBe('asha@example.com');
    expect(part('Current').querySelector('dd')!.textContent).toBe('House 1\nRoad 2');
    expect(valueOf(part('Permanent'), 'Address')).toBe('—');
  });

  describe('the photo in the image area', () => {
    beforeEach(() => {
      // A subclass, not a plain object: the page's Location needs URL to stay a constructor.
      vi.stubGlobal('URL', class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:photo-1');
        static override revokeObjectURL = vi.fn();
      });
    });
    afterEach(() => vi.unstubAllGlobals());

    const avatar = () => sections()[0].querySelector('hlm-avatar')!;

    it('shows the initials and asks for no photo when there is none', () => {
      create();
      answer();

      http.expectNone('admin/profile/photo');
      expect(avatar().querySelector('img')).toBeNull();
      expect(text(avatar().querySelector('[data-slot="avatar-fallback"]'))).toBe('AN');
    });

    it('puts the loaded photo in the circle, with the initials as the fallback', () => {
      create();
      answer({ ...PROFILE, hasPhoto: true });
      http.expectOne('admin/profile/photo').flush(new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' }));
      fixture.detectChanges();

      // The avatar keeps the image out of the page until the browser has loaded it, showing the initials meanwhile.
      // The test browser never loads images, so the image's load is reported through the avatar's own image query.
      expect(text(avatar().querySelector('[data-slot="avatar-fallback"]'))).toBe('AN');
      const image = fixture.debugElement.query(By.css('hlm-avatar')).componentInstance._image();
      expect(image).toBeTruthy();
      image._onLoad();
      fixture.detectChanges();

      const img = avatar().querySelector<HTMLImageElement>('img[data-slot="avatar-image"]')!;
      expect(img.getAttribute('src')).toBe('blob:photo-1');
      expect(img.getAttribute('alt')).toBe('Photo of Asha Nair');
      // The whole photo is shown (not cropped to fill the circle), on the photos' white background.
      expect(img.classList.contains('object-contain')).toBe(true);
      expect(img.classList.contains('object-cover')).toBe(false);
      expect(img.classList.contains('bg-profile-photo')).toBe(true);
      expect(avatar().querySelector('[data-slot="avatar-fallback"]')).toBeNull();
    });

    it('keeps the initials when the photo fails, without a notification', () => {
      create();
      answer({ ...PROFILE, hasPhoto: true });
      http.expectOne('admin/profile/photo').flush(new Blob(), { status: 500, statusText: 'x' });
      fixture.detectChanges();

      expect(avatar().querySelector('img')).toBeNull();
      expect(text(avatar().querySelector('[data-slot="avatar-fallback"]'))).toBe('AN');
      expect(TestBed.inject(NotificationService).error).not.toHaveBeenCalled();
    });

    it('frees the photo when the page goes away', () => {
      create();
      answer({ ...PROFILE, hasPhoto: true });
      http.expectOne('admin/profile/photo').flush(new Blob());
      fixture.detectChanges();

      fixture.destroy();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo-1');
    });
  });

  it('is view only: no inputs and no edit, save or delete buttons', () => {
    create();
    answer();

    expect(el.querySelectorAll('input, textarea, select').length).toBe(0);
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('says no employee profile is linked on 404', () => {
    create();
    fail(404);

    expect(text(el.querySelector('[data-slot="not-linked"]'))).toBe('No employee profile is linked to your user.');
    expect(sections()).toEqual([]);
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows an alert with Retry when the load fails, and Retry loads again', () => {
    create();
    fail(500);

    const alert = el.querySelector('[role="alert"]')!;
    expect(text(alert)).toContain('The profile could not be loaded.');
    alert.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    answer();
    expect(sections().length).toBe(5);
  });
});

@Component({ template: 'stub' })
class Stub {}

describe('EmployeeProfilePage for a listed employee', () => {
  async function open(...urls: string[]) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Stub },
          { path: 'admin/employees', component: Stub },
          { path: 'admin/employees/:id', providers: [EmployeeProfileService], component: EmployeeProfilePage },
        ]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { error: vi.fn() } },
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

  async function settle(fixture: ComponentFixture<unknown>) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  }

  it('requests that employee and its photo, and shows the profile boxes under Employee Profile', async () => {
    const { harness, http, el } = await open('/admin/employees/e-9');

    http.expectNone('admin/profile');
    http.expectOne('admin/employees/e-9').flush({ ...PROFILE, hasPhoto: true });
    http.expectOne('admin/employees/e-9/photo').flush(new Blob());
    harness.detectChanges();

    expect(text(el().querySelector('h1'))).toBe('Employee Profile');
    expect(text(el().querySelector('[data-slot="employee-name"]'))).toBe('Asha Nair');
    expect(el().querySelectorAll('[data-slot="profile-section"]').length).toBe(5);
  });

  it('has a Back button before the title that returns to the list', async () => {
    const { harness, http, el, router } = await open('/admin/employees', '/admin/employees/e-9');
    http.expectOne('admin/employees/e-9').flush(PROFILE);
    harness.detectChanges();

    const back = el().querySelector<HTMLButtonElement>('button[aria-label="Back"]')!;
    expect(back.parentElement!.firstElementChild).toBe(back);
    expect(back.parentElement!.querySelector('h1')).not.toBeNull();
    back.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/admin/employees');
  });

  it('goes to the list when opened directly', async () => {
    const { harness, http, el, router } = await open('/admin/employees/e-9');
    http.expectOne('admin/employees/e-9').flush(PROFILE);
    harness.detectChanges();

    el().querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/admin/employees');
  });

  it('says "Employee not found." on 404, without a notification or an alert', async () => {
    const { harness, http, el } = await open('/admin/employees/e-other');

    http.expectOne('admin/employees/e-other').flush({ title: 'Employee not found.' }, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();

    expect(text(el().querySelector('[data-slot="not-linked"]'))).toBe('Employee not found.');
    expect(el().querySelector('[role="alert"]')).toBeNull();
    expect(TestBed.inject(NotificationService).error).not.toHaveBeenCalled();
  });
});

describe('profile formatting', () => {
  it('takes the initials of the first and last words', () => {
    expect(initialsOf('Asha Nair')).toBe('AN');
    expect(initialsOf('  asha   k  nair ')).toBe('AN');
    expect(initialsOf('Asha')).toBe('A');
    expect(initialsOf('')).toBe('?');
    expect(initialsOf(null)).toBe('?');
  });

  it('formats a date-only value as dd-MM-yyyy without a time zone shift', () => {
    expect(formatDate('1990-03-05')).toBe('05-03-1990');
    expect(formatDate('2000-12-31')).toBe('31-12-2000');
    expect(formatDate(null)).toBeNull();
    expect(formatDate('not a date')).toBeNull();
  });

  it('joins the address lines and the P.O. one per line, leaving empty ones out', () => {
    const empty = { address1: null, address2: null, address3: null, city: null, state: null, pin: null, poBox: null, country: null };

    expect(addressLines({ ...empty, address1: ' House 1 ', address2: 'Road 2', address3: 'Area 3', poBox: 'PO 1' })).toBe(
      'House 1\nRoad 2\nArea 3\nP.O. PO 1',
    );
    expect(addressLines({ ...empty, address1: 'House 1', address2: '  ', poBox: 'PO 1' })).toBe('House 1\nP.O. PO 1');
    expect(addressLines({ ...empty, poBox: 'PO 1' })).toBe('P.O. PO 1');
    expect(addressLines({ ...empty, city: 'Kochi' })).toBe(EMPTY_VALUE);
  });

  it('builds five boxes in screen order, with the Address box holding Current and Permanent', () => {
    const sections = profileSections(PROFILE);

    expect(sections.map((s) => s.title)).toEqual(['', 'Address', 'Contact Details', 'Bank Details', 'ID and Documents']);
    const address = sections[1];
    expect(address.fields).toEqual([]);
    expect(address.parts!.map((p) => p.title)).toEqual(['Current', 'Permanent']);
    expect(address.parts!.map((p) => p.fields.map((f) => f.label))).toEqual([
      ['Address', 'City', 'State', 'PIN Code', 'Country'],
      ['Address', 'City', 'State', 'PIN Code', 'Country'],
    ]);
    expect(address.parts![1].fields[0].value).toBe('Home 1\nHome 2\nHome 3\nP.O. PO 2');
  });
});
