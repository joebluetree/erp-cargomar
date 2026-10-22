import { Branch, COLUMNS } from './branch-list.model';
import { sortBranches } from './branch-list.table';

function branch(code: string, name: string, extra: Partial<Branch> = {}): Branch {
  return { id: code, code, name, address1: '', address2: '', address3: '', tel: '', email: '', web: '', ...extra };
}

const sample = [branch('B1', 'beta'), branch('A1', 'Alpha'), branch('C1', 'Gamma Trading')];

describe('sortBranches', () => {
  it('sorts by name ascending ignoring case', () => {
    const sorted = sortBranches(sample, { column: 'name', direction: 'asc' });
    expect(sorted.map((c) => c.name)).toEqual(['Alpha', 'beta', 'Gamma Trading']);
  });

  it('reverses for descending', () => {
    const sorted = sortBranches(sample, { column: 'name', direction: 'desc' });
    expect(sorted.map((c) => c.name)).toEqual(['Gamma Trading', 'beta', 'Alpha']);
  });

  it('sorts by every column in both directions', () => {
    for (const { key } of COLUMNS) {
      const data = [branch('1', 'n', { [key]: 'b' }), branch('2', 'n', { [key]: 'C' }), branch('3', 'n', { [key]: 'a' })];
      const asc = sortBranches(data, { column: key, direction: 'asc' }).map((c) => c[key]);
      const desc = sortBranches(data, { column: key, direction: 'desc' }).map((c) => c[key]);
      expect(asc).toEqual(['a', 'b', 'C']);
      expect(desc).toEqual(['C', 'b', 'a']);
    }
  });

  it('is stable for equal values and returns a copy', () => {
    const data = [branch('1', 'same'), branch('2', 'SAME'), branch('3', 'same')];
    expect(sortBranches(data, { column: 'name', direction: 'asc' }).map((c) => c.id)).toEqual(['1', '2', '3']);
    expect(sortBranches(data, { column: 'name', direction: 'asc' })).not.toBe(data);
  });

  it('does not change its input', () => {
    const input = [...sample];
    sortBranches(input, { column: 'name', direction: 'asc' });
    expect(input).toEqual(sample);
  });

  it('handles an empty page', () => {
    expect(sortBranches([], { column: 'code', direction: 'asc' })).toEqual([]);
  });
});
