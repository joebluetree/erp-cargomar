import { Location } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { AuthSession } from '../auth/auth-session';
import { testSession } from '../auth/auth-session.testing';
import { apiBaseUrlInterceptor } from '../api/api-base-url.interceptor';
import { authTokenInterceptor, sessionExpiryInterceptor } from '../auth/auth.interceptors';
import { httpErrorInterceptor } from '../errors/http-error.interceptor';
import { NotificationService } from '../notifications/notification.service';
import { Shell } from '../shell/shell';
import { COMMON_VIEW_ROUTES, CommonViewMessagePage } from './common-view.routes';

@Component({ template: '<p id="holidays">Holidays</p>' })
class HolidaysStub {}

@Component({ template: '<p id="profile">Profile</p>' })
class ProfileStub {}

/** The details the backend answers for the link's row: no token, nobody is logged in. */
const { token: _token, expiresAt: _expiresAt, ...LOGIN_RESPONSE } = testSession({ userCode: 'RAVI', branchId: 'b-2', branchName: 'BLRAF' });
/** What the tab keeps: the row's details with the app id in place of a token. */
const ROW_SESSION = { ...LOGIN_RESPONSE, token: '', expiresAt: '', appId: 'A1', commonView: true };

/** The row user's menu: Holiday List and Profile, each with its route. */
const USER_MENU = {
  modules: [
    {
      id: 'mod',
      name: 'Admin',
      menus: [
        { id: 'm-h', code: 'NS-HOLIDAYLIST', name: 'Holiday List', route: 'admin/holidays' },
        { id: 'm-p', code: 'NS-EMPPROFILE', name: 'Profile', route: 'admin/profile' },
      ],
    },
  ],
};

/** The common view (admin-common-endpoint design D2): the session from APPDETAILS and the normal routing to the menu. */
describe('commonViewGuard', () => {
  const notifications = { error: vi.fn(), warn: vi.fn(), success: vi.fn() };
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    Object.values(notifications).forEach((n) => n.mockReset());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'view', children: COMMON_VIEW_ROUTES },
          { path: 'admin/holidays', component: HolidaysStub },
          { path: 'admin/profile', component: ProfileStub },
        ]),
        provideHttpClient(withInterceptors([authTokenInterceptor, sessionExpiryInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    // A started session also has its menu requested after the redirect; that request is not part of the check.
    http.match('admin/menu').forEach((r) => r.flush(USER_MENU));
    http.verify();
  });

  /** Opens the URL; answers the common view login with `login` (or an error status) and then the user's menu. */
  async function open(url: string, login: 'ok' | 401 | 0 = 'ok', menu = USER_MENU) {
    const harness = await RouterTestingHarness.create();
    const done = harness.navigateByUrl(url);
    const req = await vi.waitFor(() => http.expectOne('admin/login/common-view'));
    if (login === 'ok') req.flush(LOGIN_RESPONSE);
    else if (login === 0) req.error(new ProgressEvent('error'));
    else req.flush({ status: 401, title: 'This link is not valid.' }, { status: 401, statusText: 'Unauthorized' });
    // The menu service asks for the menu of every session it sees (an earlier one of the tab too) and only the newest
    // answer counts, so every request gets the row user's menu until the navigation has ended.
    let finished = false;
    void done.then(() => (finished = true));
    await vi.waitFor(() => {
      http.match('admin/menu').forEach((r) => r.flush(menu));
      expect(finished).toBe(true);
    });
    harness.detectChanges();
    return { harness, el: harness.routeNativeElement as HTMLElement | null, req };
  }

  const message = (el: HTMLElement | null) => el?.querySelector('[data-slot="common-view-message"]')?.textContent?.trim();

  it("starts the row's session as a common view session and opens the menu's route with its menuId, replacing the address", async () => {
    const { el, req } = await open('/view?appid=%20A1%20&menuid=ns-holidaylist&userid=U7&branchid=b-9&yearid=y-9');

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ appId: 'A1' });
    // A login request: no token of the tab is sent.
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(router.url).toBe('/admin/holidays?menuId=NS-HOLIDAYLIST');
    expect(router.lastSuccessfulNavigation()?.extras.replaceUrl).toBe(true);
    expect(el?.querySelector('#holidays')).toBeTruthy();
    expect(TestBed.inject(AuthSession).session()).toEqual(ROW_SESSION);
  });

  it.each(['menuId=NS-EMPPROFILE', 'menuid=%20Ns-EmpProfile%20'])('accepts the menu as %s', async (menuParam) => {
    await open(`/view?appid=A1&${menuParam}`);

    expect(router.url).toBe('/admin/profile?menuId=NS-EMPPROFILE');
  });

  it("replaces the session the tab already has with the row's", async () => {
    TestBed.inject(AuthSession).start(testSession({ token: 'own-token', userCode: 'ANU' }));

    const { req } = await open('/view?appid=A1&menuid=NS-HOLIDAYLIST');

    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(TestBed.inject(AuthSession).session()).toEqual(ROW_SESSION);
    expect(TestBed.inject(AuthSession).session()?.commonView).toBe(true);
  });

  it.each([401, 0] as const)('says the link is not valid and starts no session when the login answers %s', async (status) => {
    const { el } = await open('/view?appid=A1&menuid=NS-HOLIDAYLIST', status);

    expect(router.url).toBe('/view/unavailable?reason=link');
    expect(message(el)).toBe('This link is not valid.');
    expect(TestBed.inject(AuthSession).session()).toBeNull();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it.each(['/view?menuid=NS-HOLIDAYLIST', '/view?appid=%20%20&menuid=NS-HOLIDAYLIST', '/view'])(
    'says the link is not valid without a request when there is no app id (%s)',
    async (url) => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      harness.detectChanges();

      expect(router.url).toBe('/view/unavailable?reason=link');
      expect(message(harness.routeNativeElement)).toBe('This link is not valid.');
    },
  );

  it('shows "not available" for a menu that is not in the user\'s menu', async () => {
    const { el } = await open('/view?appid=A1&menuid=NS-EMPLIST');

    expect(router.url).toBe('/view/unavailable');
    expect(message(el)).toBe('The requested screen is not available.');
    // The session has started all the same.
    expect(TestBed.inject(AuthSession).session()?.commonView).toBe(true);
  });

  it('shows "not available" without asking for the menu when there is no menu code', async () => {
    const { el } = await open('/view?appid=A1');

    expect(router.url).toBe('/view/unavailable');
    expect(message(el)).toBe('The requested screen is not available.');
  });

  it('shows "not available" for any other path under /view', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/view/NS-HOLIDAYLIST?appid=A1');
    harness.detectChanges();

    expect(router.url).toBe('/view/unavailable');
  });
});

describe('CommonViewMessagePage', () => {
  async function render(url: string) {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'view/unavailable', component: CommonViewMessagePage }])] });
    const harness = await RouterTestingHarness.create(url);
    return harness.routeNativeElement as HTMLElement;
  }

  const text = (el: HTMLElement) => el.querySelector('[data-slot="common-view-message"]')?.textContent?.trim();

  it('says the link is not valid for reason=link', async () => {
    expect(text(await render('/view/unavailable?reason=link'))).toBe('This link is not valid.');
  });

  it.each(['/view/unavailable', '/view/unavailable?reason=access', '/view/unavailable?reason=constructor'])(
    'says the screen is not available otherwise (%s)',
    async (url) => {
      expect(text(await render(url))).toBe('The requested screen is not available.');
    },
  );

  it('offers no form, button or link', async () => {
    const el = await render('/view/unavailable?reason=link');

    expect(el.querySelector('form, input, button, a')).toBeNull();
  });
});

/** The whole flow through the application's real routes, Shell and Holiday List page. */
describe('common view through the real routes', () => {
  const HOLIDAYS = { branchCode: 'BLRAF', branchName: 'Bangalore', items: [{ holiday: 'Diwali', day: 'Monday', date: '09-11-2026' }] };
  const rights = (code: string, admin: boolean) => ({
    code, view: true, add: false, edit: false, delete: false, print: false, email: false, docs: false, docsUpload: false, admin,
  });

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        // The app's own interceptors, in its order, so the base URL and the app id header are as in the browser.
        provideHttpClient(withInterceptors([apiBaseUrlInterceptor, authTokenInterceptor, httpErrorInterceptor, sessionExpiryInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { error: vi.fn(), warn: vi.fn(), success: vi.fn() } },
      ],
    });
  });

  /** Answers every request the app sends, by URL, until the navigation has ended and the screen has its data. */
  async function openHolidayLink(admin: boolean) {
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    const done = harness.navigateByUrl('/view?appid=A1&menuid=NS-HOLIDAYLIST');
    const sent: { url: string; appId: string | null; bearer: boolean }[] = [];
    let finished = false;
    void done.then(() => (finished = true));
    const answer = () =>
      http.match(() => true).forEach((r) => {
        const url = r.request.urlWithParams;
        sent.push({ url, appId: r.request.headers.get('X-App-Id'), bearer: r.request.headers.has('Authorization') });
        if (url.endsWith('admin/login/common-view')) r.flush(LOGIN_RESPONSE);
        else if (url.endsWith('admin/menu')) r.flush(USER_MENU);
        else if (url.includes('admin/menu/rights')) {
          const codes = (r.request.params.get('codes') ?? 'NS-HOLIDAYLIST').split(',');
          r.flush(codes.map((c) => rights(c, admin)));
        } else if (url.endsWith('admin/holidays')) r.flush(HOLIDAYS);
        else r.flush(null);
      });
    await vi.waitFor(() => {
      answer();
      expect(finished).toBe(true);
    });
    harness.detectChanges();
    await harness.fixture.whenStable();
    answer();
    harness.detectChanges();
    return { el: harness.fixture.nativeElement as HTMLElement, sent, harness };
  }

  it.each([
    [false, false],
    [true, true],
  ])('shows the Holiday List with only the content area (admin %s: Upload %s)', async (admin, upload) => {
    const { el, sent } = await openHolidayLink(admin);

    expect(TestBed.inject(Router).url).toBe('/admin/holidays?menuId=NS-HOLIDAYLIST');
    expect(el.querySelector('main h1')?.textContent?.trim()).toBe('Holiday List');
    expect(el.textContent).toContain('Diwali');
    expect(el.querySelector('header, aside, app-nav, app-announcement-bar')).toBeNull();
    expect(el.querySelector('[data-slot="holiday-upload"]') !== null).toBe(upload);
    // No token anywhere: after the link, every request sends the app id, which the backend checks each time.
    const after = sent.filter((r) => !r.url.endsWith('admin/login/common-view'));
    expect(after.some((r) => r.url.endsWith('/admin/menu')) && after.some((r) => r.url.endsWith('/admin/holidays'))).toBe(true);
    expect(after.every((r) => r.appId === 'A1' && !r.bearer)).toBe(true);
  });

  it("goes back to the previous page, not to the Dashboard, from the screen's Back", async () => {
    const { el, harness } = await openHolidayLink(false);
    const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);

    (el.querySelector('button[aria-label="Back"]') as HTMLButtonElement).click();
    await harness.fixture.whenStable();

    expect(back).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/admin/holidays?menuId=NS-HOLIDAYLIST');
    expect(el.querySelector('app-dashboard')).toBeNull();
  });

  it('shows "This link is not valid." when the row is no longer valid on a later request', async () => {
    const { harness } = await openHolidayLink(false);
    const http = TestBed.inject(HttpTestingController);

    void TestBed.inject(Router).navigateByUrl('/admin/profile?menuId=NS-EMPPROFILE');
    const rights = await vi.waitFor(() => http.expectOne((r) => r.url.includes('admin/menu/rights')));
    rights.flush({ status: 401, title: 'Authentication is required.' }, { status: 401, statusText: 'Unauthorized' });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/view/unavailable?reason=link'));

    expect(TestBed.inject(AuthSession).session()).toBeNull();
  });
});

describe('common view route', () => {
  it('is outside the shell, before it, and needs no session', () => {
    const view = routes.find((r) => r.path === 'view')!;
    const shellIndex = routes.findIndex((r) => r.component === Shell);

    expect(routes.indexOf(view)).toBeLessThan(shellIndex);
    expect(view.canMatch ?? []).toEqual([]);
    expect(view.canActivate ?? []).toEqual([]);
  });
});
