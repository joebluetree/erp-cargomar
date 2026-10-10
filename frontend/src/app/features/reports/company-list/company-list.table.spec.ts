import { Company, COLUMNS } from './company-list.model';
import { sortCompanies } from './company-list.table';

function company(code: string, name: string, extra: Partial<Company> = {}): Company {
  return { id: code, code, name, address1: '', address2: '', address3: '', tel: '', email: '', web: '', ...extra };
}

const sample = [company('B1', 'beta'), company('A1', 'Alpha'), company('C1', 'Gamma Trading')];

describe('sortCompanies', () => {
  it('sorts by name ascending ignoring case', () => {
    const sorted = sortCompanies(sample, { column: 'name', direction: 'asc' });
    expect(sorted.map((c) => c.name)).toEqual(['Alpha', 'beta', 'Gamma Trading']);
  });

  it('reverses for descending', () => {
    const sorted = sortCompanies(sample, { column: 'name', direction: 'desc' });
    expect(sorted.map((c) => c.name)).toEqual(['Gamma Trading', 'beta', 'Alpha']);
  });

  it('sorts by every column in both directions', () => {
    for (const { key } of COLUMNS) {
      const data = [company('1', 'n', { [key]: 'b' }), company('2', 'n', { [key]: 'C' }), company('3', 'n', { [key]: 'a' })];
      const asc = sortCompanies(data, { column: key, direction: 'asc' }).map((c) => c[key]);
      const desc = sortCompanies(data, { column: key, direction: 'desc' }).map((c) => c[key]);
      expect(asc).toEqual(['a', 'b', 'C']);
      expect(desc).toEqual(['C', 'b', 'a']);
    }
  });

  it('is stable for equal values and returns a copy', () => {
    const data = [company('1', 'same'), company('2', 'SAME'), company('3', 'same')];
    expect(sortCompanies(data, { column: 'name', direction: 'asc' }).map((c) => c.id)).toEqual(['1', '2', '3']);
    expect(sortCompanies(data, { column: 'name', direction: 'asc' })).not.toBe(data);
  });

  it('does not change its input', () => {
    const input = [...sample];
    sortCompanies(input, { column: 'name', direction: 'asc' });
    expect(input).toEqual(sample);
  });

  it('handles an empty page', () => {
    expect(sortCompanies([], { column: 'code', direction: 'asc' })).toEqual([]);
  });
});
