import { TestBed } from '@angular/core/testing';
import { AuthSession, SESSION_STORAGE_KEY } from '../auth/auth-session';
import { testSession } from '../auth/auth-session.testing';
import { MenuModule } from './menu.model';
import { NavCollapseStore } from './nav-collapse.store';

const HR: MenuModule = { id: 'hr', name: 'HR', menus: [] };
const ACCOUNTS: MenuModule = { id: 'acc', name: 'Accounts', menus: [] };

describe('NavCollapseStore', () => {
  beforeEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  function setup() {
    const auth = TestBed.inject(AuthSession);
    auth.start(testSession());
    const store = TestBed.inject(NavCollapseStore);
    TestBed.tick();
    return { auth, store };
  }

  it('opens only the HR module at login, whatever the case of its name', () => {
    const { store } = setup();

    expect(store.isOpen(HR)).toBe(true);
    expect(store.isOpen({ ...HR, name: ' Hr ' })).toBe(true);
    expect(store.isOpen(ACCOUNTS)).toBe(false);
  });

  it('toggles a module both ways', () => {
    const { store } = setup();

    store.toggle(HR);
    store.toggle(ACCOUNTS);
    expect([store.isOpen(HR), store.isOpen(ACCOUNTS)]).toEqual([false, true]);

    store.toggle(HR);
    expect(store.isOpen(HR)).toBe(true);
  });

  it('keeps the choices on a branch or year switch', () => {
    const { auth, store } = setup();
    store.toggle(HR);

    auth.start(testSession({ branchId: 'b-2', branchName: 'Chennai', yearId: 'y-2' }));
    TestBed.tick();

    expect(store.isOpen(HR)).toBe(false);
  });

  it('starts from HR open again at the next login', () => {
    const { auth, store } = setup();
    store.toggle(HR);
    store.toggle(ACCOUNTS);

    auth.end();
    TestBed.tick();
    auth.start(testSession({ token: 'next-token' }));
    TestBed.tick();

    expect([store.isOpen(HR), store.isOpen(ACCOUNTS)]).toEqual([true, false]);
  });
});
