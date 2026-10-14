import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthSession, SESSION_STORAGE_KEY } from '../../../core/auth/auth-session';
import { testSession } from '../../../core/auth/auth-session.testing';
import { SKIP_ERROR_NOTIFICATION } from '../../../core/errors/http-error.interceptor';
import { ChangeBranchService } from './change-branch.service';
import { CHANGE_RESPONSE, SESSION_OPTIONS } from './change-branch.testing';

describe('ChangeBranchService', () => {
  let service: ChangeBranchService;
  let controller: HttpTestingController;
  let auth: AuthSession;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [ChangeBranchService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ChangeBranchService);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthSession);
    auth.start(testSession());
  });

  afterEach(() => controller.verify());

  it('loads the options from admin/session/options, leaving failures to the error interceptor', () => {
    let options: unknown;
    service.options().subscribe((o) => (options = o));

    const req = controller.expectOne('admin/session/options');
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(false);
    req.flush(SESSION_OPTIONS);

    expect(options).toEqual(SESSION_OPTIONS);
  });

  it('posts the chosen branch and year, then replaces the session and its stored copy', () => {
    let done = false;
    service.change({ branchId: 'b-2', yearId: 'y-0' }).subscribe(() => (done = true));

    const req = controller.expectOne('admin/session/change');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ branchId: 'b-2', yearId: 'y-0' });
    expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true); // the dialog reports a refusal itself
    expect(service.busy()).toBe(true);

    req.flush(CHANGE_RESPONSE);

    expect(done).toBe(true);
    expect(service.busy()).toBe(false);
    const expected = { token: 'token-2', expiresAt: '2099-01-01T00:00:00Z', ...CHANGE_RESPONSE.session };
    expect(auth.session()).toEqual(expected);
    expect(auth.details()).toEqual({ company: 'Cargomar Pvt Ltd', user: 'ADMIN', branch: 'Mumbai', year: '2024-2025' });
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(expected);
  });

  it('keeps the session and clears busy when the switch is refused', () => {
    const before = auth.session();
    let failed = false;
    service.change({ branchId: 'b-9', yearId: 'y-0' }).subscribe({ error: () => (failed = true) });

    controller.expectOne('admin/session/change')
      .flush({ title: 'This branch is not available to you.', status: 403 }, { status: 403, statusText: 'Forbidden' });

    expect(failed).toBe(true);
    expect(service.busy()).toBe(false);
    expect(auth.session()).toEqual(before);
  });
});
