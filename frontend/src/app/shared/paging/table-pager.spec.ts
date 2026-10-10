import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TablePager } from './table-pager';

describe('TablePager', () => {
  let fixture: ComponentFixture<TablePager>;
  let el: HTMLElement;
  let pages: number[];
  let sizes: number[];

  function create(total: number, page: number, pageSize = 10) {
    TestBed.configureTestingModule({ imports: [TablePager] });
    fixture = TestBed.createComponent(TablePager);
    fixture.componentRef.setInput('total', total);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('pageSize', pageSize);
    pages = [];
    sizes = [];
    fixture.componentInstance.pageChange.subscribe((p) => pages.push(p));
    fixture.componentInstance.pageSizeChange.subscribe((s) => sizes.push(s));
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  const button = (name: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
  const range = () => el.querySelector('[aria-live]')?.textContent?.replace(/\s+/g, ' ').trim();
  const disabled = () => ['First page', 'Previous page', 'Next page', 'Last page'].map((n) => button(n).disabled);
  const pageNumber = () => el.querySelector('[data-slot="page-number"]')?.textContent?.replace(/\s+/g, ' ').trim();

  it('reports the rows shown out of the total', () => {
    create(23, 1);
    expect(range()).toBe('Showing 1–10 of 23');

    fixture.componentRef.setInput('page', 3);
    fixture.detectChanges();
    expect(range()).toBe('Showing 21–23 of 23');
  });

  it('shows the page number out of the number of pages', () => {
    create(23, 1);
    expect(pageNumber()).toBe('Page 1 of 3');

    fixture.componentRef.setInput('page', 3);
    fixture.detectChanges();
    expect(pageNumber()).toBe('Page 3 of 3');
  });

  it('follows the page size when working out the number of pages', () => {
    create(4, 1, 2);
    expect(pageNumber()).toBe('Page 1 of 2');

    fixture.componentRef.setInput('pageSize', 5);
    fixture.detectChanges();
    expect(pageNumber()).toBe('Page 1 of 1');
  });

  it('shows page 1 of 1 when nothing matches or everything fits on one page', () => {
    create(0, 1);
    expect(pageNumber()).toBe('Page 1 of 1');

    fixture.componentRef.setInput('total', 4);
    fixture.detectChanges();
    expect(pageNumber()).toBe('Page 1 of 1');
  });

  it('lays all the footer content out left-aligned in one wrapping row with wide gaps', () => {
    create(23, 1);

    const row = el.querySelector('[data-slot="table-pager"]')!;
    const classes = Array.from(row.classList);
    expect(classes).toContain('flex');
    expect(classes).toContain('flex-wrap');
    expect(classes).toContain('justify-start');
    expect(classes).not.toContain('justify-between');
    expect(classes).not.toContain('justify-end');
    expect(classes).not.toContain('ml-auto');
    // The range text, the page buttons and, last, the page size are the three direct parts of that row, in this order.
    expect(Array.from(row.children).map((c) => c.tagName + (c.querySelector('select') ? ':size' : c.querySelector('button') ? ':buttons' : ':range'))).toEqual([
      'P:range',
      'DIV:buttons',
      'DIV:size',
    ]);
    // Generous spacing between the parts (at least gap-x-8) and between the buttons.
    expect(classes.some((c) => /^gap-x-(8|9|10|12|14|16)$/.test(c))).toBe(true);
    expect(row.children[1].classList.contains('gap-3')).toBe(true);
    // Nothing is pushed to the right.
    expect(row.querySelector('.ml-auto, .justify-end, .justify-between')).toBeNull();
  });

  it('draws a separator directly above and directly below the footer row', () => {
    create(23, 1);

    const row = el.querySelector('[data-slot="table-pager"]')!;
    expect(row.previousElementSibling?.tagName).toBe('HR');
    expect(row.nextElementSibling?.tagName).toBe('HR');
    // The separators are the only things around the row: above, the row, below.
    expect(Array.from(el.children).map((c) => c.tagName)).toEqual(['HR', 'DIV', 'HR']);
  });

  it('puts Rows per page last, after the page buttons', () => {
    create(23, 1);

    const row = el.querySelector('[data-slot="table-pager"]')!;
    const last = row.lastElementChild!;
    expect(last.querySelector('#page-size')).not.toBeNull();
    expect(last.textContent).toContain('Rows per page');
    expect(row.querySelector('[data-slot="page-number"]')!.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // It stays at the left with the rest: it follows the buttons directly instead of being pushed to the right edge.
    expect(last.classList).not.toContain('ml-auto');
  });

  it('puts the page number between Previous and Next', () => {
    create(23, 2);

    const order = Array.from(el.querySelectorAll('button[aria-label], [data-slot="page-number"]')).map(
      (e) => e.getAttribute('aria-label') ?? 'page-number',
    );
    expect(order).toEqual(['First page', 'Previous page', 'page-number', 'Next page', 'Last page']);
  });

  it('says there are no rows when nothing matches', () => {
    create(0, 1);

    expect(range()).toBe('No rows');
    expect(disabled()).toEqual([true, true, true, true]);
  });

  it('disables First and Previous on the first page', () => {
    create(23, 1);

    expect(disabled()).toEqual([true, true, false, false]);
  });

  it('disables Next and Last on the last page', () => {
    create(23, 3);

    expect(disabled()).toEqual([false, false, true, true]);
  });

  it('enables all four in the middle', () => {
    create(23, 2);

    expect(disabled()).toEqual([false, false, false, false]);
  });

  it('disables all four when everything fits on one page', () => {
    create(4, 1);

    expect(disabled()).toEqual([true, true, true, true]);
  });

  it('emits the page that each button leads to', () => {
    create(45, 3);

    button('First page').click();
    button('Previous page').click();
    button('Next page').click();
    button('Last page').click();

    expect(pages).toEqual([1, 2, 4, 5]);
  });

  it('offers the agreed page sizes and shows the current one', () => {
    create(23, 1, 25);

    const select = el.querySelector<HTMLSelectElement>('#page-size')!;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual(['2', '5', '10', '25', '50', '100']);
    expect(select.value).toBe('25');
  });

  it('emits the chosen page size as a number', () => {
    create(23, 2);

    const select = el.querySelector<HTMLSelectElement>('#page-size')!;
    select.value = '50';
    select.dispatchEvent(new Event('change'));

    expect(sizes).toEqual([50]);
    expect(pages).toEqual([]);
  });

  it('gives the page size a visible label and the buttons accessible names', () => {
    create(23, 1);

    expect(el.querySelector('label[for="page-size"]')?.textContent).toContain('Rows per page');
    expect(Array.from(el.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual([
      'First page',
      'Previous page',
      'Next page',
      'Last page',
    ]);
  });
});
