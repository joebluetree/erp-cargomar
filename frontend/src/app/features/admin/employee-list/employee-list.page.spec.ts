import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { AuthSession, SESSION_STORAGE_KEY } from '../../../core/auth/auth-session';
import { testSession } from '../../../core/auth/auth-session.testing';
import { Employee } from './employee-list.model';
import { EmployeeListPage } from './employee-list.page';
import { EmployeeListService } from './employee-list.service';

function employee(n: number, extra: Partial<Employee> = {}): Employee {
  const no = String(n).padStart(2, '0');
  return {
    id: `e-${no}`, code: `10${no}`, name: `Name ${no}`, fatherName: `Father ${no}`, dateOfBirth: '1990-03-05',
    address: `House ${n}, Road`, mobile: `98470000${no}`, email: `e${no}@mail.com`, ...extra,
  };
}

/** 23 employees, as the backend would hold them: ordered by name. */
const many = Array.from({ length: 23 }, (_, i) => employee(i + 1));

const isEmployeesRequest = (r: HttpRequest<unknown>) => r.url === 'admin/employees';

interface Sent {
  code: string | null;
  name: string | null;
  page: string | null;
  pageSize: string | null;
}

@Component({ template: 'stub' })
class Stub {}

describe('EmployeeListPage', () => {
  let fixture: ComponentFixture<EmployeeListPage>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let sent: Sent[];

  function create() {
    TestBed.configureTestingModule({
      imports: [EmployeeListPage],
      providers: [
        EmployeeListService,
        provideRouter([{ path: 'admin/employees/:id', component: Stub }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(EmployeeListPage);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement as HTMLElement;
    sent = [];
    fixture.detectChanges();
  }

  /** Plays the backend for the waiting request: filters (case-insensitive contains), pages and answers with the total. */
  function answer(all: Employee[] = many) {
    const req = http.expectOne(isEmployeesRequest);
    const p = req.request.params;
    sent.push({ code: p.get('code'), name: p.get('name'), page: p.get('page'), pageSize: p.get('pageSize') });
    const code = (p.get('code') ?? '').toLowerCase();
    const name = (p.get('name') ?? '').toLowerCase();
    const page = Number(p.get('page'));
    const size = Number(p.get('pageSize'));
    const matching = all.filter((e) => (e.code ?? '').toLowerCase().includes(code) && (e.name ?? '').toLowerCase().includes(name));
    req.flush({ items: matching.slice((page - 1) * size, page * size), total: matching.length, page, pageSize: size });
    fixture.detectChanges();
  }

  const rows = () => Array.from(el.querySelectorAll<HTMLElement>('tbody tr'));
  const cells = (row: Element) => Array.from(row.querySelectorAll('td')).map((td) => td.textContent?.trim());
  const firstCells = () => rows().map((r) => r.querySelector('td')?.textContent?.trim());
  const input = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;
  const header = (label: string) => Array.from(el.querySelectorAll<HTMLTableCellElement>('th')).find((th) => th.textContent?.trim() === label)!;
  const button = (name: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
  const searchButton = () => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Search')!;
  const range = () => el.querySelector('[aria-live]')?.textContent?.replace(/\s+/g, ' ').trim();
  const selected = () => rows().filter((r) => r.getAttribute('aria-selected') === 'true').map((r) => r.querySelector('td')?.textContent?.trim());
  const link = (n: number) => rows()[n].querySelector<HTMLAnchorElement>('a[data-slot="employee-link"]')!;

  function type(id: string, value: string) {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function search() {
    searchButton().click();
    fixture.detectChanges();
  }

  function press(target: HTMLElement, key: string) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  function leaveAndReturn() {
    sent = [];
    fixture.destroy();
    fixture = TestBed.createComponent(EmployeeListPage);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  describe('layout and columns', () => {
    it('shows the back button and title, the filters with Search, the Wrap text toggle, the table and the pager, in that order', () => {
      create();
      answer();

      const parts = [
        button('Back'),
        el.querySelector('h1')!,
        input('filter-code'),
        input('filter-name'),
        searchButton(),
        el.querySelector('app-table-wrap-toggle')!,
        el.querySelector('table')!,
        el.querySelector('app-table-pager')!,
      ];
      parts.forEach((part, i) => {
        if (i > 0) expect(parts[i - 1].compareDocumentPosition(part) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });
      expect(el.querySelector('h1')!.textContent?.trim()).toBe('Employee List');
      expect(el.querySelector('h1')!.getAttribute('data-slot')).toBe('page-title');
      expect(el.querySelector('app-table-toolbar')).not.toBeNull();
      expect(el.querySelector('label[for="filter-code"]')?.textContent?.trim()).toBe('Code');
      expect(el.querySelector('label[for="filter-name"]')?.textContent?.trim()).toBe('Name');
    });

    it('asks for page 1 of 10 with no filters', () => {
      create();
      answer();

      expect(sent).toEqual([{ code: null, name: null, page: '1', pageSize: '10' }]);
      expect(range()).toBe('Showing 1–10 of 23');
    });

    it('shows the seven columns in order and each row with its values, the date as dd-MM-yyyy', () => {
      create();
      answer([employee(1)]);

      const heads = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());
      expect(heads).toEqual(['Employee No', 'Employee Name', "Father's Name", 'Date of Birth', 'Address', 'Mobile No', 'Personal Email']);
      expect(cells(rows()[0])).toEqual(['1001', 'Name 01', 'Father 01', '05-03-1990', 'House 1, Road', '9847000001', 'e01@mail.com']);
    });

    it('shows a dash for every empty value', () => {
      create();
      answer([{ id: 'e-x', code: null, name: null, fatherName: null, dateOfBirth: null, address: null, mobile: '  ', email: null }]);

      expect(cells(rows()[0])).toEqual(['—', '—', '—', '—', '—', '—', '—']);
    });

    it('has no create, edit, save or delete control', () => {
      create();
      answer();

      const actions = Array.from(el.querySelectorAll('button:not(th button)')).map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim());
      expect(actions).toEqual(['Back', 'Search', 'Wrap text: on', 'First page', 'Previous page', 'Next page', 'Last page']);
    });

    it('is built from the shared table pieces and sets no colors of its own', () => {
      create();
      answer();

      expect(el.querySelector('table')!.getAttribute('data-slot')).toBe('table');
      expect(el.querySelector('th')!.getAttribute('data-slot')).toBe('table-head');
      expect(rows()[0].getAttribute('data-slot')).toBe('table-row');
      expect(rows()[0].querySelector('td')!.getAttribute('data-slot')).toBe('table-cell');
      const colorLiteral = /\b(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|teal|cyan|sky|blue|indigo|violet|purple|pink|rose|white|black)\b|#[0-9a-f]{3,8}\b/i;
      expect(colorLiteral.test(el.innerHTML)).toBe(false);
    });
  });

  describe('search, sorting and paging', () => {
    it('searches only when Search is pressed, from page 1 with the trimmed filters', () => {
      create();
      answer();
      button('Next page').click();
      fixture.detectChanges();
      answer();

      type('filter-name', ' name 1 ');
      type('filter-code', '10');
      http.expectNone(isEmployeesRequest);
      search();
      answer();

      expect(sent.at(-1)).toEqual({ code: '10', name: 'name 1', page: '1', pageSize: '10' });
      expect(firstCells()).toEqual(['1010', '1011', '1012', '1013', '1014', '1015', '1016', '1017', '1018', '1019']);
    });

    it('keeps the searched filters when paging, ignoring text typed since', () => {
      create();
      answer();
      type('filter-name', 'name');
      search();
      answer();
      type('filter-name', 'zzz');

      button('Next page').click();
      fixture.detectChanges();
      answer();

      expect(sent.at(-1)).toEqual({ code: null, name: 'name', page: '2', pageSize: '10' });
    });

    it('sorts the rows of the page shown, then reverses, without a request', () => {
      create();
      answer();

      header('Employee No').querySelector('button')!.click();
      header('Employee No').querySelector('button')!.click();
      fixture.detectChanges();

      http.expectNone(isEmployeesRequest);
      expect(header('Employee No').getAttribute('aria-sort')).toBe('descending');
      expect(firstCells()).toEqual(['1010', '1009', '1008', '1007', '1006', '1005', '1004', '1003', '1002', '1001']);
    });

    it('asks for page 1 with the new size when the page size changes', () => {
      create();
      answer();
      const select = el.querySelector<HTMLSelectElement>('#page-size')!;
      select.value = '5';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      answer();

      expect(sent.at(-1)).toEqual({ code: null, name: null, page: '1', pageSize: '5' });
      expect(rows()).toHaveLength(5);
    });
  });

  describe('empty, loading and error states', () => {
    it('shows a loading message and no table while waiting', () => {
      create();

      expect(el.querySelector('[role="status"]')?.textContent).toContain('Loading employees');
      expect(el.querySelector('table')).toBeNull();
      answer();
      expect(el.querySelector('[role="status"]')).toBeNull();
    });

    it('says there are no employees, or that none match the searched filters', () => {
      create();
      answer([]);
      expect(rows()[0].textContent?.trim()).toBe('There are no employees.');

      type('filter-name', 'zzz');
      search();
      answer();
      expect(rows()[0].textContent?.trim()).toBe('No employees match the filters.');
    });

    it('shows an alert with Retry, which repeats the same request', () => {
      create();
      http.expectOne(isEmployeesRequest).flush(null, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      const alert = el.querySelector('[role="alert"]')!;
      expect(alert.textContent).toContain('The employees could not be loaded.');
      Array.from(alert.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Retry')!.click();
      fixture.detectChanges();
      answer();

      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(rows()).toHaveLength(10);
    });
  });

  describe('row selection and the code link', () => {
    it('selects a clicked row, clears it on a second click, and selects with Enter and Space', () => {
      create();
      answer();

      rows()[1].click();
      fixture.detectChanges();
      expect(selected()).toEqual(['1002']);
      expect(rows()[1].getAttribute('data-state')).toBe('selected');

      rows()[1].click();
      fixture.detectChanges();
      expect(selected()).toEqual([]);

      press(rows()[2], 'Enter');
      expect(selected()).toEqual(['1003']);
      const space = press(rows()[2], ' ');
      expect(selected()).toEqual([]);
      expect(space.defaultPrevented).toBe(true);
    });

    it('makes each code a link to that employee\'s profile', () => {
      create();
      answer();

      expect(link(0).getAttribute('href')).toBe('/admin/employees/e-01');
      expect(link(0).textContent?.trim()).toBe('1001');
      expect(rows().every((r) => r.querySelectorAll('a').length === 1)).toBe(true);
    });

    it('opens the profile on a click without changing the selection', async () => {
      create();
      answer();
      rows()[2].click();
      fixture.detectChanges();

      link(0).click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(TestBed.inject(Router).url).toBe('/admin/employees/e-01');
      expect(selected()).toEqual(['1003']);
    });

    it('opens the profile from a click anywhere in the Employee No cell, without changing the selection', async () => {
      create();
      answer();
      rows()[2].click();
      fixture.detectChanges();

      const cell = rows()[1].querySelector<HTMLElement>('[data-employee-code-cell]')!;
      expect(cell.classList).toContain('cursor-pointer');
      cell.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(TestBed.inject(Router).url).toBe('/admin/employees/e-02');
      expect(selected()).toEqual(['1003']);
    });

    it('opens only one profile when the link itself is clicked', async () => {
      create();
      answer();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

      link(0).click();
      await fixture.whenStable();

      expect(navigate).not.toHaveBeenCalled(); // the link navigates itself; the cell does not repeat it
      expect(TestBed.inject(Router).url).toBe('/admin/employees/e-01');
    });

    it('still selects the row from the other cells', () => {
      create();
      answer();

      (rows()[1].querySelectorAll('td')[1] as HTMLElement).click();
      fixture.detectChanges();

      expect(selected()).toEqual(['1002']);
    });

    it('keeps Enter on the link from selecting the row', () => {
      create();
      answer();

      press(link(0), 'Enter');

      expect(selected()).toEqual([]);
    });
  });

  describe('remembered state', () => {
    it('brings back the filters, page, page size, sort, Wrap text and selected row', () => {
      create();
      answer();
      type('filter-name', 'name');
      search();
      answer();
      const select = el.querySelector<HTMLSelectElement>('#page-size')!;
      select.value = '5';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      answer();
      button('Next page').click();
      fixture.detectChanges();
      answer();
      header('Employee No').querySelector('button')!.click();
      header('Employee No').querySelector('button')!.click();
      fixture.detectChanges();
      rows()[0].click();
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Wrap text'))!.click();
      fixture.detectChanges();

      leaveAndReturn();
      answer();

      expect(sent).toEqual([{ code: null, name: 'name', page: '2', pageSize: '5' }]);
      expect(input('filter-name').value).toBe('name');
      expect(range()).toBe('Showing 6–10 of 23');
      expect(header('Employee No').getAttribute('aria-sort')).toBe('descending');
      expect(firstCells()).toEqual(['1010', '1009', '1008', '1007', '1006']);
      expect(selected()).toEqual(['1010']);
      expect(Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Wrap text'))!.textContent?.trim()).toBe('Wrap text: off');
    });
  });

  describe('branch switch', () => {
    it('shows page 1 of the new branch\'s employees, keeping the searched filters', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answer();
      type('filter-name', 'name');
      search();
      answer();
      button('Next page').click();
      fixture.detectChanges();
      answer();

      TestBed.inject(AuthSession).start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
      fixture.detectChanges();
      answer(many.slice(0, 3));

      expect(sent.at(-1)).toEqual({ code: null, name: 'name', page: '1', pageSize: '10' });
      expect(rows()).toHaveLength(3);
    });

    it('sends no request when the session changes without a branch change', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answer();

      TestBed.inject(AuthSession).start(testSession({ yearId: 'y-2' }));
      fixture.detectChanges();

      http.expectNone(isEmployeesRequest);
    });
  });
});

describe('EmployeeListPage back button', () => {
  async function open(...urls: string[]) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Stub },
          { path: 'other', component: Stub },
          { path: 'employees', providers: [EmployeeListService], component: EmployeeListPage },
        ]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(Router).setUpLocationChangeListener();
    const harness = await RouterTestingHarness.create();
    for (const url of urls) await harness.navigateByUrl(url);
    TestBed.inject(HttpTestingController)
      .match(isEmployeesRequest)
      .forEach((r) => r.flush({ items: [], total: 0, page: 1, pageSize: 10 }));
    harness.detectChanges();
    const back = (harness.routeNativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-label="Back"]')!;
    return { harness, back, router: TestBed.inject(Router) };
  }

  async function settle(fixture: ComponentFixture<unknown>) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  }

  it('returns to the page the user came from', async () => {
    const { harness, back, router } = await open('/', '/other', '/employees');

    back.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/other');
  });

  it('opens the Dashboard when the page was opened directly', async () => {
    const { harness, back, router } = await open('/employees');

    back.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/');
  });
});
