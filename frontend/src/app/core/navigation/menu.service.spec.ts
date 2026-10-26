import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthSession, SESSION_STORAGE_KEY } from '../auth/auth-session';
import { testSession } from '../auth/auth-session.testing';
import { MenuService, entryForUrl } from './menu.service';
import { TEST_MENU } from './menu.testing';

describe('MenuService', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(MenuService);
    TestBed.tick();
    return { service, http: TestBed.inject(HttpTestingController), auth: TestBed.inject(AuthSession) };
  }

  // Before as well: a spec run earlier in the same worker may have left a session behind.
  beforeEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  it('is empty and not loaded without a session, and asks for nothing', () => {
    const { service, http } = setup();

    http.expectNone('admin/menu');
    expect([service.modules(), service.loaded()]).toEqual([[], false]);
  });

  it('loads the menu after login', () => {
    const { service, http, auth } = setup();

    auth.start(testSession());
    TestBed.tick();
    http.expectOne('admin/menu').flush({ modules: TEST_MENU });

    expect(service.modules()).toEqual(TEST_MENU);
    expect(service.loaded()).toBe(true);
    expect(service.entries().map((e) => e.name)).toEqual(['Company List', 'Branch List', 'Profile', 'Employee List', 'Holiday List']);
  });

  it('loads it again after a branch switch, but not after a year switch', () => {
    const { http, auth } = setup();
    auth.start(testSession());
    TestBed.tick();
    http.expectOne('admin/menu').flush({ modules: TEST_MENU });

    auth.start(testSession({ yearId: 'y-2' }));
    TestBed.tick();
    http.expectNone('admin/menu');

    auth.start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
    TestBed.tick();
    http.expectOne('admin/menu').flush({ modules: [] });
  });

  it('clears the menu on logout', () => {
    const { service, http, auth } = setup();
    auth.start(testSession());
    TestBed.tick();
    http.expectOne('admin/menu').flush({ modules: TEST_MENU });

    auth.end();
    TestBed.tick();

    expect([service.modules(), service.loaded()]).toEqual([[], false]);
  });

  it('is empty but loaded when the menu cannot be loaded', () => {
    const { service, http, auth } = setup();
    auth.start(testSession());
    TestBed.tick();

    http.expectOne('admin/menu').flush(null, { status: 500, statusText: 'Server Error' });

    expect([service.modules(), service.loaded(), service.error()]).toEqual([[], true, true]);
  });

  it('resolves whenLoaded once the menu has loaded', async () => {
    const { service, http, auth } = setup();
    auth.start(testSession());
    TestBed.tick();
    let done = false;
    const waiting = service.whenLoaded().then(() => (done = true));

    await Promise.resolve();
    expect(done).toBe(false);
    http.expectOne('admin/menu').flush({ modules: TEST_MENU });
    await waiting;

    expect(done).toBe(true);
  });
});

describe('entryForUrl', () => {
  const entries = TEST_MENU[0].menus;

  it('finds the entry of a route, of its child URLs and with query parameters', () => {
    expect(entryForUrl(entries, '/admin/employees')?.code).toBe('NS-EMPLIST');
    expect(entryForUrl(entries, '/admin/employees/e-1?menuId=x')?.code).toBe('NS-EMPLIST');
    expect(entryForUrl(entries, '/reports/branches/b-2/holidays')?.code).toBe('NS-BRANCHLIST');
  });

  it('does not match a route that only starts with the same letters, or another page', () => {
    expect(entryForUrl(entries, '/admin/employeesx')).toBeNull();
    expect(entryForUrl(entries, '/')).toBeNull();
  });
});
