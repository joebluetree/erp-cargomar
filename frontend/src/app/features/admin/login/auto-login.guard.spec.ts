import { Component } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { AuthSession } from '../../../core/auth/auth-session';
import { httpErrorInterceptor } from '../../../core/errors/http-error.interceptor';
import { NotificationService } from '../../../core/notifications/notification.service';
import { LOGIN_ROUTES } from './login.routes';
import { LOGIN_RESPONSE } from './login.testing';
import { REMEMBERED_LOGIN_KEY } from './remembered-login';

@Component({ template: '<p id="dashboard">Dashboard</p>' })
class Dashboard {}

describe('autoLoginGuard', () => {
  const notifications = { error: vi.fn(), warn: vi.fn(), success: vi.fn() };
  let controller: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    Object.values(notifications).forEach((n) => n.mockReset());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', children: LOGIN_ROUTES },
          { path: '', component: Dashboard },
        ]),
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  /** Starts navigating to the URL without waiting, as a browser opening the link. */
  async function open(url: string) {
    const harness = await RouterTestingHarness.create();
    const done = harness.navigateByUrl(url);
    await new Promise((resolve) => setTimeout(resolve));
    return { harness, done, el: () => harness.routeNativeElement as HTMLElement | null };
  }

  const loginForm = () => document.querySelector('#login-user-code');

  it('sends the trimmed id without showing the login screen, then opens the Dashboard with the session', async () => {
    const { harness, done, el } = await open('/login?appid=%20app-1%20');

    const req = controller.expectOne('admin/login/auto');
    expect(req.request.body).toEqual({ appId: 'app-1' });
    expect(loginForm()).toBeNull(); // nothing of the login screen while the request runs

    req.flush(LOGIN_RESPONSE);
    await done;
    harness.detectChanges();

    expect(router.url).toBe('/');
    expect(el()?.querySelector('#dashboard')).toBeTruthy();
    expect(loginForm()).toBeNull();
    expect(TestBed.inject(AuthSession).session()?.branchName).toBe(LOGIN_RESPONSE.session.branchName);
    expect(notifications.warn).not.toHaveBeenCalled();
    // The id is not kept: the redirect replaces the address that carried it.
    expect(router.lastSuccessfulNavigation()?.extras.replaceUrl).toBe(true);
  });

  it('neither reads nor changes Remember me', async () => {
    const stored = JSON.stringify({ userCode: 'admin', password: 'secret', companyCode: 'CMP' });
    localStorage.setItem(REMEMBERED_LOGIN_KEY, stored);
    const { done } = await open('/login?appid=app-1');

    controller.expectOne('admin/login/auto').flush(LOGIN_RESPONSE);
    await done;

    expect(localStorage.getItem(REMEMBERED_LOGIN_KEY)).toBe(stored);
    controller.expectNone('admin/login');
  });

  it.each([
    ['refused', { status: 401, statusText: 'Unauthorized' }],
    ['unreachable', { status: 0, statusText: 'Unknown Error' }],
  ])('opens the normal login screen, without the id, with one warning when the automatic login is %s', async (_, failure) => {
    const { harness, done } = await open('/login?appid=app-1');

    controller.expectOne('admin/login/auto').flush({ title: 'Automatic login failed. Please log in.' }, failure);
    await done;
    harness.detectChanges();

    expect(router.url).toBe('/login');
    expect(loginForm()).toBeTruthy();
    expect(notifications.warn).toHaveBeenCalledExactlyOnceWith('Automatic login failed. Please log in.');
    expect(notifications.error).not.toHaveBeenCalled();
    expect(TestBed.inject(AuthSession).isLoggedIn()).toBe(false);
    expect(router.lastSuccessfulNavigation()?.extras.replaceUrl).toBe(true);
  });

  it('opens the login screen without the parameter and sends nothing for a blank id', async () => {
    const { harness, done } = await open('/login?appid=%20');
    await done;
    harness.detectChanges();

    expect(router.url).toBe('/login');
    expect(loginForm()).toBeTruthy();
    controller.expectNone('admin/login/auto');
  });

  it('opens the login screen as usual without the parameter', async () => {
    const { harness, done } = await open('/login');
    await done;
    harness.detectChanges();

    expect(loginForm()).toBeTruthy();
    controller.expectNone('admin/login/auto');
  });
});
