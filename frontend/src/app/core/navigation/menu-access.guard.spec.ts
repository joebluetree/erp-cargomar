import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NoAccessPage } from '../../features/no-access/no-access.page';
import { SKIP_ERROR_NOTIFICATION } from '../errors/http-error.interceptor';
import { MENU_CODES, MENU_CODE_DATA, MenuCodeRights, MenuRights, RELATED_MENU_CODES_DATA } from './menu.model';
import { MenuRightsStore } from './menu-rights.store';
import { menuAccessGuard } from './menu-access.guard';

@Component({ template: '<p data-slot="screen">the screen</p>' })
class Screen {}

@Component({ template: 'dashboard' })
class Home {}

const RIGHTS: MenuRights = { view: true, add: true, edit: false, delete: false, print: false, email: false, docs: false, docsUpload: false, admin: false };
const NONE: MenuRights = { view: false, add: false, edit: false, delete: false, print: false, email: false, docs: false, docsUpload: false, admin: false };
const entry = (code: string, rights: MenuRights): MenuCodeRights => ({ code, ...rights });

describe('menuAccessGuard', () => {
  async function open(url: string) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: Home },
          {
            path: 'admin/employees',
            canActivateChild: [menuAccessGuard],
            children: [
              {
                path: '',
                runGuardsAndResolvers: 'always',
                data: { [MENU_CODE_DATA]: MENU_CODES.employeeList, [RELATED_MENU_CODES_DATA]: [MENU_CODES.profile] },
                component: Screen,
              },
              { path: ':id', data: { [MENU_CODE_DATA]: MENU_CODES.profile }, component: Screen },
            ],
          },
          { path: 'plain', canActivateChild: [menuAccessGuard], children: [{ path: '', component: Screen }] },
          { path: 'no-access', component: NoAccessPage },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    const http = TestBed.inject(HttpTestingController);
    const navigation = harness.navigateByUrl(url);
    return { harness, http, navigation, router: TestBed.inject(Router) };
  }

  const text = (harness: RouterTestingHarness) => (harness.routeNativeElement as HTMLElement).textContent?.trim() ?? '';
  const rightsRequest = (http: HttpTestingController): TestRequest => http.expectOne((r) => r.url === 'admin/menu/rights');

  async function settle(harness: RouterTestingHarness) {
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
    harness.detectChanges();
  }

  it('loads the rights of the screen and its related menus in one live request, and keeps them by code', async () => {
    const { harness, http, navigation, router } = await open('/admin/employees?menuId=NS-EMPLIST');
    await settle(harness);

    const req = rightsRequest(http);
    expect(req.request.params.get('codes')).toBe('NS-EMPLIST,NS-EMPPROFILE');
    expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
    req.flush([entry('NS-EMPLIST', RIGHTS), entry('NS-EMPPROFILE', NONE)]);
    await navigation;
    harness.detectChanges();

    expect(text(harness)).toBe('the screen');
    expect(router.url).toBe('/admin/employees?menuId=NS-EMPLIST');
    const store = TestBed.inject(MenuRightsStore);
    expect(store.rightsOf('NS-EMPLIST')).toEqual(RIGHTS);
    expect(store.rightsOf('NS-EMPPROFILE')).toEqual(NONE);
  });

  it('shows no access in place of the screen without the view right, keeping the URL', async () => {
    const { harness, http, navigation, router } = await open('/admin/employees?menuId=NS-EMPLIST');
    await settle(harness);

    rightsRequest(http).flush([entry('NS-EMPLIST', NONE), entry('NS-EMPPROFILE', RIGHTS)]);
    await navigation;
    await settle(harness);

    expect(text(harness)).toContain('You do not have access to this screen.');
    expect((harness.routeNativeElement as HTMLElement).querySelector('[data-slot="screen"]')).toBeNull();
    // The address bar keeps the screen's URL; only the router shows the no-access page in its place.
    expect(TestBed.inject(Location).path()).toBe('/admin/employees?menuId=NS-EMPLIST');
    expect(router.url).toBe('/no-access');
  });

  it("uses the route's menu when the URL has no menu code", async () => {
    const { harness, http, navigation } = await open('/admin/employees');
    await settle(harness);

    rightsRequest(http).flush([entry('NS-EMPLIST', RIGHTS), entry('NS-EMPPROFILE', NONE)]);
    await navigation;
    harness.detectChanges();

    expect(text(harness)).toBe('the screen');
  });

  it("checks an employee's profile against the Profile's rights only", async () => {
    const { harness, http, navigation } = await open('/admin/employees/e-1?menuId=NS-EMPPROFILE');
    await settle(harness);

    const req = rightsRequest(http);
    expect(req.request.params.get('codes')).toBe('NS-EMPPROFILE');
    req.flush([entry('NS-EMPPROFILE', RIGHTS)]);
    await navigation;
    harness.detectChanges();

    expect(text(harness)).toBe('the screen');
  });

  it("shows no access for an employee's profile without the Profile's view right", async () => {
    const { harness, http, navigation } = await open('/admin/employees/e-1?menuId=NS-EMPPROFILE');
    await settle(harness);

    rightsRequest(http).flush([entry('NS-EMPPROFILE', NONE)]);
    await navigation;
    await settle(harness);

    expect(text(harness)).toContain('You do not have access to this screen.');
  });

  it('asks again, live, on every opening', async () => {
    const { harness, http, navigation, router } = await open('/admin/employees?menuId=NS-EMPLIST');
    await settle(harness);
    rightsRequest(http).flush([entry('NS-EMPLIST', RIGHTS), entry('NS-EMPPROFILE', NONE)]);
    await navigation;

    await router.navigateByUrl('/');
    const again = router.navigateByUrl('/admin/employees?menuId=NS-EMPLIST');
    await settle(harness);
    rightsRequest(http).flush([entry('NS-EMPLIST', RIGHTS), entry('NS-EMPPROFILE', RIGHTS)]);
    await again;

    expect(TestBed.inject(MenuRightsStore).rightsOf('NS-EMPPROFILE')?.view).toBe(true);
  });

  it('checks again when moving from the list to a profile', async () => {
    const { harness, http, navigation, router } = await open('/admin/employees?menuId=NS-EMPLIST');
    await settle(harness);
    rightsRequest(http).flush([entry('NS-EMPLIST', RIGHTS), entry('NS-EMPPROFILE', RIGHTS)]);
    await navigation;

    const next = router.navigateByUrl('/admin/employees/e-1?menuId=NS-EMPPROFILE');
    await settle(harness);
    rightsRequest(http).flush([entry('NS-EMPPROFILE', NONE)]);
    await next;
    await settle(harness);

    expect(text(harness)).toContain('You do not have access to this screen.');
  });

  it("shows no access, without asking for rights, when the menu code is another screen's menu", async () => {
    const { harness, http, navigation } = await open('/admin/employees?menuId=NS-COMPLIST');
    await navigation;
    await settle(harness);

    http.expectNone((r) => r.url === 'admin/menu/rights');
    expect(text(harness)).toContain('You do not have access to this screen.');
  });

  it('shows no access for a guarded route that names no menu', async () => {
    const { harness, http, navigation } = await open('/plain');
    await navigation;
    await settle(harness);

    http.expectNone((r) => r.url === 'admin/menu/rights');
    expect(text(harness)).toContain('You do not have access to this screen.');
  });

  it("shows no access when the answer has no entry for the screen's menu", async () => {
    const { harness, http, navigation } = await open('/admin/employees');
    await settle(harness);

    rightsRequest(http).flush([]);
    await navigation;
    await settle(harness);

    expect(text(harness)).toContain('You do not have access to this screen.');
  });

  it('shows no access when the rights cannot be loaded', async () => {
    const { harness, http, navigation } = await open('/admin/employees?menuId=NS-EMPLIST');
    await settle(harness);

    rightsRequest(http).flush(null, { status: 500, statusText: 'Server Error' });
    await navigation;
    await settle(harness);

    expect(text(harness)).toContain('You do not have access to this screen.');
  });

  it('leaves the Dashboard open without any right', async () => {
    const { harness, http, navigation } = await open('/');
    await navigation;
    harness.detectChanges();

    http.expectNone(() => true);
    expect(text(harness)).toBe('dashboard');
  });

  describe('opened again at the same URL (after a branch switch)', () => {
    async function openScreen() {
      const opened = await open('/admin/employees?menuId=NS-EMPLIST');
      await settle(opened.harness);
      rightsRequest(opened.http).flush([entry('NS-EMPLIST', RIGHTS), entry('NS-EMPPROFILE', NONE)]);
      await opened.navigation;
      return opened;
    }

    const reopen = (router: Router) =>
      router.navigateByUrl('/admin/employees?menuId=NS-EMPLIST', { onSameUrlNavigation: 'reload', replaceUrl: true });

    it('loads the rights again and refills them', async () => {
      const { harness, http, router } = await openScreen();

      const again = reopen(router);
      await settle(harness);
      rightsRequest(http).flush([entry('NS-EMPLIST', RIGHTS), entry('NS-EMPPROFILE', RIGHTS)]);
      await again;
      harness.detectChanges();

      expect(text(harness)).toBe('the screen');
      expect(TestBed.inject(MenuRightsStore).rightsOf('NS-EMPPROFILE')).toEqual(RIGHTS);
    });

    it('shows no access, keeping the URL, when the view right is gone', async () => {
      const { harness, http, router } = await openScreen();

      const again = reopen(router);
      await settle(harness);
      rightsRequest(http).flush([entry('NS-EMPLIST', NONE), entry('NS-EMPPROFILE', NONE)]);
      await again;
      harness.detectChanges();

      expect(text(harness)).toContain('You do not have access to this screen.');
      expect(TestBed.inject(Location).path()).toBe('/admin/employees?menuId=NS-EMPLIST');
    });
  });
});
