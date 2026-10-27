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
import { TEST_MENU } from '../../../core/navigation/menu.testing';
import { MENU_NOT_AVAILABLE_MESSAGE } from './auto-login.guard';
import { LOGIN_ROUTES } from './login.routes';
import { LOGIN_RESPONSE } from './login.testing';
import { REMEMBERED_LOGIN_KEY } from './remembered-login';

@Component({ template: '<p id="dashboard">Dashboard</p>' })
class Dashboard {}

@Component({ template: '<p id="profile">Profile</p>' })
class Profile {}

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
          { path: 'admin/profile', component: Profile },
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

  describe('with a menu id', () => {
    /** Logs in from the link, answers the menu request with the given modules (or a failure), and waits. */
    async function openWithMenu(url: string, menu: object | null = { modules: TEST_MENU }, failure?: object) {
      const opened = await open(url);
      controller.expectOne('admin/login/auto').flush(LOGIN_RESPONSE);
      await new Promise((resolve) => setTimeout(resolve));
      controller.expectOne('admin/menu').flush(menu, failure);
      await opened.done;
      opened.harness.detectChanges();
      return opened;
    }

    it('opens the linked menu in place of the Dashboard, at its normal address', async () => {
      const { el } = await openWithMenu('/login?appid=app-1&menuid=NS-EMPPROFILE');

      expect(router.url).toBe('/admin/profile?menuId=NS-EMPPROFILE');
      expect(el()?.querySelector('#profile')).toBeTruthy();
      expect(loginForm()).toBeNull();
      expect(notifications.warn).not.toHaveBeenCalled();
      expect(router.lastSuccessfulNavigation()?.extras.replaceUrl).toBe(true);
    });

    it('finds the code in any case and with spaces', async () => {
      await openWithMenu('/login?appid=app-1&menuid=%20ns-empprofile%20');

      expect(router.url).toBe('/admin/profile?menuId=NS-EMPPROFILE');
      expect(notifications.warn).not.toHaveBeenCalled();
    });

    it('also reads the parameter as menuId', async () => {
      await openWithMenu('/login?appid=app-1&menuId=NS-EMPPROFILE');

      expect(router.url).toBe('/admin/profile?menuId=NS-EMPPROFILE');
    });

    it('opens the Dashboard without a warning, and loads no menu, for a blank menu id', async () => {
      const { harness, done, el } = await open('/login?appid=app-1&menuid=%20');
      controller.expectOne('admin/login/auto').flush(LOGIN_RESPONSE);
      await done;
      harness.detectChanges();

      expect(router.url).toBe('/');
      expect(el()?.querySelector('#dashboard')).toBeTruthy();
      expect(notifications.warn).not.toHaveBeenCalled();
      controller.expectNone('admin/menu');
    });

    it.each([
      ['an unknown code', 'NO-SUCH-MENU', { modules: TEST_MENU }],
      // A menu without the view right is not in the user's menu.
      ['a menu without the view right', 'NS-EMPLIST', { modules: [{ ...TEST_MENU[0], menus: TEST_MENU[0].menus.slice(0, 3) }] }],
    ])('opens the Dashboard with one warning, keeping the session, for %s', async (_, code, menu) => {
      const { el } = await openWithMenu(`/login?appid=app-1&menuid=${code}`, menu);

      expect(router.url).toBe('/');
      expect(el()?.querySelector('#dashboard')).toBeTruthy();
      expect(notifications.warn).toHaveBeenCalledExactlyOnceWith(MENU_NOT_AVAILABLE_MESSAGE);
      expect(TestBed.inject(AuthSession).isLoggedIn()).toBe(true);
    });

    it('opens the Dashboard with one warning when the menu cannot be loaded', async () => {
      const { el } = await openWithMenu('/login?appid=app-1&menuid=NS-EMPPROFILE', null, {
        status: 500,
        statusText: 'Server Error',
      });

      expect(router.url).toBe('/');
      expect(el()?.querySelector('#dashboard')).toBeTruthy();
      expect(notifications.warn).toHaveBeenCalledExactlyOnceWith(MENU_NOT_AVAILABLE_MESSAGE);
    });

    it('shows only the automatic-login warning, and loads no menu, when the login is refused', async () => {
      const { harness, done } = await open('/login?appid=app-1&menuid=NS-EMPPROFILE');
      controller
        .expectOne('admin/login/auto')
        .flush({ title: 'Automatic login failed. Please log in.' }, { status: 401, statusText: 'Unauthorized' });
      await done;
      harness.detectChanges();

      expect(router.url).toBe('/login');
      expect(loginForm()).toBeTruthy();
      expect(notifications.warn).toHaveBeenCalledExactlyOnceWith('Automatic login failed. Please log in.');
      controller.expectNone('admin/menu');
    });

    it('ignores a menu id without an app id', async () => {
      const { harness, done } = await open('/login?menuid=NS-EMPPROFILE');
      await done;
      harness.detectChanges();

      expect(loginForm()).toBeTruthy();
      controller.expectNone('admin/login/auto');
      controller.expectNone('admin/menu');
    });
  });
});
