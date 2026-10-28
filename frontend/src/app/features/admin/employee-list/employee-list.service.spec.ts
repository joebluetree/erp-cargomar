import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Employee, EmployeeListQuery } from './employee-list.model';
import { EmployeeListService } from './employee-list.service';

const asha: Employee = {
  id: 'e-1', code: '1001', name: 'Asha Nair', fatherName: null, dateOfBirth: '1990-03-05', address: null, mobile: null, email: null,
};
const query = (extra: Partial<EmployeeListQuery> = {}): EmployeeListQuery => ({ code: '', name: '', status: 'active', page: 1, pageSize: 10, ...extra });
const paged = (items: Employee[], total = items.length, page = 1, pageSize = 10) => ({ items, total, page, pageSize });

describe('EmployeeListService', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [EmployeeListService, provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const expectRequest = () => http.expectOne((r: HttpRequest<unknown>) => r.url === 'admin/employees');
    return { service: TestBed.inject(EmployeeListService), http, expectRequest };
  }

  it('starts idle and empty', () => {
    const { service } = setup();

    expect([service.items(), service.total(), service.loading(), service.error()]).toEqual([[], 0, false, false]);
  });

  it('requests admin/employees with the page and page size', () => {
    const { service, expectRequest } = setup();

    service.load(query({ page: 3, pageSize: 25 }));
    const req = expectRequest();

    expect(req.request.method).toBe('GET');
    expect([req.request.params.get('page'), req.request.params.get('pageSize')]).toEqual(['3', '25']);
    expect(service.loading()).toBe(true);
  });

  it.each(['active', 'relieved', 'all'] as const)('sends the status %s', (status) => {
    const { service, expectRequest } = setup();

    service.load(query({ status }));

    expect(expectRequest().request.params.get('status')).toBe(status);
  });

  it('sends the filters, trimmed, and leaves out blank ones', () => {
    const { service, expectRequest } = setup();

    service.load(query({ code: '  10 ', name: '   ' }));
    const req = expectRequest();

    expect(req.request.params.get('code')).toBe('10');
    expect(req.request.params.has('name')).toBe(false);
  });

  it('sends both filters when both are given', () => {
    const { service, expectRequest } = setup();

    service.load(query({ code: '10', name: 'kum' }));
    const req = expectRequest();

    expect([req.request.params.get('code'), req.request.params.get('name')]).toEqual(['10', 'kum']);
  });

  it('exposes the rows and the total of the response', () => {
    const { service, expectRequest } = setup();

    service.load(query());
    expectRequest().flush(paged([asha], 23));

    expect([service.items(), service.total(), service.loading(), service.error()]).toEqual([[asha], 23, false, false]);
  });

  it('records a failure and clears it on the next load', () => {
    const { service, expectRequest } = setup();

    service.load(query());
    expectRequest().flush(null, { status: 500, statusText: 'Server Error' });
    expect([service.items(), service.loading(), service.error()]).toEqual([[], false, true]);

    service.load(query());
    expect(service.error()).toBe(false);
    expectRequest().flush(paged([asha]));
    expect(service.items()).toEqual([asha]);
  });

  it('ignores a response that a newer load superseded', () => {
    const { service, http } = setup();

    service.load(query({ page: 1 }));
    service.load(query({ page: 2 }));
    const [first, second] = http.match((r: HttpRequest<unknown>) => r.url === 'admin/employees');
    second.flush(paged([asha], 23, 2));
    first.flush(paged([{ ...asha, id: 'stale' }], 99, 1));

    expect(service.items()).toEqual([asha]);
    expect(service.total()).toBe(23);
  });
});
