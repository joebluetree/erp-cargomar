import { DEFAULT_PAGE_SIZE, PAGE_SIZES, rangeOf } from './paged';

describe('rangeOf', () => {
  it('covers the first page', () => {
    expect(rangeOf(23, 1, 10)).toEqual({ pageCount: 3, from: 1, to: 10 });
  });

  it('covers a middle page', () => {
    expect(rangeOf(23, 2, 10)).toEqual({ pageCount: 3, from: 11, to: 20 });
  });

  it('stops at the total on a partial last page', () => {
    expect(rangeOf(23, 3, 10)).toEqual({ pageCount: 3, from: 21, to: 23 });
  });

  it('has one page and no rows when nothing matches', () => {
    expect(rangeOf(0, 1, 10)).toEqual({ pageCount: 1, from: 0, to: 0 });
  });

  it('has one page when everything fits', () => {
    expect(rangeOf(4, 1, 10)).toEqual({ pageCount: 1, from: 1, to: 4 });
    expect(rangeOf(10, 1, 10)).toEqual({ pageCount: 1, from: 1, to: 10 });
    expect(rangeOf(11, 1, 10).pageCount).toBe(2);
  });

  it('shows no rows for a page past the end or before the start', () => {
    expect(rangeOf(23, 4, 10)).toEqual({ pageCount: 3, from: 0, to: 0 });
    expect(rangeOf(23, 0, 10)).toEqual({ pageCount: 3, from: 0, to: 0 });
  });

  it('offers the agreed page sizes with 10 as the default', () => {
    expect([...PAGE_SIZES]).toEqual([2, 5, 10, 25, 50, 100]);
    expect(PAGE_SIZES).toContain(DEFAULT_PAGE_SIZE);
    expect(DEFAULT_PAGE_SIZE).toBe(10);
  });
});
