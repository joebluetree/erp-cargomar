import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthSession, SESSION_STORAGE_KEY } from '../auth/auth-session';
import { testSession } from '../auth/auth-session.testing';
import { SKIP_ERROR_NOTIFICATION, httpErrorInterceptor } from '../errors/http-error.interceptor';
import { SKIP_LOADING, loadingInterceptor } from '../loading/loading.interceptor';
import { LoadingService } from '../loading/loading.service';
import { NotificationService } from '../notifications/notification.service';
import { Announcement } from './announcement.model';
import { AnnouncementStore } from './announcement.store';

const ANNOUNCEMENT: Announcement = {
  id: 7,
  banner: null,
  heading: 'Office closed on Friday',
  content: 'Closed.',
  createdDate: '2026-10-28T10:15:00',
};

describe('AnnouncementStore', () => {
  let http: HttpTestingController;
  let store: AnnouncementStore;
  let auth: AuthSession;
  const notifications = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() };

  /** Starts the application, with a kept session when `kept` is given. */
  function create(kept?: ReturnType<typeof testSession>) {
    if (kept) sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(kept));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthSession);
    store = TestBed.inject(AnnouncementStore);
    TestBed.tick();
  }

  const requests = () => http.match((r) => r.url === 'admin/notification');

  beforeEach(() => {
    Object.values(notifications).forEach((f) => f.mockReset());
    // Start without a session, whatever an earlier spec left in this test run.
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });
  afterEach(() => {
    http.verify();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  it('asks for nothing and has no announcement without a session', () => {
    create();

    expect(requests()).toHaveLength(0);
    expect(store.announcement()).toBeNull();
  });

  it('loads once when a session starts, quietly: no spinner and no error notification', () => {
    create();
    auth.start(testSession());
    TestBed.tick();

    const [req, ...others] = requests();
    expect(others).toHaveLength(0);
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SKIP_LOADING)).toBe(true);
    expect(req.request.context.get(SKIP_ERROR_NOTIFICATION)).toBe(true);
    expect(TestBed.inject(LoadingService).busy()).toBe(false);
    req.flush(ANNOUNCEMENT);

    expect(store.announcement()).toEqual(ANNOUNCEMENT);
  });

  it('loads once when the application opens with a kept session (a reload)', () => {
    create(testSession());

    requests()[0].flush(ANNOUNCEMENT);
    expect(store.announcement()).toEqual(ANNOUNCEMENT);
  });

  it('does not ask again on a branch or year switch', () => {
    create(testSession());
    requests()[0].flush(ANNOUNCEMENT);

    auth.start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
    TestBed.tick();
    auth.start(testSession({ yearId: 'y-2' }));
    TestBed.tick();

    expect(requests()).toHaveLength(0);
    expect(store.announcement()).toEqual(ANNOUNCEMENT);
  });

  it('loads again for another user\'s login', () => {
    create(testSession());
    requests()[0].flush(ANNOUNCEMENT);

    auth.start(testSession({ userCode: 'U02' }));
    TestBed.tick();

    const changed = { ...ANNOUNCEMENT, heading: 'New' };
    requests()[0].flush(changed);
    expect(store.announcement()).toEqual(changed);
  });

  it('clears the announcement on logout, and loads again at the next login', () => {
    create(testSession());
    requests()[0].flush(ANNOUNCEMENT);

    auth.end();
    TestBed.tick();
    expect(store.announcement()).toBeNull();
    expect(requests()).toHaveLength(0);

    auth.start(testSession());
    TestBed.tick();
    requests()[0].flush(ANNOUNCEMENT);
    expect(store.announcement()).toEqual(ANNOUNCEMENT);
  });

  it('has no announcement and shows no error notification when there is none (404) or the request fails', () => {
    create(testSession());
    requests()[0].flush({ title: 'Notification not found.' }, { status: 404, statusText: 'Not Found' });
    expect(store.announcement()).toBeNull();

    auth.start(testSession({ userCode: 'U02' }));
    TestBed.tick();
    requests()[0].flush('boom', { status: 500, statusText: 'Server Error' });

    expect(store.announcement()).toBeNull();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it("gives the bar the banner exactly as entered, or the heading when there is no banner", () => {
    create(testSession());
    requests()[0].flush({ ...ANNOUNCEMENT, banner: '  Festival   bonus\nannounced  ' });
    expect(store.barText()).toBe('  Festival   bonus\nannounced  ');

    auth.start(testSession({ userCode: 'U02' }));
    TestBed.tick();
    requests()[0].flush({ ...ANNOUNCEMENT, banner: '   ' });
    expect(store.barText()).toBe('Office closed on Friday');

    auth.end();
    TestBed.tick();
    expect(store.barText()).toBeNull();
  });

  it('drops the answer for an earlier session', () => {
    create(testSession());
    const first = requests()[0];

    auth.start(testSession({ userCode: 'U02' }));
    TestBed.tick();
    const second = requests()[0];

    expect(first.cancelled).toBe(true);
    second.flush({ ...ANNOUNCEMENT, heading: 'For U02' });
    expect(store.announcement()?.heading).toBe('For U02');
  });
});
