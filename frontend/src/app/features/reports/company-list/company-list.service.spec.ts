import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Company, CompanyListQuery } from './company-list.model';
import { CompanyListService } from './company-list.service';

const alpha: Company = { id: '1', code: 'A', name: 'Alpha', address1: '', address2: '', address3: '', tel: '', email: '', web: '' };
const query = (extra: Partial<CompanyListQuery> = {}): CompanyListQuery => ({ code: '', name: '', page: 1, pageSize: 10, ...extra });
const paged = (items: Company[], total = items.length, page = 1, pageSize = 10) => ({ items, total, page, pageSize });

describe('CompanyListService', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [CompanyListService, provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const expectRequest = () => http.expectOne((r: HttpRequest<unknown>) => r.url === 'reports/companies');
    return { service: TestBed.inject(CompanyListService), http, expectRequest };
  }

  it('starts idle and empty', () => {
    const { service } = setup();

    expect([service.items(), service.total(), service.loading(), service.error()]).toEqual([[], 0, false, false]);
  });

  it('requests reports/companies with the page and page size', () => {
    const { service, expectRequest } = setup();

    service.load(query({ page: 3, pageSize: 25 }));
    const req = expectRequest();

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.get('pageSize')).toBe('25');
    expect(service.loading()).toBe(true);
  });

  it('sends the filters, trimmed, and leaves out blank ones', () => {
    const { service, expectRequest } = setup();

    service.load(query({ code: '  ab ', name: '   ' }));
    const req = expectRequest();

    expect(req.request.params.get('code')).toBe('ab');
    expect(req.request.params.has('name')).toBe(false);
  });

  it('sends both filters when both are given', () => {
    const { service, expectRequest } = setup();

    service.load(query({ code: 'c', name: 'trad' }));
    const req = expectRequest();

    expect([req.request.params.get('code'), req.request.params.get('name')]).toEqual(['c', 'trad']);
  });

  it('exposes the rows and the total of the response', () => {
    const { service, expectRequest } = setup();

    service.load(query());
    expectRequest().flush(paged([alpha], 23));

    expect([service.items(), service.total(), service.loading(), service.error()]).toEqual([[alpha], 23, false, false]);
  });

  it('clears the old rows while the next page loads', () => {
    const { service, expectRequest } = setup();
    service.load(query());
    expectRequest().flush(paged([alpha], 23));

    service.load(query({ page: 2 }));

    expect(service.items()).toEqual([]);
    expect(service.loading()).toBe(true);
    expectRequest().flush(paged([], 23, 2));
  });

  it('records a failure and clears it on the next load', () => {
    const { service, expectRequest } = setup();

    service.load(query());
    expectRequest().flush(null, { status: 500, statusText: 'Server Error' });
    expect([service.items(), service.loading(), service.error()]).toEqual([[], false, true]);

    service.load(query());
    expect(service.error()).toBe(false);
    expectRequest().flush(paged([alpha]));
    expect(service.items()).toEqual([alpha]);
  });

  it('ignores a response that a newer load superseded', () => {
    const { service, http } = setup();

    service.load(query({ page: 1 }));
    service.load(query({ page: 2 }));
    const [first, second] = http.match((r: HttpRequest<unknown>) => r.url === 'reports/companies');
    second.flush(paged([alpha], 23, 2));
    first.flush(paged([{ ...alpha, id: 'stale' }], 99, 1));

    expect(service.items()).toEqual([alpha]);
    expect(service.total()).toBe(23);
  });
});
