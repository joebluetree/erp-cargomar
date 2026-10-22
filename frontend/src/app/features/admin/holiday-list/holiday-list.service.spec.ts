import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SERVER_ERROR_MESSAGE } from '../../../core/errors/api-error';
import { SKIP_ERROR_NOTIFICATION, httpErrorInterceptor } from '../../../core/errors/http-error.interceptor';
import { NotificationService } from '../../../core/notifications/notification.service';
import { Holiday } from './holiday-list.model';
import { HolidayListService } from './holiday-list.service';

const HOLIDAYS: Holiday[] = [
  { holiday: 'Republic Day', day: 'Monday', date: '26-01-2026' },
  { holiday: 'Local festival', day: null, date: null },
];

describe('HolidayListService', () => {
  const notifications = { error: vi.fn() };

  function setup() {
    notifications.error.mockReset();
    TestBed.configureTestingModule({
      providers: [
        HolidayListService,
        // The real error interceptor, so the spec proves the request opts out of its notification.
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    return { service: TestBed.inject(HolidayListService), http, expectRequest: () => http.expectOne('admin/holidays') };
  }

  const state = (service: HolidayListService) => [service.items(), service.loading(), service.notFound(), service.error()];

  it('starts idle and empty', () => {
    const { service } = setup();

    expect(state(service)).toEqual([[], false, false, false]);
  });

  it('requests admin/holidays with no parameters and without the interceptor notification', () => {
    const { service, expectRequest } = setup();

    service.load();
    const req = expectRequest();

    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
    expect(service.loading()).toBe(true);
  });

  it('exposes the holidays in the order received', () => {
    const { service, expectRequest } = setup();

    service.load();
    expectRequest().flush({ items: HOLIDAYS });

    expect(state(service)).toEqual([HOLIDAYS, false, false, false]);
  });

  it('treats 404 as no holiday list, without a notification', () => {
    const { service, expectRequest } = setup();

    service.load();
    expectRequest().flush({ status: 404, title: 'Holiday list not found.' }, { status: 404, statusText: 'Not Found' });

    expect(state(service)).toEqual([[], false, true, false]);
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('shows one notification and an error for another failure', () => {
    const { service, expectRequest } = setup();

    service.load();
    expectRequest().flush(null, { status: 500, statusText: 'Server Error' });

    expect(state(service)).toEqual([[], false, false, true]);
    expect(notifications.error).toHaveBeenCalledOnce();
    expect(notifications.error).toHaveBeenCalledWith(SERVER_ERROR_MESSAGE);
  });

  it('clears the previous state when it loads again', () => {
    const { service, expectRequest } = setup();
    service.load();
    expectRequest().flush({ status: 404 }, { status: 404, statusText: 'Not Found' });

    service.load();

    expect(state(service)).toEqual([[], true, false, false]);
    expectRequest().flush({ items: HOLIDAYS });
  });

  it('ignores an answer that a newer load superseded', () => {
    const { service, http } = setup();

    service.load();
    service.load();
    const [first, second] = http.match('admin/holidays');
    second.flush({ items: HOLIDAYS });
    first.flush({ branchCode: 'X', branchName: 'Stale', items: [{ holiday: 'stale', day: null, date: null }] });

    expect(service.items()).toEqual(HOLIDAYS);
  });

  describe('a listed branch', () => {
    it('requests reports/branches/{id}/holidays, encoded, and keeps the branch', () => {
      const { service, http } = setup();

      service.load('b 2/x');
      const req = http.expectOne('reports/branches/b%202%2Fx/holidays');
      expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
      expect(service.branch()).toBeNull();
      req.flush({ branchCode: 'BLRAF', branchName: 'Bangalore', items: HOLIDAYS });

      http.expectNone('admin/holidays');
      expect(service.branch()).toEqual({ code: 'BLRAF', name: 'Bangalore' });
      expect(service.items()).toEqual(HOLIDAYS);
    });

    it('treats 404 as not found, without a notification, and keeps no branch', () => {
      const { service, http } = setup();

      service.load('b-other');
      http.expectOne('reports/branches/b-other/holidays').flush({ title: 'Holiday list not found.' }, { status: 404, statusText: 'Not Found' });

      expect([service.notFound(), service.branch()]).toEqual([true, null]);
      expect(notifications.error).not.toHaveBeenCalled();
    });

    it('keeps the branch of the session\'s own list too', () => {
      const { service, expectRequest } = setup();

      service.load();
      expectRequest().flush({ branchCode: 'COKSF', branchName: 'Kochi Sea', items: HOLIDAYS });

      expect(service.branch()).toEqual({ code: 'COKSF', name: 'Kochi Sea' });
    });
  });
});

