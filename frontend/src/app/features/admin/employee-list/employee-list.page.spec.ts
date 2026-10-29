import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { MenuRights } from '../../../core/navigation/menu.model';
import { MenuRightsStore } from '../../../core/navigation/menu-rights.store';
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
    address: `House ${n}, Road`, mobile: `98470000${no}`, email: `e${no}@mail.com`, branch: 'Kochi', ...extra,
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

/** Five employees, of whom the last two (ids r-04, r-05) are relieved, for the status filter. */
const relievedIds = new Set(['r-04', 'r-05']);
const mixed = [employee(1), employee(2), employee(3), employee(4, { id: 'r-04' }), employee(5, { id: 'r-05' })];

@Component({ template: 'stub' })
class Stub {}

describe('EmployeeListPage', () => {
  let fixture: ComponentFixture<EmployeeListPage>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let sent: Sent[];
  /** The `status` of each request answered, in order. */
  let statuses: (string | null)[];
  /** The `branch` of each request answered, in order (null when it was left out). */
  let branches: (string | null)[];

  /** `profileView`: the Profile's view right, as the screen guard loads it with the list. */
  function create(profileView = true) {
    TestBed.configureTestingModule({
      imports: [EmployeeListPage],
      providers: [
        EmployeeListService,
        provideRouter([{ path: 'admin/employees/:id', component: Stub }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const rights: MenuRights = { view: profileView, add: false, edit: false, delete: false, print: false, email: false, docs: false, docsUpload: false, admin: false };
    TestBed.inject(MenuRightsStore).set('NS-EMPPROFILE', rights);
    fixture = TestBed.createComponent(EmployeeListPage);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement as HTMLElement;
    sent = [];
    statuses = [];
    branches = [];
    fixture.detectChanges();
  }

  /** Plays the backend for the waiting request: filters (case-insensitive contains), pages and answers with the total. */
  function answer(all: Employee[] = many) {
    const req = http.expectOne(isEmployeesRequest);
    const p = req.request.params;
    sent.push({ code: p.get('code'), name: p.get('name'), page: p.get('page'), pageSize: p.get('pageSize') });
    statuses.push(p.get('status'));
    branches.push(p.get('branch'));
    const code = (p.get('code') ?? '').toLowerCase();
    const name = (p.get('name') ?? '').toLowerCase();
    const status = p.get('status');
    const page = Number(p.get('page'));
    const size = Number(p.get('pageSize'));
    const matching = all.filter(
      (e) =>
        (e.code ?? '').toLowerCase().includes(code) &&
        (e.name ?? '').toLowerCase().includes(name) &&
        (status === 'all' || (status === 'relieved') === relievedIds.has(e.id)),
    );
    req.flush({ items: matching.slice((page - 1) * size, page * size), total: matching.length, page, pageSize: size });
    fixture.detectChanges();
  }

  const rows = () => Array.from(el.querySelectorAll<HTMLElement>('tbody tr'));
  const cells = (row: Element) => Array.from(row.querySelectorAll('td')).map((td) => td.textContent?.trim());
  /** The Emp. No of each row (the first cell after the Profile column). */
  const firstCells = () => rows().map((r) => codeCell(r).textContent?.trim());
  const input = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;
  const header = (label: string) => Array.from(el.querySelectorAll<HTMLTableCellElement>('th')).find((th) => th.textContent?.trim() === label)!;
  const button = (name: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
  const searchButton = () => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Search')!;
  const range = () => el.querySelector('[aria-live]')?.textContent?.replace(/\s+/g, ' ').trim();
  /** The Emp. No cell of a row: the first cell after the Profile column. */
  const codeCell = (row: Element) => row.querySelector<HTMLElement>('td:not([data-employee-profile-cell])')!;
  const selected = () => rows().filter((r) => r.getAttribute('aria-selected') === 'true').map((r) => codeCell(r).textContent?.trim());

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

  const statusTrigger = () => el.querySelector<HTMLButtonElement>('#filter-status')!;

  async function settle() {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
  }

  /** Opens the Status dropdown and picks the option with this label. */
  async function chooseStatus(label: string) {
    statusTrigger().click();
    await settle();
    Array.from(document.querySelectorAll<HTMLElement>('hlm-select-item')).find((i) => i.textContent?.trim() === label)!.click();
    await settle();
  }

  function leaveAndReturn() {
    sent = [];
    statuses = [];
    branches = [];
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
        el.querySelector<HTMLButtonElement>('#filter-branch')!,
        statusTrigger(),
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
      expect(el.querySelector('label[for="filter-code"]')?.textContent?.trim()).toBe('Emp. No');
      expect(el.querySelector('label[for="filter-name"]')?.textContent?.trim()).toBe('Name');
      expect(el.querySelector('label[for="filter-status"]')?.textContent?.trim()).toBe('Status');
    });

    it('asks for page 1 of 10 with no filters', () => {
      create();
      answer();

      expect(sent).toEqual([{ code: null, name: null, page: '1', pageSize: '10' }]);
      expect(range()).toBe('Showing 1–10 of 23');
    });

    it('shows the Profile column first, then the eight columns in order, Branch last, and each row with its values, the date as dd-MM-yyyy', () => {
      create();
      answer([employee(1)]);

      const heads = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());
      expect(heads).toEqual(['Profile', 'Emp. No', 'Emp. Name', "Father's Name", 'DOB', 'Address', 'Mobile', 'Email', 'Branch']);
      // The Profile cell holds only the icon, so it has no text.
      expect(cells(rows()[0])).toEqual(['', '1001', 'Name 01', 'Father 01', '05-03-1990', 'House 1, Road', '9847000001', 'e01@mail.com', 'Kochi']);
    });

    it('keeps the DOB on one line with wrap text on, and lets the other columns wrap', () => {
      create();
      answer([employee(1)]);

      const nowrap = Array.from(rows()[0].querySelectorAll('td')).map((td) => td.classList.contains('group-data-[wrap=true]:whitespace-nowrap'));
      expect(nowrap).toEqual([false, false, false, false, true, false, false, false, false]);
    });

    it('shows the Email in lower case', () => {
      create();
      answer([{ ...employee(1), email: ' VSPradeep1973@GMAIL.COM ' }]);

      expect(cells(rows()[0]).at(-2)).toBe('vspradeep1973@gmail.com');
    });

    it('shows a dash for every empty value', () => {
      create();
      answer([{ id: 'e-x', code: null, name: null, fatherName: null, dateOfBirth: null, address: null, mobile: '  ', email: null, branch: null }]);

      expect(cells(rows()[0]).slice(1)).toEqual(['—', '—', '—', '—', '—', '—', '—', '—']);
    });

    it('has no create, edit, save or delete control', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answer();

      const actions = Array.from(el.querySelectorAll('button:not(th button)')).map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim());
      // The Status and Branch dropdowns' triggers are buttons showing the chosen status and branch.
      expect(actions).toEqual(['Back', 'Kochi', 'Active', 'Search', 'Wrap text: on', 'First page', 'Previous page', 'Next page', 'Last page']);
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

      header('Emp. No').querySelector('button')!.click();
      header('Emp. No').querySelector('button')!.click();
      fixture.detectChanges();

      http.expectNone(isEmployeesRequest);
      expect(header('Emp. No').getAttribute('aria-sort')).toBe('descending');
      expect(firstCells()).toEqual(['1010', '1009', '1008', '1007', '1006', '1005', '1004', '1003', '1002', '1001']);
    });

    it('sorts from a click anywhere in the header cell, and once from a click on its button', () => {
      create();
      answer();

      header('Emp. No').click();
      fixture.detectChanges();
      expect(header('Emp. No').getAttribute('aria-sort')).toBe('ascending');
      expect(header('Emp. No').classList).toContain('cursor-pointer');

      header('Emp. No').querySelector('button')!.click();
      fixture.detectChanges();
      expect(header('Emp. No').getAttribute('aria-sort')).toBe('descending');
      expect(firstCells()).toEqual(['1010', '1009', '1008', '1007', '1006', '1005', '1004', '1003', '1002', '1001']);
      http.expectNone(isEmployeesRequest);
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

  describe('status filter', () => {
    it('starts with Active and asks for the current employees', () => {
      create();
      answer(mixed);

      expect(statusTrigger().tagName).toBe('BUTTON');
      expect(statusTrigger().textContent?.trim()).toBe('Active');
      expect(statuses).toEqual(['active']);
      expect(firstCells()).toEqual(['1001', '1002', '1003']);
    });

    it('offers All, Active and Relieved, in that order, with Active chosen', async () => {
      create();
      answer(mixed);

      statusTrigger().click();
      await settle();

      expect(Array.from(document.querySelectorAll('hlm-select-item')).map((i) => i.textContent?.trim())).toEqual(['All', 'Active', 'Relieved']);
      expect(statusTrigger().textContent?.trim()).toBe('Active');
    });

    it('asks for nothing when a status is chosen, and for page 1 with it on Search', async () => {
      create();
      answer(many);
      button('Next page').click();
      fixture.detectChanges();
      answer(many);

      await chooseStatus('Relieved');
      http.expectNone(isEmployeesRequest);
      search();
      answer(mixed);

      expect(statuses.at(-1)).toBe('relieved');
      expect(sent.at(-1)).toEqual({ code: null, name: null, page: '1', pageSize: '10' });
      expect(firstCells()).toEqual(['1004', '1005']);
    });

    it('lists current and relieved employees with All', async () => {
      create();
      answer(mixed);

      await chooseStatus('All');
      search();
      answer(mixed);

      expect(statuses.at(-1)).toBe('all');
      expect(firstCells()).toEqual(['1001', '1002', '1003', '1004', '1005']);
    });

    it('keeps the searched status when paging, ignoring a status chosen since', async () => {
      create();
      answer(many);
      await chooseStatus('All');
      search();
      answer(many);
      await chooseStatus('Relieved');

      button('Next page').click();
      fixture.detectChanges();
      answer(many);

      expect(statuses.at(-1)).toBe('all');
      expect(sent.at(-1)).toEqual({ code: null, name: null, page: '2', pageSize: '10' });
    });

    it('says none match when a status other than Active was searched with no rows', async () => {
      create();
      answer(mixed);

      await chooseStatus('Relieved');
      search();
      answer([employee(1)]);

      expect(rows()[0].textContent?.trim()).toBe('No employees match the filters.');
    });

    it('brings back the chosen and the searched status after leaving and returning', async () => {
      create();
      answer(mixed);
      await chooseStatus('Relieved');
      search();
      answer(mixed);
      await chooseStatus('All');

      leaveAndReturn();
      answer(mixed);

      expect(statuses).toEqual(['relieved']);
      expect(statusTrigger().textContent?.trim()).toBe('All');
      expect(firstCells()).toEqual(['1004', '1005']);
    });

    it('opens with Active again after logging out and in', async () => {
      create();
      answer(mixed);
      await chooseStatus('Relieved');
      search();
      answer(mixed);

      const auth = TestBed.inject(AuthSession);
      fixture.destroy();
      auth.end();
      TestBed.tick();
      auth.start(testSession({ token: 'next-token' }));
      TestBed.tick();
      leaveAndReturn();
      answer(mixed);

      expect(statuses).toEqual(['active']);
      expect(statusTrigger().textContent?.trim()).toBe('Active');
      expect(firstCells()).toEqual(['1001', '1002', '1003']);
    });
  });

  describe('branch filter', () => {
    /**
     * The allowed branches of a user assigned Kochi, Chennai and Delhi, logged in to Kochi with the admin right there, as
     * the backend returns them: by name.
     */
    const allowedBranches = [
      { id: 'b-2', code: 'CHN', name: 'Chennai' },
      { id: 'b-3', code: 'DEL', name: 'Delhi' },
      { id: 'b-1', code: 'KOC', name: 'Kochi' },
    ];
    const branchTrigger = () => el.querySelector<HTMLButtonElement>('#filter-branch');
    const isBranchesRequest = (r: HttpRequest<unknown>) => r.url === 'admin/employees/branches';

    /** Opens the Employee List logged in to Kochi (b-1), answering the allowed branches and the first page. */
    function open(branches: typeof allowedBranches = allowedBranches) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answerBranches(branches);
      answer();
    }

    function answerBranches(branches: typeof allowedBranches = allowedBranches) {
      http.expectOne(isBranchesRequest).flush(branches);
      fixture.detectChanges();
    }

    /**
     * Switches the session to Chennai (b-2) and answers the allowed branches of the new session, then page 1. With
     * `admin` false the user has no admin right in Chennai.
     */
    function switchToChennai(admin = true) {
      TestBed.inject(AuthSession).start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
      fixture.detectChanges();
      answerBranches(admin ? allowedBranches : []);
      answer();
    }

    async function chooseBranch(label: string) {
      branchTrigger()!.click();
      await settle();
      Array.from(document.querySelectorAll<HTMLElement>('hlm-select-item')).find((i) => i.textContent?.trim() === label)!.click();
      await settle();
    }

    const optionLabels = async () => {
      branchTrigger()!.click();
      await settle();
      return Array.from(document.querySelectorAll('hlm-select-item')).map((i) => i.textContent?.trim());
    };

    /** The dropdown is there, disabled, on the session's branch. */
    function expectDisabledOnKochi() {
      expect(branchTrigger()!.disabled).toBe(true);
      expect(branchTrigger()!.textContent?.trim()).toBe('Kochi');
      expect(el.querySelector('label[for="filter-branch"]')?.textContent?.trim()).toBe('Branch');
    }

    it('is disabled on the session branch without the admin right there (no allowed branches), and asks for no branch', () => {
      open([]);

      expectDisabledOnKochi();
      expect(branches).toEqual([null]);
    });

    it('is disabled on the session branch while the allowed branches load, and the list still loads', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answer();

      expectDisabledOnKochi();
      expect(rows()).toHaveLength(10);
      http.expectOne(isBranchesRequest);
    });

    it('is disabled on the session branch when the allowed branches cannot be loaded, and the list still loads', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      http.expectOne(isBranchesRequest).flush(null, { status: 500, statusText: 'Server Error' });
      answer();

      expectDisabledOnKochi();
      expect(rows()).toHaveLength(10);
    });

    it('is enabled for an admin on the session branch, offering All and the assigned branches by name', async () => {
      open();

      expect(branchTrigger()!.disabled).toBe(false);
      expect(branchTrigger()!.textContent?.trim()).toBe('Kochi');
      expect(el.querySelector('label[for="filter-branch"]')?.textContent?.trim()).toBe('Branch');
      expect(branches).toEqual([null]);
      expect(await optionLabels()).toEqual(['All', 'Chennai', 'Delhi', 'Kochi']);
    });

    it('offers All and the session branch to an admin assigned no other branch', async () => {
      open([{ id: 'b-1', code: 'KOC', name: 'Kochi' }]);

      expect(await optionLabels()).toEqual(['All', 'Kochi']);
    });

    it('places Emp. No above Name and Branch above Status, tabbing Emp. No, Name, Branch, Status, then Search, Branch and Status as wide', () => {
      open();

      const parts = [input('filter-code'), input('filter-name'), branchTrigger()!, statusTrigger(), searchButton()];
      for (let i = 1; i < parts.length; i++) {
        expect(parts[i - 1].compareDocumentPosition(parts[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
      // Two columns of label and field each: the four filters are cells of one grid.
      const grid = input('filter-code').parentElement!;
      expect(grid.classList).toContain('sm:grid-cols-[auto_auto_auto_auto]');
      expect([input('filter-name'), branchTrigger()!, statusTrigger()].every((f) => grid.contains(f))).toBe(true);
      // Emp. No above Name on the left, Branch above Status on the right; the source order above is the Tab order.
      const select = (trigger: HTMLElement) => trigger.closest('hlm-select')!;
      const place = (f: Element) => [...f.classList].filter((c) => /^sm:(col|row)-start-/.test(c)).sort();
      expect(place(input('filter-code'))).toEqual(['sm:col-start-2', 'sm:row-start-1']);
      expect(place(input('filter-name'))).toEqual(['sm:col-start-2', 'sm:row-start-2']);
      expect(place(select(branchTrigger()!))).toEqual(['sm:col-start-4', 'sm:row-start-1']);
      expect(place(select(statusTrigger()))).toEqual(['sm:col-start-4', 'sm:row-start-2']);
      // Branch and Status share the wider width, so a full branch name shows.
      expect(select(branchTrigger()!).classList).toContain('w-80');
      expect(select(statusTrigger()).classList).toContain('w-80');
    });

    it('asks for nothing when a branch is chosen, for page 1 with it on Search, and pages with it', async () => {
      open();
      button('Next page').click();
      fixture.detectChanges();
      answer();

      await chooseBranch('Chennai');
      http.expectNone(isEmployeesRequest);
      search();
      answer();
      expect([branches.at(-1), sent.at(-1)?.page]).toEqual(['b-2', '1']);

      await chooseBranch('All');
      button('Next page').click();
      fixture.detectChanges();
      answer();
      expect([branches.at(-1), sent.at(-1)?.page]).toEqual(['b-2', '2']);
    });

    it('sends no branch when the session branch is chosen again and searched', async () => {
      open();
      await chooseBranch('All');
      search();
      answer();

      await chooseBranch('Kochi');
      search();
      answer();

      expect(branches).toEqual([null, 'all', null]);
    });

    it('says none match when another branch was searched with no rows', async () => {
      open();

      await chooseBranch('Delhi');
      search();
      answer([]);

      expect(rows()[0].textContent?.trim()).toBe('No employees match the filters.');
    });

    it('brings back the chosen and the searched branch after leaving and returning', async () => {
      open();
      await chooseBranch('All');
      search();
      answer();
      await chooseBranch('Delhi');

      leaveAndReturn();
      // The searched All waits for the allowed branches, which still allow it.
      http.expectNone(isEmployeesRequest);
      answerBranches();
      answer();

      expect(branches).toEqual(['all']);
      expect(branchTrigger()!.textContent?.trim()).toBe('Delhi');
    });

    it('follows a branch switch while on the session branch, asking for the allowed branches of the new session', () => {
      open();

      switchToChennai();

      expect(branches.at(-1)).toBeNull();
      expect(branchTrigger()!.textContent?.trim()).toBe('Chennai');
    });

    it('keeps a searched All after a branch switch', async () => {
      open();
      await chooseBranch('All');
      search();
      answer();

      switchToChennai();

      expect(branches.at(-1)).toBe('all');
      expect(branchTrigger()!.textContent?.trim()).toBe('All');
    });

    it('lists the new session branch, disabled, after a switch to a branch without the admin right, never asking for All', async () => {
      open();
      await chooseBranch('All');
      search();
      answer();

      TestBed.inject(AuthSession).start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
      fixture.detectChanges();
      http.expectNone(isEmployeesRequest);
      answerBranches([]);
      answer();

      expect(branches.at(-1)).toBeNull();
      expect(sent.at(-1)?.page).toBe('1');
      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(branchTrigger()!.disabled).toBe(true);
      expect(branchTrigger()!.textContent?.trim()).toBe('Chennai');
    });

    it('lists the session branch when the allowed branches fail after a switch, never asking for All', async () => {
      open();
      await chooseBranch('All');
      search();
      answer();

      TestBed.inject(AuthSession).start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
      fixture.detectChanges();
      http.expectOne(isBranchesRequest).flush(null, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      answer();

      expect(branches.at(-1)).toBeNull();
      expect(branchTrigger()!.disabled).toBe(true);
    });

    it('drops a remembered All on returning without the admin right any more', async () => {
      open();
      await chooseBranch('All');
      search();
      answer();

      leaveAndReturn();
      http.expectNone(isEmployeesRequest);
      answerBranches([]);
      answer();

      expect(branches).toEqual([null]);
      expect(branchTrigger()!.disabled).toBe(true);
      expect(branchTrigger()!.textContent?.trim()).toBe('Kochi');
    });

    it('asks for the rows at once when the session branch is searched, before the allowed branches answer', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answer();

      expect(branches).toEqual([null]);
      http.expectOne(isBranchesRequest);
    });

    it('opens with the session branch again after logging out and in', async () => {
      open();
      await chooseBranch('All');
      search();
      answer();

      const auth = TestBed.inject(AuthSession);
      fixture.destroy();
      auth.end();
      TestBed.tick();
      auth.start(testSession({ token: 'next-token' }));
      TestBed.tick();
      leaveAndReturn();
      answer();
      answerBranches();

      expect(branches).toEqual([null]);
      expect(branchTrigger()!.textContent?.trim()).toBe('Kochi');
    });
  });

  describe('empty, loading and error states', () => {
    it('shows no table and no loading message of its own while waiting', () => {
      create();

      expect(el.querySelector('[role="status"]')).toBeNull(); // no message of its own: the shell shows the spinner
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

  describe('row selection and the Profile column', () => {
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

    it('shows the Emp. No as plain text, not a link; a click on it selects the row and opens nothing', async () => {
      create();
      answer();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

      expect(el.querySelectorAll('a[data-slot="employee-link"]')).toHaveLength(0);
      const code = codeCell(rows()[1]);
      expect(code.textContent?.trim()).toBe('1002');
      expect(code.querySelector('a')).toBeNull();
      expect(code.classList).not.toContain('cursor-pointer');
      code.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(navigate).not.toHaveBeenCalled();
      expect(TestBed.inject(Router).url).toBe('/');
      expect(selected()).toEqual(['1002']);
    });

    it("opens the profile with the Profile's menu code, whatever the list's code is", async () => {
      create();
      await TestBed.inject(Router).navigateByUrl('/admin/employees/x?menuId=NS-EMPLIST');
      answer();

      const icon = rows()[0].querySelector<HTMLAnchorElement>('a[data-slot="employee-profile"]')!;
      expect(icon.getAttribute('href')).toBe('/admin/employees/e-01?menuId=NS-EMPPROFILE');
      rows()[1].querySelector<HTMLElement>('[data-employee-profile-cell]')!.click();
      await fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/admin/employees/e-02?menuId=NS-EMPPROFILE');
    });

    it('has a Profile column with a colourful icon link per row, named after the employee, not a button', () => {
      create();
      answer();

      const icons = Array.from(el.querySelectorAll<HTMLAnchorElement>('a[data-slot="employee-profile"]'));
      expect(icons).toHaveLength(rows().length);
      expect(icons[0].getAttribute('href')).toBe('/admin/employees/e-01?menuId=NS-EMPPROFILE');
      expect(icons[0].getAttribute('aria-label')).toBe('Profile of Name 01');
      expect(icons[0].getAttribute('title')).toBe('Profile of Name 01');
      expect(icons[0].querySelector('ng-icon')!.getAttribute('name')).toBe('appProfileColor');
      expect(icons[0].hasAttribute('hlmBtn')).toBe(false);
      expect(rows()[0].firstElementChild!.contains(icons[0])).toBe(true);
    });

    it('opens the profile from a click anywhere in the Profile cell, without changing the selection', async () => {
      create();
      answer();
      rows()[2].click();
      fixture.detectChanges();

      const cell = rows()[1].querySelector<HTMLElement>('[data-employee-profile-cell]')!;
      expect(cell.classList).toContain('cursor-pointer');
      cell.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(TestBed.inject(Router).url).toBe('/admin/employees/e-02?menuId=NS-EMPPROFILE');
      expect(selected()).toEqual(['1003']);
    });

    it('opens only one profile when the Profile icon itself is clicked, and keeps Enter on it from selecting the row', async () => {
      create();
      answer();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
      const icon = rows()[0].querySelector<HTMLAnchorElement>('a[data-slot="employee-profile"]')!;

      press(icon, 'Enter');
      expect(selected()).toEqual([]);
      icon.click();
      await fixture.whenStable();

      expect(navigate).not.toHaveBeenCalled(); // the link navigates itself; the cell does not repeat it
      expect(TestBed.inject(Router).url).toBe('/admin/employees/e-01?menuId=NS-EMPPROFILE');
    });

    it("has no Profile column without the Profile's view right", () => {
      create(false);
      answer();

      const heads = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());
      expect(heads).not.toContain('Profile');
      expect(el.querySelectorAll('[data-employee-profile-cell], a[data-slot="employee-profile"]')).toHaveLength(0);
      expect(rows()[0].querySelectorAll('td')).toHaveLength(8);
    });

    it('still selects the row from the other cells', () => {
      create();
      answer();

      (rows()[1].querySelectorAll('td')[2] as HTMLElement).click();
      fixture.detectChanges();

      expect(selected()).toEqual(['1002']);
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
      header('Emp. No').querySelector('button')!.click();
      header('Emp. No').querySelector('button')!.click();
      fixture.detectChanges();
      rows()[0].click();
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Wrap text'))!.click();
      fixture.detectChanges();

      leaveAndReturn();
      answer();

      expect(sent).toEqual([{ code: null, name: 'name', page: '2', pageSize: '5' }]);
      expect(input('filter-name').value).toBe('name');
      expect(range()).toBe('Showing 6–10 of 23');
      expect(header('Emp. No').getAttribute('aria-sort')).toBe('descending');
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

    it('puts the status back to Active, chosen and searched, keeping the other filters', async () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answer();
      type('filter-name', 'name');
      await chooseStatus('Relieved');
      search();
      answer();

      TestBed.inject(AuthSession).start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
      await settle();
      answer();

      expect(statuses.at(-1)).toBe('active');
      expect(sent.at(-1)).toEqual({ code: null, name: 'name', page: '1', pageSize: '10' });
      expect(statusTrigger().textContent?.trim()).toBe('Active');
      expect(input('filter-name').value).toBe('name');
    });

    it('opens again with Active after a branch switch made while on another screen', async () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answer();
      type('filter-name', 'name');
      await chooseStatus('Relieved');
      search();
      answer();
      fixture.destroy();

      TestBed.inject(AuthSession).start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
      leaveAndReturn();
      await settle();
      answer();

      expect(statuses).toEqual(['active']);
      expect(sent).toEqual([{ code: null, name: 'name', page: '1', pageSize: '10' }]);
      expect(statusTrigger().textContent?.trim()).toBe('Active');
      expect(input('filter-name').value).toBe('name');
    });

    it('keeps a chosen status when the list is opened again in the same branch', async () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answer();
      await chooseStatus('Relieved');
      search();
      answer();

      leaveAndReturn();
      await settle();
      answer();

      expect(statuses).toEqual(['relieved']);
      expect(statusTrigger().textContent?.trim()).toBe('Relieved');
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
