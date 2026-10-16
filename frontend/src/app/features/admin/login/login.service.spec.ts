import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthSession } from '../../../core/auth/auth-session';
import { LOGIN_REQUEST } from '../../../core/auth/auth.interceptors';
import { SKIP_ERROR_NOTIFICATION } from '../../../core/errors/http-error.interceptor';
import { LoginService } from './login.service';
import { LOGIN_RESPONSE } from './login.testing';

describe('LoginService', () => {
  let service: LoginService;
  let controller: HttpTestingController;
  let auth: AuthSession;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [LoginService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LoginService);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthSession);
  });

  afterEach(() => controller.verify());

  it('posts the credentials to admin/login, marked as the login request that the error interceptor leaves to the page, and starts the session', () => {
    let done = false;
    service.login({ userCode: 'admin', password: 'secret', companyCode: 'CMP' }).subscribe(() => (done = true));

    const req = controller.expectOne('admin/login');
    expect(req.request.method).toBe('POST');
    // The user code and password go to the backend in upper case; the company code as typed.
    expect(req.request.body).toEqual({ userCode: 'ADMIN', password: 'SECRET', companyCode: 'CMP' });
    expect(req.request.context.get(LOGIN_REQUEST)).toBe(true);
    expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true); // the page reports failures itself
    expect(service.busy()).toBe(true);

    req.flush(LOGIN_RESPONSE);

    expect(done).toBe(true);
    expect(service.busy()).toBe(false);
    expect(auth.session()).toEqual({ token: 'token-1', expiresAt: '2099-01-01T00:00:00Z', ...LOGIN_RESPONSE.session });
    expect(auth.session()!.employeeId).toBe('e-1');
  });

  it('sends the user code and password in upper case, whatever case they were typed in', () => {
    const typed = { userCode: 'aDmIn', password: 'pass@123x', companyCode: 'cmp' };
    service.login(typed).subscribe();

    const req = controller.expectOne('admin/login');
    expect(req.request.body).toEqual({ userCode: 'ADMIN', password: 'PASS@123X', companyCode: 'cmp' });
    // What was typed (and may be remembered) is not changed.
    expect(typed).toEqual({ userCode: 'aDmIn', password: 'pass@123x', companyCode: 'cmp' });
    req.flush(LOGIN_RESPONSE);
  });

  it('starts no session and clears busy when the login is refused', () => {
    let failed = false;
    service.login({ userCode: 'admin', password: 'x', companyCode: 'CMP' }).subscribe({ error: () => (failed = true) });

    controller.expectOne('admin/login').flush({ title: 'Invalid' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(service.busy()).toBe(false);
    expect(auth.isLoggedIn()).toBe(false);
  });
});
