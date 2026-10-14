import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthSession, SESSION_STORAGE_KEY } from './auth-session';
import { testSession } from './auth-session.testing';

describe('AuthSession', () => {
  function create(): AuthSession {
    return TestBed.inject(AuthSession);
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('is logged out when nothing is stored', () => {
    const auth = create();

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.session()).toBeNull();
    expect(auth.details()).toBeNull();
    expect(auth.isActive()).toBe(false);
  });

  it('starts a session, stores it, and a new instance restores it (reload)', () => {
    const session = testSession();
    create().start(session);

    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(session);

    TestBed.resetTestingModule();
    const restored = create();
    expect(restored.isLoggedIn()).toBe(true);
    expect(restored.session()).toEqual(session);
  });

  it('gives the company for the header title, and the user, the branch and the year', () => {
    const auth = create();
    auth.start(testSession());

    expect(auth.details()).toEqual({ company: 'Cargomar Pvt Ltd', user: 'ADMIN', branch: 'Kochi', year: '2025-2026' });
  });

  it('drops a stored session whose token has expired', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession({ expiresAt: new Date(Date.now() - 1000).toISOString() })));

    const auth = create();

    expect(auth.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('ignores an unreadable stored value', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{not json');

    expect(create().isLoggedIn()).toBe(false);
  });

  it('ends a session that expires while the application is open', () => {
    const auth = create();
    auth.start(testSession({ expiresAt: new Date(Date.now() + 1000).toISOString() }));
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);

    expect(auth.isActive()).toBe(false);
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('end clears the session and the stored copy', () => {
    const auth = create();
    auth.start(testSession());

    auth.end();

    expect(auth.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  describe('page restored by the browser (Back)', () => {
    function restorePage(): void {
      const event = new Event('pageshow');
      Object.defineProperty(event, 'persisted', { value: true });
      window.dispatchEvent(event);
    }

    function reloadSpy(auth: AuthSession) {
      return vi.spyOn(auth as unknown as { reload(): void }, 'reload').mockImplementation(() => undefined);
    }

    it('reloads when the session in memory was ended since (logged out in a later page)', () => {
      const auth = create();
      auth.start(testSession());
      const reload = reloadSpy(auth);
      sessionStorage.removeItem(SESSION_STORAGE_KEY); // what a later page's Log out leaves behind

      restorePage();

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does nothing when memory and storage agree', () => {
      const auth = create();
      auth.start(testSession());
      const reload = reloadSpy(auth);

      restorePage();

      expect(reload).not.toHaveBeenCalled();
    });

    it('ignores a normal page show', () => {
      const auth = create();
      auth.start(testSession());
      const reload = reloadSpy(auth);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);

      window.dispatchEvent(new Event('pageshow'));

      expect(reload).not.toHaveBeenCalled();
    });
  });

  it('still works in memory when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const auth = create();

    auth.start(testSession());

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.isActive()).toBe(true);
  });
});
