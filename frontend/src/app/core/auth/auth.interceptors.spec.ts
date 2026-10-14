import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { apiBaseUrlInterceptor } from '../api/api-base-url.interceptor';
import { API_BASE_URL } from '../api/api-base-url';
import { ApiError } from '../errors/api-error';
import { httpErrorInterceptor } from '../errors/http-error.interceptor';
import { NotificationService } from '../notifications/notification.service';
import { AuthSession } from './auth-session';
import { testSession } from './auth-session.testing';
import { LOGIN_REQUEST, SESSION_EXPIRED_MESSAGE, authTokenInterceptor, sessionExpiryInterceptor } from './auth.interceptors';

describe('auth interceptors', () => {
  const notifications = { error: vi.fn(), warn: vi.fn() };
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthSession;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    notifications.error.mockReset();
    notifications.warn.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([apiBaseUrlInterceptor, authTokenInterceptor, httpErrorInterceptor, sessionExpiryInterceptor]),
        ),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: NotificationService, useValue: notifications },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthSession);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => controller.verify());

  const loginContext = () => new HttpContext().set(LOGIN_REQUEST, true);

  describe('token', () => {
    it('adds the bearer token to API requests while logged in', () => {
      auth.start(testSession({ token: 'abc' }));

      http.get('reports/companies').subscribe();

      expect(controller.expectOne('/api/reports/companies').request.headers.get('Authorization')).toBe('Bearer abc');
    });

    it('sends no token without a session', () => {
      http.get('reports/companies').subscribe();

      expect(controller.expectOne('/api/reports/companies').request.headers.has('Authorization')).toBe(false);
    });

    it('sends no token with the login request', () => {
      auth.start(testSession());

      http.post('admin/login', {}, { context: loginContext() }).subscribe();

      expect(controller.expectOne('/api/admin/login').request.headers.has('Authorization')).toBe(false);
    });

    it('sends no token to other servers', () => {
      auth.start(testSession());

      http.get('https://other.example.com/x').subscribe();

      expect(controller.expectOne('https://other.example.com/x').request.headers.has('Authorization')).toBe(false);
    });
  });

  describe('session expiry', () => {
    function fail(url: string, status: number, context?: HttpContext): Promise<unknown> {
      const result = firstValueFrom(http.get(url, { context })).catch((e: unknown) => e);
      controller.expectOne(`/api/${url}`).flush({ title: 'Authentication is required.' }, { status, statusText: 'x' });
      return result;
    }

    it('ends the session, shows the login screen and one message on a 401', async () => {
      auth.start(testSession());

      const error = (await fail('reports/companies', 401)) as ApiError;

      expect(auth.isLoggedIn()).toBe(false);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
      expect(notifications.warn).toHaveBeenCalledExactlyOnceWith(SESSION_EXPIRED_MESSAGE);
      expect(notifications.error).not.toHaveBeenCalled();
      expect(error.status).toBe(401);
    });

    it('shows the message once when several requests fail together', async () => {
      auth.start(testSession());
      const first = firstValueFrom(http.get('a')).catch((e: unknown) => e);
      const second = firstValueFrom(http.get('b')).catch((e: unknown) => e);

      controller.expectOne('/api/a').flush(null, { status: 401, statusText: 'x' });
      controller.expectOne('/api/b').flush(null, { status: 401, statusText: 'x' });
      await Promise.all([first, second]);

      expect(notifications.warn).toHaveBeenCalledTimes(1);
      expect(notifications.error).not.toHaveBeenCalled();
    });

    it('treats a refused login as a normal error, keeping no session and showing its message', async () => {
      const error = (await fail('admin/login', 401, loginContext())) as ApiError;

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(notifications.warn).not.toHaveBeenCalled();
      expect(notifications.error).toHaveBeenCalledExactlyOnceWith('Authentication is required.');
      expect(error.status).toBe(401);
    });

    it('leaves other errors to the error interceptor and keeps the session', async () => {
      auth.start(testSession());

      await fail('reports/companies', 403);

      expect(auth.isLoggedIn()).toBe(true);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(notifications.error).toHaveBeenCalledTimes(1);
    });
  });
});
