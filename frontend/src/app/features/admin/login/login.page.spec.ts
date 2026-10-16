import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NgIcon } from '@ng-icons/core';
import { vi } from 'vitest';
import { routes } from '../../../app.routes';
import { AuthSession } from '../../../core/auth/auth-session';
import { NETWORK_ERROR_MESSAGE, SERVER_ERROR_MESSAGE } from '../../../core/errors/api-error';
import { httpErrorInterceptor } from '../../../core/errors/http-error.interceptor';
import { NotificationService } from '../../../core/notifications/notification.service';
import { LoginPage } from './login.page';
import { LoginService } from './login.service';
import { LOGIN_RESPONSE } from './login.testing';
import { REMEMBERED_LOGIN_KEY } from './remembered-login';

describe('LoginPage', () => {
  const notifications = { error: vi.fn(), warn: vi.fn(), success: vi.fn() };
  let fixture: ComponentFixture<LoginPage>;
  let el: HTMLElement;
  let controller: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    notifications.error.mockReset();
    notifications.warn.mockReset();
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        LoginService,
        provideRouter([]),
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    open();
  });

  afterEach(() => {
    controller.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  /** Opens the login screen (again), as after a logout or in a new tab. */
  function open() {
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  const input = (id: string) => el.querySelector(`#${id}`) as HTMLInputElement;
  const userCode = () => input('login-user-code');
  const password = () => input('login-password');
  const companyCode = () => input('login-company-code');
  const button = (name: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name)!;
  const eye = () => el.querySelector('#login-password + button') as HTMLButtonElement;
  /** The icon the eye button shows (the name given to its ng-icon). */
  const eyeIcon = () =>
    (fixture.debugElement.query(By.css('#login-password + button')).query(By.directive(NgIcon)).componentInstance as NgIcon).name();
  const errors = () => Array.from(el.querySelectorAll('[data-slot="field-error"]')).map((e) => e.textContent?.trim());

  function type(target: HTMLInputElement, value: string) {
    target.value = value;
    target.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function fill(name = ' admin ', pass = 'Secret 1', code = ' cmp ') {
    type(userCode(), name);
    type(password(), pass);
    type(companyCode(), code);
  }

  function clickLogin() {
    button('Login').click();
    fixture.detectChanges();
  }

  describe('layout', () => {
    it('shows the title "Login" and User, Password and Company one below the other, with labels', () => {
      expect(el.querySelector('h1')?.textContent?.trim()).toBe('Login');
      expect(el.querySelector('h1')?.getAttribute('data-slot')).toBe('page-title');
      const labels = Array.from(el.querySelectorAll('label')).map((l) => [l.textContent?.trim(), l.getAttribute('for')]);
      expect(labels).toEqual([
        ['User', 'login-user-code'],
        ['Password', 'login-password'],
        ['Company', 'login-company-code'],
        ['Remember me', 'login-remember'],
      ]);
      const form = el.querySelector('form')!;
      expect(Array.from(form.classList)).toEqual(expect.arrayContaining(['flex', 'flex-col']));
      const order = [userCode(), password(), companyCode()];
      for (let i = 1; i < order.length; i++) {
        expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });

    it('puts Login and then Cancel below the fields, aligned right, with Login as the primary submit button', () => {
      const row = button('Login').parentElement!;

      expect(Array.from(row.children).map((b) => b.textContent?.trim())).toEqual(['Login', 'Cancel']);
      expect(Array.from(row.classList)).toEqual(expect.arrayContaining(['flex', 'justify-end']));
      expect(companyCode().compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(button('Login').getAttribute('type')).toBe('submit');
      expect(button('Cancel').getAttribute('type')).toBe('button');
      expect(button('Login').classList).toContain('bg-primary-surface');
    });
  });

  describe('remember me', () => {
    const remember = () => el.querySelector('#login-remember') as HTMLButtonElement;
    const ticked = () => remember().getAttribute('aria-checked') === 'true';
    const stored = () => JSON.parse(localStorage.getItem(REMEMBERED_LOGIN_KEY) ?? 'null') as unknown;
    const values = () => [userCode().value, password().value, companyCode().value];
    const entry = { userCode: 'OLD', password: 'Old pass', companyCode: 'OTH' };

    function tick() {
      remember().click();
      fixture.detectChanges();
    }

    function loginWith(status?: number) {
      clickLogin();
      const req = controller.expectOne('admin/login');
      if (status) {
        req.flush({ title: 'Invalid user code, password or company code.', status }, { status, statusText: 'Refused' });
      } else {
        req.flush(LOGIN_RESPONSE);
      }
      fixture.detectChanges();
    }

    it('is a checkbox labelled "Remember me" below Company and above the buttons, unticked by default', () => {
      expect(remember().getAttribute('role')).toBe('checkbox');
      expect(ticked()).toBe(false);
      expect(companyCode().compareDocumentPosition(remember()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(remember().compareDocumentPosition(button('Login')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      (el.querySelector('label[for="login-remember"]') as HTMLLabelElement).click();
      fixture.detectChanges();
      expect(ticked()).toBe(true);
    });

    it('remembers a successful login when ticked and fills the next login screen, the password masked', () => {
      fill();
      tick();
      loginWith();

      expect(stored()).toEqual({ userCode: 'admin', password: 'Secret 1', companyCode: 'cmp' });

      open();
      expect(values()).toEqual(['admin', 'Secret 1', 'cmp']);
      expect(ticked()).toBe(true);
      expect(password().type).toBe('password');
      expect(errors()).toEqual([]);
    });

    it('forgets what was remembered after a successful login with the box unticked', () => {
      localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify(entry));
      open();
      expect(values()).toEqual(['OLD', 'Old pass', 'OTH']);
      expect(ticked()).toBe(true);

      tick();
      loginWith();

      expect(localStorage.getItem(REMEMBERED_LOGIN_KEY)).toBeNull();
      open();
      expect(values()).toEqual(['', '', '']);
      expect(ticked()).toBe(false);
    });

    it('does not change what is remembered when the login is refused', () => {
      localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify(entry));
      open();
      fill('admin', 'Wrong', 'cmp');

      loginWith(401);

      expect(stored()).toEqual(entry);
    });

    it('stores nothing for a refused login with the box ticked', () => {
      fill();
      tick();

      loginWith(401);

      expect(localStorage.getItem(REMEMBERED_LOGIN_KEY)).toBeNull();
    });

    it('opens empty and still logs in when the browser blocks storage', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      open();
      expect(values()).toEqual(['', '', '']);
      expect(ticked()).toBe(false);

      fill();
      tick();
      loginWith();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('keeps no session: only the three values go to localStorage, the token stays in the tab', () => {
      fill();
      tick();
      loginWith();

      expect(Object.keys(localStorage)).toEqual([REMEMBERED_LOGIN_KEY]);
      expect(localStorage.getItem(REMEMBERED_LOGIN_KEY)).not.toContain(LOGIN_RESPONSE.token);
      expect(sessionStorage.getItem('ierp-session')).toContain(LOGIN_RESPONSE.token);
    });

    it('is left as it is by Cancel, and so is what is remembered', () => {
      localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify(entry));
      open();

      button('Cancel').click();
      fixture.detectChanges();

      expect(values()).toEqual(['', '', '']);
      expect(ticked()).toBe(true);
      expect(stored()).toEqual(entry);
    });
  });

  describe('mandatory fields', () => {
    it('shows a message under each empty field and sends nothing', () => {
      clickLogin();

      expect(errors()).toEqual(['User is required.', 'Password is required.', 'Company is required.']);
      expect(userCode().getAttribute('aria-describedby')).toBe('login-user-code-error');
      expect(userCode().getAttribute('aria-invalid')).toBe('true');
      controller.expectNone('admin/login');
    });

    it('treats a user name of only spaces as empty', () => {
      fill('   ');
      clickLogin();

      expect(errors()).toEqual(['User is required.']);
      controller.expectNone('admin/login');
    });

    it('shows no message before the field is touched or a login is attempted', () => {
      expect(errors()).toEqual([]);

      userCode().dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(errors()).toEqual(['User is required.']);
    });
  });

  describe('password visibility', () => {
    it('hides the password by default with a closed eye named "Show password"', () => {
      type(password(), 'Secret 1');

      expect(password().type).toBe('password');
      expect(eye().getAttribute('aria-label')).toBe('Show password');
      expect(eyeIcon()).toBe('lucideEyeOff');
    });

    it('shows the password with an open eye, and hides it again', () => {
      eye().click();
      fixture.detectChanges();

      expect(password().type).toBe('text');
      expect(eye().getAttribute('aria-label')).toBe('Hide password');
      expect(eyeIcon()).toBe('lucideEye');

      eye().click();
      fixture.detectChanges();

      expect(password().type).toBe('password');
      expect(eye().getAttribute('aria-label')).toBe('Show password');
    });

    it('is a keyboard-operable button inside the field on the right that never submits', () => {
      expect(eye().tagName).toBe('BUTTON');
      expect(eye().getAttribute('type')).toBe('button');
      expect(Array.from(eye().classList)).toEqual(expect.arrayContaining(['absolute', 'right-0.5']));
      expect(eye().parentElement).toBe(password().parentElement);
    });
  });

  describe('login', () => {
    it('sends the trimmed user name and company code, the user name and password in upper case, then opens the Dashboard', () => {
      fill();
      clickLogin();

      const req = controller.expectOne('admin/login');
      // The password keeps its spaces; only its case changes.
      expect(req.request.body).toEqual({ userCode: 'ADMIN', password: 'SECRET 1', companyCode: 'cmp' });
      req.flush(LOGIN_RESPONSE);

      expect(TestBed.inject(AuthSession).details()).toEqual({ company: 'Cargomar Pvt Ltd', user: 'ADMIN', branch: 'Kochi', year: '2025-2026' });
      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('submits on Enter (the form submit) like the Login button', () => {
      fill();

      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      controller.expectOne('admin/login').flush(LOGIN_RESPONSE);
    });

    it('disables Login and shows progress while the request is in flight, and sends nothing twice', () => {
      fill();
      clickLogin();

      expect(button('Logging in…').disabled).toBe(true);
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      controller.expectOne('admin/login').flush(LOGIN_RESPONSE);
    });

    it('stays open on a refused login: one warning with the message, every field kept, Login enabled', () => {
      fill();
      clickLogin();

      controller
        .expectOne('admin/login')
        .flush({ title: 'Invalid user code, password or company code.', status: 401 }, { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();

      expect(notifications.warn).toHaveBeenCalledExactlyOnceWith('Invalid user code, password or company code.');
      expect(notifications.error).not.toHaveBeenCalled(); // the error interceptor stays silent: one message only
      expect(userCode().value).toBe(' admin ');
      expect(password().value).toBe('Secret 1');
      expect(companyCode().value).toBe(' cmp ');
      expect(errors()).toEqual([]);
      expect(button('Login').disabled).toBe(false);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(TestBed.inject(AuthSession).isLoggedIn()).toBe(false);
    });

    it('shows the missing-setup message of a 403 as a warning and keeps the fields', () => {
      fill();
      clickLogin();

      controller
        .expectOne('admin/login')
        .flush({ title: 'No financial year is set up for this company.', status: 403 }, { status: 403, statusText: 'Forbidden' });

      expect(notifications.warn).toHaveBeenCalledExactlyOnceWith('No financial year is set up for this company.');
      expect(notifications.error).not.toHaveBeenCalled();
      expect(password().value).toBe('Secret 1');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('shows a server failure as an error, once', () => {
      fill();
      clickLogin();

      controller.expectOne('admin/login').flush({ title: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(notifications.error).toHaveBeenCalledExactlyOnceWith(SERVER_ERROR_MESSAGE);
      expect(notifications.warn).not.toHaveBeenCalled();
    });

    it('shows the network message when the server cannot be reached and enables Login again', () => {
      fill();
      clickLogin();

      controller.expectOne('admin/login').error(new ProgressEvent('error'));
      fixture.detectChanges();

      expect(notifications.error).toHaveBeenCalledExactlyOnceWith(NETWORK_ERROR_MESSAGE);
      expect(notifications.warn).not.toHaveBeenCalled();
      expect(password().value).toBe('Secret 1');
      expect(button('Login').disabled).toBe(false);
    });

    it('shows backend field errors under their fields', () => {
      fill();
      clickLogin();

      controller
        .expectOne('admin/login')
        .flush({ errors: { CompanyCode: ['Company code must be at most 10 characters.'] } }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(errors()).toContain('Company code must be at most 10 characters.');
      expect(notifications.error).not.toHaveBeenCalled();
      expect(notifications.warn).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('empties the fields, removes the messages and hides the password again', () => {
      clickLogin();
      fill('admin', 'Secret 1', 'cmp');
      eye().click();
      fixture.detectChanges();

      button('Cancel').click();
      fixture.detectChanges();

      expect([userCode().value, password().value, companyCode().value]).toEqual(['', '', '']);
      expect(errors()).toEqual([]);
      expect(password().type).toBe('password');
      controller.expectNone('admin/login');
    });
  });
});

describe('LoginPage route', () => {
  beforeEach(() => sessionStorage.clear());

  it('is shown at /login without the shell', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] });
    const harness = await RouterTestingHarness.create('/login');
    const el = harness.routeNativeElement as HTMLElement;

    expect(el.querySelector('#login-user-code')).toBeTruthy();
    expect(document.querySelector('header')).toBeNull();
    expect(document.querySelector('aside app-nav')).toBeNull();
  });
});
