import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { NETWORK_ERROR_MESSAGE, SERVER_ERROR_MESSAGE } from '../../../core/errors/api-error';
import { SKIP_ERROR_NOTIFICATION, httpErrorInterceptor } from '../../../core/errors/http-error.interceptor';
import { NotificationService } from '../../../core/notifications/notification.service';
import { EmployeeProfileService } from './employee-profile.service';
import { PROFILE } from './employee-profile.testing';

describe('EmployeeProfileService', () => {
  const notifications = { error: vi.fn() };

  function setup() {
    notifications.error.mockReset();
    TestBed.configureTestingModule({
      providers: [
        EmployeeProfileService,
        // The real error interceptor, so the spec proves the request opts out of its notification.
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    return { service: TestBed.inject(EmployeeProfileService), http, expectRequest: () => http.expectOne('admin/profile') };
  }

  const state = (service: EmployeeProfileService) => [service.profile(), service.loading(), service.notLinked(), service.error()];

  it('starts idle and empty', () => {
    const { service } = setup();

    expect(state(service)).toEqual([null, false, false, false]);
  });

  it('requests admin/profile with no parameters and without the interceptor notification', () => {
    const { service, expectRequest } = setup();

    service.load();
    const req = expectRequest();

    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
    expect(service.loading()).toBe(true);
  });

  it('exposes the loaded profile', () => {
    const { service, expectRequest } = setup();

    service.load();
    expectRequest().flush(PROFILE);

    expect(state(service)).toEqual([PROFILE, false, false, false]);
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('treats 404 as no linked employee, without a notification', () => {
    const { service, expectRequest } = setup();

    service.load();
    expectRequest().flush({ status: 404, title: 'No employee profile is linked to this user.' }, { status: 404, statusText: 'Not Found' });

    expect(state(service)).toEqual([null, false, true, false]);
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('shows one notification and an error for a server failure', () => {
    const { service, expectRequest } = setup();

    service.load();
    expectRequest().flush({ status: 500 }, { status: 500, statusText: 'Server Error' });

    expect(state(service)).toEqual([null, false, false, true]);
    expect(notifications.error).toHaveBeenCalledExactlyOnceWith(SERVER_ERROR_MESSAGE);
  });

  it('shows one notification and an error when the server cannot be reached', () => {
    const { service, expectRequest } = setup();

    service.load();
    expectRequest().error(new ProgressEvent('error'));

    expect(service.error()).toBe(true);
    expect(notifications.error).toHaveBeenCalledExactlyOnceWith(NETWORK_ERROR_MESSAGE);
  });

  it('clears the previous state when it loads again', () => {
    const { service, expectRequest } = setup();
    service.load();
    expectRequest().flush({ status: 500 }, { status: 500, statusText: 'Server Error' });

    service.load();

    expect(state(service)).toEqual([null, true, false, false]);
    expectRequest().flush(PROFILE);
    expect(service.profile()).toEqual(PROFILE);
  });

  it('ignores an answer that a newer load superseded', () => {
    const { service, http } = setup();

    service.load();
    service.load();
    const [first, second] = http.match('admin/profile');
    second.flush(PROFILE);
    first.flush({ status: 404 }, { status: 404, statusText: 'Not Found' });

    expect(state(service)).toEqual([PROFILE, false, false, false]);
  });

  describe('the photo', () => {
    const urls = { create: vi.fn(() => 'blob:photo-1'), revoke: vi.fn() };

    beforeEach(() => {
      urls.create.mockClear();
      urls.revoke.mockClear();
      vi.stubGlobal('URL', { ...URL, createObjectURL: urls.create, revokeObjectURL: urls.revoke });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('is not requested when the profile has no photo', () => {
      const { service, http, expectRequest } = setup();

      service.load();
      expectRequest().flush(PROFILE);

      http.expectNone('admin/profile/photo');
      expect(service.photoUrl()).toBeNull();
    });

    it('is fetched as a blob, without the interceptor notification, and kept as an object URL', () => {
      const { service, http, expectRequest } = setup();

      service.load();
      expectRequest().flush({ ...PROFILE, hasPhoto: true });
      const req = http.expectOne('admin/profile/photo');
      expect(req.request.responseType).toBe('blob');
      expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
      req.flush(new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' }));

      expect(service.photoUrl()).toBe('blob:photo-1');
      expect(urls.create).toHaveBeenCalledOnce();
    });

    it('keeps no URL and shows no notification when the photo fails', () => {
      const { service, http, expectRequest } = setup();

      service.load();
      expectRequest().flush({ ...PROFILE, hasPhoto: true });
      http.expectOne('admin/profile/photo').flush(new Blob(), { status: 404, statusText: 'Not Found' });

      expect(service.photoUrl()).toBeNull();
      expect(notifications.error).not.toHaveBeenCalled();
      expect(service.error()).toBe(false);
    });

    it('frees the object URL when released and when the profile loads again', () => {
      const { service, http, expectRequest } = setup();
      service.load();
      expectRequest().flush({ ...PROFILE, hasPhoto: true });
      http.expectOne('admin/profile/photo').flush(new Blob());

      service.load();

      expect(urls.revoke).toHaveBeenCalledWith('blob:photo-1');
      expect(service.photoUrl()).toBeNull();
      expectRequest().flush(PROFILE);
      service.releasePhoto();
      expect(urls.revoke).toHaveBeenCalledOnce();
    });
  });
  describe('a listed employee', () => {
    beforeEach(() => vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:photo-2'), revokeObjectURL: vi.fn() }));
    afterEach(() => vi.unstubAllGlobals());

    it('requests admin/employees/{id}, encoded, and the photo of that employee', () => {
      const { service, http } = setup();

      service.load('e 9/1');
      const req = http.expectOne('admin/employees/e%209%2F1');
      expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
      req.flush({ ...PROFILE, hasPhoto: true });
      http.expectOne('admin/employees/e%209%2F1/photo').flush(new Blob());

      http.expectNone('admin/profile');
      expect(service.profile()).toEqual({ ...PROFILE, hasPhoto: true });
      expect(service.photoUrl()).toBe('blob:photo-2');
    });

    it('treats 404 as not found, without a notification', () => {
      const { service, http } = setup();

      service.load('e-other');
      http.expectOne('admin/employees/e-other').flush({ title: 'Employee not found.' }, { status: 404, statusText: 'Not Found' });

      expect(state(service)).toEqual([null, false, true, false]);
      expect(notifications.error).not.toHaveBeenCalled();
    });
  });
});
