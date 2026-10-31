import { vi } from 'vitest';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MenuRights } from '../../../core/navigation/menu.model';
import { MenuRightsStore } from '../../../core/navigation/menu-rights.store';
import { AuthSession, SESSION_STORAGE_KEY } from '../../../core/auth/auth-session';
import { testSession } from '../../../core/auth/auth-session.testing';
import { TableStateStore } from '../../../shared/paging/table-state';
import { BRANCH_LIST_STATE_KEY, Branch, BranchListState } from './branch-list.model';
import { BranchListPage } from './branch-list.page';
import { BranchListSelection } from './branch-list.selection';
import { BranchListService } from './branch-list.service';

function branch(n: number, extra: Partial<Branch> = {}): Branch {
  const code = `C${String(n).padStart(2, '0')}`;
  return { id: code, code, name: `Name ${String(n).padStart(2, '0')}`, address1: `Road ${n}`, address2: '', address3: '', tel: '', email: '', web: '', ...extra };
}

/** 23 branches, as the backend would hold them: ordered by name. */
const many = Array.from({ length: 23 }, (_, i) => branch(i + 1));

const isBranchesRequest = (r: HttpRequest<unknown>) => r.url === 'reports/branches';

/** What the page sent in one request. */
interface Sent {
  code: string | null;
  name: string | null;
  page: string | null;
  pageSize: string | null;
}


/** Stores the Holiday List's view right as the screen guard does when the Branch List opens. */
function giveHolidayListRight(view: boolean): void {
  const rights: MenuRights = { view, add: false, edit: false, delete: false, print: false, email: false, docs: false, docsUpload: false, admin: false };
  TestBed.inject(MenuRightsStore).set('NS-HOLIDAYLIST', rights);
}

describe('BranchListPage', () => {
  let fixture: ComponentFixture<BranchListPage>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let sent: Sent[];

  function create() {
    TestBed.configureTestingModule({
      imports: [BranchListPage],
      // The Holiday List icon is a router link.
      providers: [BranchListService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    giveHolidayListRight(true);
    fixture = TestBed.createComponent(BranchListPage);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement as HTMLElement;
    sent = [];
    fixture.detectChanges();
  }

  /**
   * Plays the backend for the one request that is waiting: filters (case-insensitive contains), takes the page and
   * answers with the total, exactly as the API contract says. Records what was sent.
   */
  function answer(all: Branch[] = many) {
    const req = http.expectOne(isBranchesRequest);
    const p = req.request.params;
    sent.push({ code: p.get('code'), name: p.get('name'), page: p.get('page'), pageSize: p.get('pageSize') });
    const code = (p.get('code') ?? '').toLowerCase();
    const name = (p.get('name') ?? '').toLowerCase();
    const page = Number(p.get('page'));
    const size = Number(p.get('pageSize'));
    const matching = all.filter((c) => c.code.toLowerCase().includes(code) && c.name.toLowerCase().includes(name));
    req.flush({ items: matching.slice((page - 1) * size, page * size), total: matching.length, page, pageSize: size });
    fixture.detectChanges();
  }

  const rows = () => Array.from(el.querySelectorAll('tbody tr'));
  const firstCells = () => rows().map((r) => r.querySelector('td')?.textContent?.trim());
  const input = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;
  const header = (label: string) =>
    Array.from(el.querySelectorAll<HTMLTableCellElement>('th')).find((th) => th.textContent?.trim() === label)!;
  const button = (name: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
  const searchButton = () => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Search')!;
  const range = () => el.querySelector('[aria-live]')?.textContent?.replace(/\s+/g, ' ').trim();

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

  function choosePageSize(size: number) {
    const select = el.querySelector<HTMLSelectElement>('#page-size')!;
    select.value = String(size);
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  /** Clicks a pager button and lets the fake backend answer the request it causes. */
  function pageTo(name: string, all: Branch[] = many) {
    button(name).click();
    fixture.detectChanges();
    answer(all);
  }

  describe('loading the first page', () => {
    it('has the Branch List heading and asks the backend for page 1 of 10 with no filters', () => {
      create();

      expect(el.querySelector('h1')?.textContent).toContain('Branch List');
      answer();
      expect(sent).toEqual([{ code: null, name: null, page: '1', pageSize: '10' }]);
    });

    it('shows no table and no loading message of its own while waiting', () => {
      create();

      expect(el.querySelector('[role="status"]')).toBeNull(); // no message of its own: the shell shows the spinner
      expect(el.querySelector('table')).toBeNull();
      answer();
      expect(el.querySelector('[role="status"]')).toBeNull();
      expect(el.querySelector('table')).not.toBeNull();
    });

    it('shows the eight data columns and the Holiday List column in order, one row per branch, with blanks for empty values', () => {
      create();
      answer([branch(1)]);

      const heads = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());
      expect(heads).toEqual(['Code', 'Name', 'Address-1', 'Address-2', 'Address-3', 'Tel', 'Email', 'Web', 'Holiday List']);
      const cells = Array.from(rows()[0].querySelectorAll('td')).map((td) => td.textContent?.trim());
      expect(cells).toEqual(['C01', 'Name 01', 'Road 1', '', '', '', '', '', '']);
      // The Holiday header is not a sort button.
      expect(el.querySelectorAll('th')[8].querySelector('button')).toBeNull();
    });

    it('has no create, edit or delete control', () => {
      create();
      answer();

      // The sort buttons in the header are not actions, so the other buttons are checked; the Holiday List icons are
      // links that only open a view.
      const actions = Array.from(el.querySelectorAll('button:not(th button)')).map(
        (b) => b.getAttribute('aria-label') ?? b.textContent?.trim(),
      );
      expect(actions).toEqual(['Back', 'Search', 'Wrap text: on', 'First page', 'Previous page', 'Next page', 'Last page']);
    });

    it('shows the first 10 rows in the order the backend returned, with the Name header showing ascending', () => {
      create();
      answer();

      expect(rows()).toHaveLength(10);
      expect(firstCells().slice(0, 3)).toEqual(['C01', 'C02', 'C03']);
      expect(header('Name').getAttribute('aria-sort')).toBe('ascending');
      expect(header('Code').getAttribute('aria-sort')).toBe('none');
      expect(range()).toBe('Showing 1–10 of 23');
      expect(el.querySelector<HTMLSelectElement>('#page-size')!.value).toBe('10');
    });
  });

  describe('Search button', () => {
    it('does not search while typing', () => {
      create();
      answer();

      type('filter-code', 'c0');
      type('filter-name', 'name');

      http.expectNone(isBranchesRequest);
      expect(rows()).toHaveLength(10);
      expect(range()).toBe('Showing 1–10 of 23');
    });

    it('does not search when Enter is pressed in a filter box', () => {
      create();
      answer();

      type('filter-code', 'c0');
      input('filter-code').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      input('filter-code').dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      http.expectNone(isBranchesRequest);
    });

    it('has no Clear button', () => {
      create();
      answer();

      expect(Array.from(el.querySelectorAll('button')).some((b) => /clear|reset/i.test(b.textContent ?? ''))).toBe(false);
    });

    it('sends the typed filters in one request and shows page 1 of the result', () => {
      create();
      answer();

      type('filter-code', 'C1');
      search();
      answer();

      expect(sent[1]).toEqual({ code: 'C1', name: null, page: '1', pageSize: '10' });
      expect(range()).toBe('Showing 1–10 of 10'); // codes C10 to C19 contain "c1"
    });

    it('filters by name and by both', () => {
      create();
      answer();

      type('filter-name', 'NAME 2');
      search();
      answer();
      expect(sent[1].name).toBe('NAME 2');
      expect(firstCells()).toEqual(['C20', 'C21', 'C22', 'C23']);

      type('filter-code', 'c21');
      search();
      answer();
      expect(sent[2]).toEqual({ code: 'c21', name: 'NAME 2', page: '1', pageSize: '10' });
      expect(firstCells()).toEqual(['C21']);
    });

    it('trims the typed text and leaves out blank filters', () => {
      create();
      answer();

      type('filter-code', '  c05 ');
      type('filter-name', '   ');
      search();
      answer();

      expect(sent[1]).toEqual({ code: 'c05', name: null, page: '1', pageSize: '10' });
    });

    it('shows all branches again, from page 1, when the boxes are emptied and Search is pressed', () => {
      create();
      answer();
      type('filter-code', 'c05');
      search();
      answer();
      expect(rows()).toHaveLength(1);

      type('filter-code', '');
      search();
      answer();

      expect(sent[2]).toEqual({ code: null, name: null, page: '1', pageSize: '10' });
      expect(range()).toBe('Showing 1–10 of 23');
    });

    it('goes back to page 1 when Search is pressed on a later page', () => {
      create();
      answer();
      pageTo('Next page');
      pageTo('Next page');
      expect(range()).toBe('Showing 21–23 of 23');

      type('filter-name', 'name');
      search();
      answer();

      expect(sent[3].page).toBe('1');
      expect(range()).toBe('Showing 1–10 of 23');
    });

    it('keeps the searched filters when paging, ignoring text typed since', () => {
      create();
      answer();
      type('filter-code', 'c'); // every code starts with C, so 23 match and there is a second page
      search();
      answer();

      type('filter-code', 'xy');
      type('filter-name', 'nothing');
      pageTo('Next page');

      expect(sent[2]).toEqual({ code: 'c', name: null, page: '2', pageSize: '10' });
    });

    it('keeps the searched filters when the page size changes', () => {
      create();
      answer();
      type('filter-code', 'c1');
      search();
      answer();

      choosePageSize(5);
      answer();

      expect(sent[2]).toEqual({ code: 'c1', name: null, page: '1', pageSize: '5' });
    });

    it('keeps the sort choice after a search', () => {
      create();
      answer();
      header('Code').querySelector('button')!.click();
      header('Code').querySelector('button')!.click();
      fixture.detectChanges();

      type('filter-code', 'c0');
      search();
      answer();

      expect(header('Code').getAttribute('aria-sort')).toBe('descending');
      expect(firstCells().slice(0, 2)).toEqual(['C09', 'C08']);
    });
  });

  describe('sorting the shown page', () => {
    it('sorts the rows of the current page by another column, then reverses, without a request', () => {
      create();
      answer([branch(2, { code: 'B' }), branch(1, { code: 'C' }), branch(3, { code: 'A' })]);

      header('Code').querySelector('button')!.click();
      fixture.detectChanges();
      expect(firstCells()).toEqual(['A', 'B', 'C']);
      expect(header('Code').getAttribute('aria-sort')).toBe('ascending');
      expect(header('Name').getAttribute('aria-sort')).toBe('none');

      header('Code').querySelector('button')!.click();
      fixture.detectChanges();
      expect(firstCells()).toEqual(['C', 'B', 'A']);
      expect(header('Code').getAttribute('aria-sort')).toBe('descending');
      http.expectNone(isBranchesRequest);
    });

    it('sorts from a click anywhere in the header cell, and once from a click on its button', () => {
      create();
      answer([branch(2, { code: 'B' }), branch(1, { code: 'C' }), branch(3, { code: 'A' })]);

      header('Code').click();
      fixture.detectChanges();
      expect(firstCells()).toEqual(['A', 'B', 'C']);
      expect(header('Code').getAttribute('aria-sort')).toBe('ascending');
      expect(header('Code').classList).toContain('cursor-pointer');

      header('Code').querySelector('button')!.click();
      fixture.detectChanges();
      expect(header('Code').getAttribute('aria-sort')).toBe('descending');
      expect(firstCells()).toEqual(['C', 'B', 'A']);
      http.expectNone(isBranchesRequest);
    });

    it('does not reorder other pages: each page is sorted within itself', () => {
      create();
      answer();

      header('Code').querySelector('button')!.click();
      header('Code').querySelector('button')!.click(); // descending
      fixture.detectChanges();
      expect(firstCells()).toEqual(['C10', 'C09', 'C08', 'C07', 'C06', 'C05', 'C04', 'C03', 'C02', 'C01']);

      pageTo('Next page');

      expect(firstCells()).toEqual(['C20', 'C19', 'C18', 'C17', 'C16', 'C15', 'C14', 'C13', 'C12', 'C11']);
    });

    it('keeps the backend order until a sort is chosen', () => {
      create();
      answer([branch(3), branch(1), branch(2)]); // deliberately not in code order

      expect(firstCells()).toEqual(['C03', 'C01', 'C02']);
    });
  });

  describe('paging on the backend', () => {
    it('shows the page number and keeps it in step with the paging', () => {
      create();
      answer();
      const pageNumber = () => el.querySelector('[data-slot="page-number"]')?.textContent?.replace(/\s+/g, ' ').trim();
      expect(pageNumber()).toBe('Page 1 of 3');

      pageTo('Next page');
      expect(pageNumber()).toBe('Page 2 of 3');
      pageTo('Last page');
      expect(pageNumber()).toBe('Page 3 of 3');
      choosePageSize(25);
      answer();
      expect(pageNumber()).toBe('Page 1 of 1');
    });

    it('asks for page 2 with the next-page control', () => {
      create();
      answer();

      pageTo('Next page');

      expect(sent[1]).toEqual({ code: null, name: null, page: '2', pageSize: '10' });
      expect(range()).toBe('Showing 11–20 of 23');
    });

    it('jumps to the last page and back to the first', () => {
      create();
      answer();

      pageTo('Last page');
      expect(sent[1].page).toBe('3');
      expect(range()).toBe('Showing 21–23 of 23');
      expect(firstCells()).toEqual(['C21', 'C22', 'C23']);

      pageTo('First page');
      expect(sent[2].page).toBe('1');
      expect(range()).toBe('Showing 1–10 of 23');
    });

    it('moves back one page with the previous-page control', () => {
      create();
      answer();
      pageTo('Last page');

      pageTo('Previous page');

      expect(sent[2].page).toBe('2');
    });

    it('disables the moves that are not possible', () => {
      create();
      answer();
      const state = () => ['First page', 'Previous page', 'Next page', 'Last page'].map((n) => button(n).disabled);

      expect(state()).toEqual([true, true, false, false]);
      pageTo('Last page');
      expect(state()).toEqual([false, false, true, true]);
    });

    it('offers the page sizes 2, 5, 10, 25, 50 and 100', () => {
      create();
      answer();

      const options = Array.from(el.querySelectorAll('#page-size option')).map((o) => o.textContent?.trim());
      expect(options).toEqual(['2', '5', '10', '25', '50', '100']);
    });

    it('asks for page 1 with the new size when the page size changes on a later page', () => {
      create();
      answer();
      pageTo('Next page');

      choosePageSize(25);
      answer();

      expect(sent[2]).toEqual({ code: null, name: null, page: '1', pageSize: '25' });
      expect(range()).toBe('Showing 1–23 of 23');
      expect(el.querySelector<HTMLSelectElement>('#page-size')!.value).toBe('25');
    });

    it('requests the last page that has rows when the backend answers a page after the last with no rows', () => {
      create();
      answer();
      button('Last page').click(); // asks for page 3
      fixture.detectChanges();

      // Branches were removed meanwhile: page 3 is now past the end, but 4 branches still match.
      http.expectOne(isBranchesRequest).flush({ items: [], total: 4, page: 3, pageSize: 10 });
      fixture.detectChanges();
      answer(many.slice(0, 4)); // the page asks again, for the last page that has rows

      expect(sent[1].page).toBe('1');
      expect(range()).toBe('Showing 1–4 of 4');
      expect(firstCells()).toEqual(['C01', 'C02', 'C03', 'C04']);
    });

    it('does not ask again when an empty result really has no branches', () => {
      create();
      answer([]);

      http.expectNone(isBranchesRequest);
      expect(range()).toBe('No rows');
    });
  });

  describe('empty, loading and error states', () => {
    it('says there are no branches when none exist', () => {
      create();
      answer([]);

      expect(rows()).toHaveLength(1);
      expect(rows()[0].textContent).toContain('There are no branches.');
      expect(range()).toBe('No rows');
    });

    it('says no branches match when a search with filters finds none, and recovers when searched empty', () => {
      create();
      answer();

      type('filter-code', 'zzz');
      search();
      answer();
      expect(rows()[0].textContent).toContain('No branches match the filters.');

      type('filter-code', '');
      search();
      answer();
      expect(rows()).toHaveLength(10);
    });

    it('shows no stale rows and no loading message of its own while a page loads', () => {
      create();
      answer();

      button('Next page').click();
      fixture.detectChanges();

      expect(el.querySelector('[role="status"]')).toBeNull(); // no message of its own: the shell shows the spinner
      expect(rows()).toHaveLength(0);
      answer();
    });

    it('shows an error state without exception text, and Retry repeats the same request', () => {
      create();
      answer();
      type('filter-code', 'c'); // 23 match, so there is a second page to fail on
      search();
      answer();
      button('Next page').click();
      fixture.detectChanges();
      http.expectOne(isBranchesRequest).flush({ detail: 'ORA-secret' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      const alert = el.querySelector('[role="alert"]')!;
      expect(alert.textContent).toContain('could not be loaded');
      expect(el.textContent).not.toContain('ORA-secret');
      expect(el.querySelector('table')).toBeNull();

      alert.querySelector('button')!.click();
      fixture.detectChanges();
      answer();

      expect(sent[sent.length - 1]).toEqual({ code: 'c', name: null, page: '2', pageSize: '10' });
      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(rows().length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('labels the filters and the table, and scrolls the table inside its own container', () => {
      create();
      answer();

      expect(el.querySelector('label[for="filter-code"]')?.textContent).toContain('Code');
      expect(el.querySelector('label[for="filter-name"]')?.textContent).toContain('Name');
      expect(el.querySelector('table')?.getAttribute('aria-label')).toBe('Branches');
      expect(el.querySelector('[data-slot="table-container"] table')).not.toBeNull();
    });

    it('makes the Search button a real button that is not a form submit', () => {
      create();
      answer();

      expect(searchButton().type).toBe('button');
      expect(el.querySelector('form')).toBeNull();
    });
  });

  describe('layout and appearance', () => {
    it('has a separator directly above and below the filter row', () => {
      create();
      answer();

      const separators = el.querySelectorAll('hr');
      expect(separators).toHaveLength(4); // two around the filter row, two around the footer
      const filterRow = input('filter-code').parentElement!.parentElement!;
      expect(separators[0].nextElementSibling).toBe(filterRow);
      expect(separators[1].previousElementSibling).toBe(filterRow);
    });

    it('has a separator directly above and below the footer row, after the table', () => {
      create();
      answer();

      const separators = el.querySelectorAll('hr');
      const footerRow = el.querySelector('[data-slot="table-pager"]')!;
      expect(separators[2].nextElementSibling).toBe(footerRow);
      expect(separators[3].previousElementSibling).toBe(footerRow);
      // The table comes before the footer's first separator.
      expect(el.querySelector('table')!.compareDocumentPosition(separators[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('puts each label beside its text box, and both pairs and the Search button in one row', () => {
      create();
      answer();

      const codePair = input('filter-code').parentElement!;
      const namePair = input('filter-name').parentElement!;
      expect(codePair.querySelector('label[for="filter-code"]')).not.toBeNull();
      expect(namePair.querySelector('label[for="filter-name"]')).not.toBeNull();
      expect(codePair.classList).toContain('flex');
      expect(codePair.classList).not.toContain('grid');
      expect(codePair.parentElement).toBe(namePair.parentElement);
      expect(codePair.parentElement!.classList).toContain('flex-wrap');
      // The Search button is in the same row, after the Name pair.
      expect(searchButton().parentElement).toBe(codePair.parentElement);
      expect(namePair.nextElementSibling).toBe(searchButton());
    });

    it('shows the title in its normal case, not in capitals', () => {
      create();
      answer();

      const title = el.querySelector('h1')!;
      expect(title.classList).not.toContain('uppercase');
      expect(title.textContent?.trim()).toBe('Branch List');
    });

    it('marks only the selected row with data-state, and leaves the look to the table directives', () => {
      create();
      answer();
      (rows()[1] as HTMLElement).click();
      fixture.detectChanges();

      expect(rows()[1].getAttribute('data-state')).toBe('selected');
      expect(rows()[3].getAttribute('data-state')).toBeNull();
      // The look comes from the shared directives (the template guard in the look-and-feel tests checks that the
      // page itself sets no colors).
      expect(el.querySelector('th')!.className).not.toMatch(/bg-primary-surface|text-primary-foreground/);
    });

    it('uses theme colors only', () => {
      create();
      answer();

      const colorLiteral = /\b(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|teal|cyan|sky|blue|indigo|violet|purple|pink|rose|white|black)\b|#[0-9a-f]{3,8}\b/i;
      expect(colorLiteral.test(el.innerHTML)).toBe(false);
    });

    it('is built from the shared look pieces, with no look of its own', () => {
      create();
      answer();

      expect(el.querySelector('h1')!.getAttribute('data-slot')).toBe('page-title');
      expect(el.querySelector('app-table-toolbar')).not.toBeNull();
      expect(el.querySelector('table')!.getAttribute('data-slot')).toBe('table');
      expect(el.querySelector('th')!.getAttribute('data-slot')).toBe('table-head');
      expect(rows()[0].getAttribute('data-slot')).toBe('table-row');
      expect(rows()[0].querySelector('td')!.getAttribute('data-slot')).toBe('table-cell');
      expect(searchButton().getAttribute('data-slot')).toBe('button');
      expect(el.querySelector('app-table-pager')).not.toBeNull();
      expect(el.querySelector('app-table-wrap-toggle')).not.toBeNull();
    });

    it('uses the shared table pager', () => {
      create();
      answer();

      expect(el.querySelector('app-table-pager')).not.toBeNull();
    });
  });

  describe('row selection', () => {
    const selected = () =>
      rows()
        .filter((r) => r.getAttribute('aria-selected') === 'true')
        .map((r) => r.querySelector('td')?.textContent?.trim());
    const row = (n: number) => rows()[n] as HTMLElement;
    const press = (target: HTMLElement, key: string) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };
    const reopen = (all: Branch[]) => {
      fixture.destroy();
      fixture = TestBed.createComponent(BranchListPage);
      el = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      answer(all);
    };

    it('selects a clicked row with its own color, and only that row', () => {
      create();
      answer();

      row(1).click();
      fixture.detectChanges();

      expect(selected()).toEqual(['C02']);
      expect(row(1).getAttribute('data-state')).toBe('selected');
      expect(row(0).getAttribute('data-state')).toBeNull();
    });

    it('moves the selection to another row, and clears it when the selected row is clicked again', () => {
      create();
      answer();

      row(1).click();
      fixture.detectChanges();
      row(2).click();
      fixture.detectChanges();
      expect(selected()).toEqual(['C03']);

      row(2).click();
      fixture.detectChanges();
      expect(selected()).toEqual([]);
    });

    it('selects and clears with Enter and Space, and Space does not scroll the page', () => {
      create();
      answer();

      expect(row(0).tabIndex).toBe(0);
      press(row(0), 'Enter');
      expect(selected()).toEqual(['C01']);
      const space = press(row(0), ' ');
      expect(selected()).toEqual([]);
      expect(space.defaultPrevented).toBe(true);
    });

    it('is kept when moving between table pages', () => {
      create();
      answer();

      row(0).click();
      fixture.detectChanges();
      pageTo('Next page');
      expect(selected()).toEqual([]);
      pageTo('Previous page');

      expect(selected()).toEqual(['C01']);
    });

    it('is kept while a search leaves the row out, and shows again when the filters are cleared', () => {
      create();
      answer();

      row(0).click();
      fixture.detectChanges();
      type('filter-code', 'c2');
      search();
      answer();
      expect(selected()).toEqual([]);

      type('filter-code', '');
      search();
      answer();

      expect(selected()).toEqual(['C01']);
    });

    it('is kept after leaving the screen and coming back', () => {
      create();
      answer();
      row(3).click();
      fixture.detectChanges();

      reopen(many);

      expect(selected()).toEqual(['C04']);
    });

    it('highlights nothing when the selected branch is no longer listed', () => {
      create();
      answer();
      row(0).click();
      fixture.detectChanges();

      reopen(many.slice(1));

      expect(selected()).toEqual([]);
    });

    it('sends no request and changes nothing else', () => {
      create();
      answer();
      const before = range();

      row(0).click();
      fixture.detectChanges();

      http.expectNone(isBranchesRequest);
      expect(range()).toBe(before);
      expect(rows()).toHaveLength(10);
    });
  });

  describe('remembered state', () => {
    const selected = () =>
      rows()
        .filter((r) => r.getAttribute('aria-selected') === 'true')
        .map((r) => r.querySelector('td')?.textContent?.trim());

    /** Leaves the screen and comes back: the page is destroyed and a new one is created. */
    function leaveAndReturn() {
      sent = [];
      fixture.destroy();
      fixture = TestBed.createComponent(BranchListPage);
      el = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
    }

    it('brings back the filters, page, page size, sort and selected row', () => {
      create();
      answer();
      type('filter-code', 'c');
      type('filter-name', 'name');
      search();
      answer();
      choosePageSize(5);
      answer();
      pageTo('Next page'); // page 2 of 5: C06 to C10
      header('Code').querySelector('button')!.click();
      header('Code').querySelector('button')!.click(); // descending
      fixture.detectChanges();
      (rows()[0] as HTMLElement).click(); // C10
      fixture.detectChanges();

      leaveAndReturn();
      answer();

      expect(sent).toEqual([{ code: 'c', name: 'name', page: '2', pageSize: '5' }]);
      expect(input('filter-code').value).toBe('c');
      expect(input('filter-name').value).toBe('name');
      expect(el.querySelector<HTMLSelectElement>('#page-size')!.value).toBe('5');
      expect(range()).toBe('Showing 6–10 of 23');
      expect(header('Code').getAttribute('aria-sort')).toBe('descending');
      expect(firstCells()).toEqual(['C10', 'C09', 'C08', 'C07', 'C06']);
      expect(selected()).toEqual(['C10']);
    });

    it('asks the backend for the rows again, once, instead of showing old rows', () => {
      create();
      answer();
      pageTo('Next page');

      leaveAndReturn();

      expect(el.querySelector('[role="status"]')).toBeNull(); // no message of its own: the shell shows the spinner
      expect(rows()).toHaveLength(0);
      answer();
      http.expectNone(isBranchesRequest);
      expect(sent).toEqual([{ code: null, name: null, page: '2', pageSize: '10' }]);
    });

    it('shows text that was typed but not searched, without applying it', () => {
      create();
      answer();
      type('filter-name', 'xy');

      leaveAndReturn();
      answer();

      expect(input('filter-name').value).toBe('xy');
      expect(sent[0].name).toBeNull();
      pageTo('Next page');
      expect(sent[1]).toEqual({ code: null, name: null, page: '2', pageSize: '10' });
    });

    it('keeps the backend order when no sort was chosen', () => {
      create();
      answer([branch(3), branch(1), branch(2)]);

      leaveAndReturn();
      answer([branch(3), branch(1), branch(2)]);

      expect(firstCells()).toEqual(['C03', 'C01', 'C02']);
    });

    it('shows the last page that has rows when the remembered page no longer exists', () => {
      create();
      answer();
      pageTo('Last page'); // page 3

      leaveAndReturn();
      http.expectOne(isBranchesRequest).flush({ items: [], total: 4, page: 3, pageSize: 10 });
      fixture.detectChanges();
      answer(many.slice(0, 4)); // the page asks again, for page 1

      expect(sent[0].page).toBe('1');
      expect(range()).toBe('Showing 1–4 of 4');
    });

    it('starts with the defaults on a first visit and after a reload', () => {
      create();
      answer();
      type('filter-code', 'c05');
      search();
      answer();

      TestBed.resetTestingModule(); // a browser reload: nothing is remembered
      create();
      answer();

      expect(sent).toEqual([{ code: null, name: null, page: '1', pageSize: '10' }]);
      expect(input('filter-code').value).toBe('');
      expect(header('Name').getAttribute('aria-sort')).toBe('ascending');
      expect(selected()).toEqual([]);
    });
  });

  describe('branch or year switch', () => {
    const auth = () => TestBed.inject(AuthSession);

    /** Opens the list logged in, then types and searches Code and Name, showing page 2 of 5. */
    function openAndSearch() {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answer();
      choosePageSize(5);
      answer();
      type('filter-code', 'c');
      type('filter-name', 'name');
      search();
      answer();
      pageTo('Next page');
    }

    function leaveAndReturn() {
      sent = [];
      fixture.destroy();
      fixture = TestBed.createComponent(BranchListPage);
      el = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
    }

    afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

    it('puts Code and Name back to empty on a branch switch, typed and searched, asking for page 1', () => {
      openAndSearch();

      auth().start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
      fixture.detectChanges();
      answer();

      expect(sent.at(-1)).toEqual({ code: null, name: null, page: '1', pageSize: '5' });
      expect(input('filter-code').value).toBe('');
      expect(input('filter-name').value).toBe('');
    });

    it('puts Code and Name back to empty on a year switch, asking for page 1', () => {
      openAndSearch();

      auth().start(testSession({ yearId: 'y-2' }));
      fixture.detectChanges();
      answer();

      expect(sent.at(-1)).toEqual({ code: null, name: null, page: '1', pageSize: '5' });
      expect(input('filter-code').value).toBe('');
      expect(input('filter-name').value).toBe('');
    });

    it('sends no request on a switch when nothing was searched, but clears what was typed', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      create();
      answer();
      type('filter-code', 'c');

      auth().start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
      fixture.detectChanges();

      http.expectNone(isBranchesRequest);
      expect(input('filter-code').value).toBe('');
    });

    it('sends no request when the session changes without a branch or year change, keeping the fields', () => {
      openAndSearch();

      auth().start(testSession({ token: 'next-token' }));
      fixture.detectChanges();

      http.expectNone(isBranchesRequest);
      expect(input('filter-code').value).toBe('c');
    });

    it('opens with empty fields after a switch made while on another screen', () => {
      openAndSearch();
      fixture.destroy();

      auth().start(testSession({ yearId: 'y-2' }));
      leaveAndReturn();
      answer();

      expect(sent).toEqual([{ code: null, name: null, page: '2', pageSize: '5' }]);
      expect(input('filter-code').value).toBe('');
      expect(input('filter-name').value).toBe('');
    });

    it('opens with empty fields after a switch that closes the list before it resets', () => {
      openAndSearch();

      // The Change Branch dialog switches the session and goes to the Dashboard: the list closes at once.
      auth().start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
      leaveAndReturn();
      answer();

      expect(sent.at(-1)?.code).toBeNull();
      expect(sent.at(-1)?.name).toBeNull();
      expect(input('filter-code').value).toBe('');
    });

    it('keeps the fields when the list is opened again in the same branch and year', () => {
      openAndSearch();

      leaveAndReturn();
      answer();

      expect(sent).toEqual([{ code: 'c', name: 'name', page: '2', pageSize: '5' }]);
      expect(input('filter-code').value).toBe('c');
    });
  });

  describe('wrap text toggle', () => {
    const toggle = () => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Wrap text')) as HTMLButtonElement;
    const toggleLabel = () => toggle().textContent?.trim();
    const container = () => el.querySelector('[data-slot="table-container"]')!;
    const click = () => {
      toggle().click();
      fixture.detectChanges();
    };

    function leaveAndReturn() {
      fixture.destroy();
      fixture = TestBed.createComponent(BranchListPage);
      el = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      sent = [];
      answer();
    }

    it('shows the toggle directly above the table, on by default, with the table wrapping', () => {
      create();
      answer();

      expect(toggleLabel()).toBe('Wrap text: on');
      expect(toggle().getAttribute('aria-pressed')).toBe('true');
      expect(container().getAttribute('data-wrap')).toBe('true');
      const toggleBox = el.querySelector('app-table-wrap-toggle')!;
      expect(toggleBox.compareDocumentPosition(el.querySelector('table')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(toggleBox.compareDocumentPosition(el.querySelector('app-table-toolbar')!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    it('turns wrapping off and on again without sending a request or changing the rows', () => {
      create();
      answer();
      const before = firstCells();

      click();
      expect(toggleLabel()).toBe('Wrap text: off');
      expect(toggle().getAttribute('aria-pressed')).toBe('false');
      expect(container().hasAttribute('data-wrap')).toBe(false);
      expect(firstCells()).toEqual(before);

      click();
      expect(toggleLabel()).toBe('Wrap text: on');
      expect(container().getAttribute('data-wrap')).toBe('true');
      http.expectNone(isBranchesRequest);
    });

    it('leaves the page, the sort and the selected row as they are', () => {
      create();
      answer();
      pageTo('Next page');
      header('Code').querySelector('button')!.click();
      fixture.detectChanges();
      (rows()[2] as HTMLElement).click();
      fixture.detectChanges();
      const state = () => [range(), header('Code').getAttribute('aria-sort'), rows().findIndex((r) => r.getAttribute('data-state') === 'selected'), firstCells().join()];
      const before = state();

      click();

      expect(state()).toEqual(before);
      http.expectNone(isBranchesRequest);
    });

    it('is remembered when the user leaves the screen and returns, whichever way it was left', () => {
      create();
      answer();
      click(); // off

      leaveAndReturn();

      expect(toggleLabel()).toBe('Wrap text: off');
      expect(container().hasAttribute('data-wrap')).toBe(false);

      click(); // on again
      leaveAndReturn();

      expect(toggleLabel()).toBe('Wrap text: on');
      expect(container().getAttribute('data-wrap')).toBe('true');
    });

    it('is on again after a browser reload', () => {
      create();
      answer();
      click(); // off

      TestBed.resetTestingModule(); // a reload: nothing is remembered
      create();
      answer();

      expect(toggleLabel()).toBe('Wrap text: on');
      expect(container().getAttribute('data-wrap')).toBe('true');
    });

    it('treats state saved before the toggle existed as the default, on', () => {
      create();
      answer();
      // Simulate old saved state: everything but `wrap`.
      const store = TestBed.inject(TableStateStore);
      const saved = store.get<BranchListState>(BRANCH_LIST_STATE_KEY)!;
      const { wrap: _ignored, ...withoutWrap } = saved;
      store.set(BRANCH_LIST_STATE_KEY, withoutWrap);

      leaveAndReturn();

      expect(toggleLabel()).toBe('Wrap text: on');
    });
  });
});

@Component({ template: 'stub' })
class Stub {}

/** Lets the router finish a navigation, including one it starts from a browser-history pop (which uses a timer). */
async function settle(fixture: ComponentFixture<unknown>) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await fixture.whenStable();
}

describe('BranchListPage back button', () => {
  async function open(...urls: string[]) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Stub },
          { path: 'other', component: Stub },
          { path: 'branches', providers: [BranchListService], component: BranchListPage },
        ]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    // The harness does not start the router's browser-history listener, which Location.back() relies on.
    TestBed.inject(Router).setUpLocationChangeListener();
    const harness = await RouterTestingHarness.create();
    for (const url of urls) {
      await harness.navigateByUrl(url);
    }
    TestBed.inject(HttpTestingController)
      .match(isBranchesRequest)
      .forEach((r) => r.flush({ items: [], total: 0, page: 1, pageSize: 10 }));
    harness.detectChanges();
    const el = harness.routeNativeElement as HTMLElement;
    const back = el.querySelector<HTMLButtonElement>('button[aria-label="Back"]')!;
    return { harness, el, back, router: TestBed.inject(Router) };
  }

  it('is on the same row as the heading, before it, with the accessible name Back', async () => {
    const { el, back } = await open('/branches');

    const heading = el.querySelector('h1')!;
    expect(back.parentElement).toBe(heading.parentElement);
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.parentElement!.firstElementChild).toBe(back);
    expect(back.getAttribute('aria-label')).toBe('Back');
    expect(back.type).toBe('button');
  });

  it('returns to the page the user came from', async () => {
    const { harness, back, router } = await open('/', '/branches');
    expect(router.url).toBe('/branches');

    back.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/');
  });

  it('returns to any earlier page, not always the Dashboard', async () => {
    const { harness, back, router } = await open('/', '/other', '/branches');

    back.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/other');
  });

  it('opens the Dashboard when the page was opened directly', async () => {
    const { harness, back, router } = await open('/branches');

    back.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/');
  });

  it('is a real button, so Enter and Space activate it through the browser', async () => {
    const { back } = await open('/branches');

    expect(back.tagName).toBe('BUTTON');
    expect(back.disabled).toBe(false);
    expect(back.tabIndex).toBe(0);
  });
});

describe('BranchListPage Holiday column', () => {
  /** `holidayView`: the Holiday List's view right, as the screen guard loads it with the list. */
  async function open(url = '/branches', holidayView = true) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'branches', providers: [BranchListService], component: BranchListPage },
          { path: 'reports/branches/:id/holidays', component: Stub },
        ]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    giveHolidayListRight(holidayView);
    const harness = await RouterTestingHarness.create(url);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(isBranchesRequest).flush({ items: many.slice(0, 3), total: 3, page: 1, pageSize: 10 });
    harness.detectChanges();
    const el = harness.routeNativeElement as HTMLElement;
    const rows = Array.from(el.querySelectorAll<HTMLElement>('tbody tr'));
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a[data-slot="branch-holidays"]'));
    const cells = Array.from(el.querySelectorAll<HTMLElement>('[data-branch-holidays-cell]'));
    return { harness, el, rows, links, cells, router: TestBed.inject(Router) };
  }

  it('shows the calendar as an icon link per row, not a button, named after the branch', async () => {
    const { el, rows, links } = await open();

    expect(links).toHaveLength(rows.length);
    expect(el.querySelectorAll('button[data-slot="branch-holidays"]')).toHaveLength(0);
    expect(links[0].getAttribute('aria-label')).toBe('Holidays of Name 01');
    expect(links[0].getAttribute('title')).toBe('Holidays of Name 01');
    expect(links[0].getAttribute('href')).toBe('/reports/branches/C01/holidays?menuId=NS-HOLIDAYLIST');
    expect(links[0].querySelector('ng-icon')!.getAttribute('name')).toBe('appCalendarColor');
    expect(links[0].hasAttribute('hlmBtn')).toBe(false);
    expect(rows[0].lastElementChild!.contains(links[0])).toBe(true);
  });

  it('opens the branch holiday page from the icon, without changing the selection', async () => {
    const { harness, rows, links, router } = await open();
    rows[2].click();
    harness.detectChanges();

    links[0].click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/reports/branches/C01/holidays?menuId=NS-HOLIDAYLIST');
    expect(TestBed.inject(BranchListSelection).selectedId()).toBe('C03');
  });

  it('opens the branch holiday page from a click anywhere in the Holiday List cell, without changing the selection', async () => {
    const { harness, rows, cells, router } = await open();
    rows[2].click();
    harness.detectChanges();

    expect(cells[1].classList).toContain('cursor-pointer');
    cells[1].click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/reports/branches/C02/holidays?menuId=NS-HOLIDAYLIST');
    expect(TestBed.inject(BranchListSelection).selectedId()).toBe('C03');
  });

  it('opens only one holiday page when the icon itself is clicked', async () => {
    const { harness, links } = await open();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    links[0].click();
    await harness.fixture.whenStable();

    expect(navigate).not.toHaveBeenCalled(); // the link navigates itself; the cell does not repeat it
  });

  it("has no Holiday List column without the Holiday List's view right", async () => {
    const { el, rows, links, cells } = await open('/branches', false);

    expect(links).toHaveLength(0);
    expect(cells).toHaveLength(0);
    expect(Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim())).not.toContain('Holiday List');
    expect(rows[0].querySelectorAll('td')).toHaveLength(8);
  });

  it('keeps Enter and Space on the icon from selecting the row', async () => {
    const { harness, rows, links } = await open();

    for (const key of ['Enter', ' ']) {
      links[1].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      harness.detectChanges();
    }

    expect(rows[1].getAttribute('aria-selected')).toBe('false');
  });
});

