import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Announcement } from '../../../core/announcement/announcement.model';
import { SERVER_ERROR_MESSAGE } from '../../../core/errors/api-error';
import { SKIP_ERROR_NOTIFICATION, httpErrorInterceptor } from '../../../core/errors/http-error.interceptor';
import { SKIP_LOADING } from '../../../core/loading/loading.interceptor';
import { NotificationService } from '../../../core/notifications/notification.service';
import { NotificationScreenService } from './notification.service';

const ANNOUNCEMENT: Announcement = {
  id: 7,
  banner: 'Festival bonus',
  heading: 'Office closed on Friday',
  content: 'Closed.',
  createdDate: '2026-10-28T10:15:00',
};

describe('NotificationScreenService', () => {
  const notifications = { error: vi.fn() };

  function setup() {
    notifications.error.mockReset();
    TestBed.configureTestingModule({
      providers: [
        NotificationScreenService,
        // The real error interceptor, so the spec proves the request opts out of its notification.
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    return { service: TestBed.inject(NotificationScreenService), http, expectRequest: () => http.expectOne('admin/notification') };
  }

  const state = (service: NotificationScreenService) => [service.announcement(), service.loading(), service.notFound(), service.error()];

  it('starts idle and empty', () => {
    expect(state(setup().service)).toEqual([null, false, false, false]);
  });

  it('loads the latest announcement with the spinner and without the interceptor\'s notification', () => {
    const { service, expectRequest } = setup();
    service.load();
    expect(state(service)).toEqual([null, true, false, false]);

    const req = expectRequest();
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SKIP_LOADING)).toBe(false);
    expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
    req.flush(ANNOUNCEMENT);

    expect(state(service)).toEqual([ANNOUNCEMENT, false, false, false]);
  });

  it('treats 404 as no announcement, with no notification', () => {
    const { service, expectRequest } = setup();
    service.load();
    expectRequest().flush({ title: 'Notification not found.' }, { status: 404, statusText: 'Not Found' });

    expect(state(service)).toEqual([null, false, true, false]);
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('marks any other failure as an error and notifies once', () => {
    const { service, expectRequest } = setup();
    service.load();
    expectRequest().flush('boom', { status: 500, statusText: 'Server Error' });

    expect(state(service)).toEqual([null, false, false, true]);
    expect(notifications.error).toHaveBeenCalledExactlyOnceWith(SERVER_ERROR_MESSAGE);
  });

  it('drops an older answer when a newer load has started', () => {
    const { service, http } = setup();
    service.load();
    service.load();
    const [first, second] = http.match('admin/notification');

    second.flush({ ...ANNOUNCEMENT, heading: 'Newer' });
    first.flush(ANNOUNCEMENT);

    expect(service.announcement()?.heading).toBe('Newer');
  });
});
