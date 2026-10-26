import { TestBed } from '@angular/core/testing';
import { AuthSession, SESSION_STORAGE_KEY } from '../auth/auth-session';
import { testSession } from '../auth/auth-session.testing';
import { MenuRights } from './menu.model';
import { MenuRightsStore } from './menu-rights.store';

const RIGHTS: MenuRights = { view: true, add: false, edit: false, delete: false, print: false, email: false, docs: false, docsUpload: false, admin: false };

describe('MenuRightsStore', () => {
  beforeEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  function setup() {
    const auth = TestBed.inject(AuthSession);
    auth.start(testSession());
    const store = TestBed.inject(MenuRightsStore);
    TestBed.tick();
    store.set('NS-EMPLIST', RIGHTS);
    return { auth, store };
  }

  it('keeps the rights by menu code', () => {
    const { store } = setup();

    expect(store.rightsOf('NS-EMPLIST')).toEqual(RIGHTS);
    expect(store.rightsOf('NS-EMPPROFILE')).toBeNull();
  });

  it('keeps rights stored as soon as it is created, as the guard does on the first screen', () => {
    TestBed.inject(AuthSession).start(testSession());
    const store = TestBed.inject(MenuRightsStore);
    store.set('NS-EMPPROFILE', RIGHTS);
    TestBed.tick();

    expect(store.rightsOf('NS-EMPPROFILE')).toEqual(RIGHTS);
  });

  it('is cleared on logout', () => {
    const { auth, store } = setup();

    auth.end();
    TestBed.tick();

    expect(store.rightsOf('NS-EMPLIST')).toBeNull();
  });

  it('is cleared on a branch switch, but not on a year switch', () => {
    const { auth, store } = setup();

    auth.start(testSession({ yearId: 'y-2' }));
    TestBed.tick();
    expect(store.rightsOf('NS-EMPLIST')).toEqual(RIGHTS);

    auth.start(testSession({ branchId: 'b-2', branchName: 'Chennai' }));
    TestBed.tick();
    expect(store.rightsOf('NS-EMPLIST')).toBeNull();
  });
});
