import { COLUMNS, Employee } from './employee-list.model';
import { sortEmployees } from './employee-list.table';

function employee(id: string, name: string | null, extra: Partial<Employee> = {}): Employee {
  return { id, code: id, name, fatherName: null, dateOfBirth: null, address: null, mobile: null, email: null, branch: null, ...extra };
}

const sample = [employee('2', 'bala'), employee('1', 'Anu'), employee('3', 'Gopi Kumar')];

describe('sortEmployees', () => {
  it('sorts by name ascending ignoring case, and reverses for descending', () => {
    expect(sortEmployees(sample, { column: 'name', direction: 'asc' }).map((e) => e.name)).toEqual(['Anu', 'bala', 'Gopi Kumar']);
    expect(sortEmployees(sample, { column: 'name', direction: 'desc' }).map((e) => e.name)).toEqual(['Gopi Kumar', 'bala', 'Anu']);
  });

  it('sorts by every column in both directions', () => {
    for (const { key } of COLUMNS) {
      const data = [employee('1', 'n', { [key]: 'b' }), employee('2', 'n', { [key]: 'C' }), employee('3', 'n', { [key]: 'a' })];
      expect(sortEmployees(data, { column: key, direction: 'asc' }).map((e) => e[key])).toEqual(['a', 'b', 'C']);
      expect(sortEmployees(data, { column: key, direction: 'desc' }).map((e) => e[key])).toEqual(['C', 'b', 'a']);
    }
  });

  it('orders dates by date', () => {
    const data = [employee('1', 'n', { dateOfBirth: '1990-03-05' }), employee('2', 'n', { dateOfBirth: '1973-09-28' }), employee('3', 'n', { dateOfBirth: '1990-01-31' })];

    expect(sortEmployees(data, { column: 'dateOfBirth', direction: 'asc' }).map((e) => e.id)).toEqual(['2', '3', '1']);
  });

  it('puts empty values first when ascending and last when descending', () => {
    const data = [employee('1', 'n', { email: 'b@x.com' }), employee('2', 'n'), employee('3', 'n', { email: 'a@x.com' })];

    expect(sortEmployees(data, { column: 'email', direction: 'asc' }).map((e) => e.id)).toEqual(['2', '3', '1']);
    expect(sortEmployees(data, { column: 'email', direction: 'desc' }).map((e) => e.id)).toEqual(['1', '3', '2']);
  });

  it('is stable for equal values, returns a copy and does not change its input', () => {
    const data = [employee('1', 'same'), employee('2', 'SAME'), employee('3', 'same')];
    const input = [...data];

    const sorted = sortEmployees(data, { column: 'name', direction: 'asc' });

    expect(sorted.map((e) => e.id)).toEqual(['1', '2', '3']);
    expect(sorted).not.toBe(data);
    expect(data).toEqual(input);
  });
});
