import { TestBed } from '@angular/core/testing';
import { AuthSession, SESSION_STORAGE_KEY } from '../../core/auth/auth-session';
import { testSession } from '../../core/auth/auth-session.testing';
import { TableStateStore } from './table-state';

describe('TableStateStore', () => {
  const store = () => TestBed.inject(TableStateStore);

  it('has nothing for a key before anything is saved', () => {
    expect(store().get('reports/companies')).toBeUndefined();
  });

  it('returns what was saved under the key', () => {
    const state = { page: 2, pageSize: 5 };

    store().set('reports/companies', state);

    expect(store().get('reports/companies')).toEqual(state);
  });

  it('replaces the state saved earlier under the same key', () => {
    store().set('t', { page: 1 });
    store().set('t', { page: 3 });

    expect(store().get('t')).toEqual({ page: 3 });
  });

  it('keeps separate keys apart', () => {
    store().set('a', { page: 1 });
    store().set('b', { page: 9 });

    expect(store().get('a')).toEqual({ page: 1 });
    expect(store().get('b')).toEqual({ page: 9 });
    expect(store().get('c')).toBeUndefined();
  });

  it('is shared by everything that injects it, like the app shares it between screens', () => {
    store().set('t', { page: 4 });

    expect(TestBed.inject(TableStateStore).get('t')).toEqual({ page: 4 });
  });

  it('starts empty in a new application, as after a browser reload', () => {
    store().set('t', { page: 4 });

    TestBed.resetTestingModule();

    expect(TestBed.inject(TableStateStore).get('t')).toBeUndefined();
  });

  describe('per login', () => {
    beforeEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));
    afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

    function loggedIn() {
      const auth = TestBed.inject(AuthSession);
      auth.start(testSession());
      const tables = store();
      TestBed.tick();
      tables.set('admin/employees', { statusInput: 'relieved' });
      return { auth, tables };
    }

    it('is cleared on logout, also of what a closing screen saves after it', () => {
      const { auth, tables } = loggedIn();

      auth.end();
      TestBed.tick();
      expect(tables.get('admin/employees')).toBeUndefined();

      tables.set('admin/employees', { statusInput: 'all' });
      auth.start(testSession({ token: 'next-token' }));
      TestBed.tick();
      expect(tables.get('admin/employees')).toBeUndefined();
    });

    it('is cleared when another user logs in', () => {
      const { auth, tables } = loggedIn();

      auth.start(testSession({ token: 'other-token', userCode: 'U02' }));
      TestBed.tick();

      expect(tables.get('admin/employees')).toBeUndefined();
    });

    it('is kept on a branch or year switch', () => {
      const { auth, tables } = loggedIn();

      auth.start(testSession({ token: 'token-2', branchId: 'b-2', branchName: 'Chennai', yearId: 'y-2' }));
      TestBed.tick();

      expect(tables.get('admin/employees')).toEqual({ statusInput: 'relieved' });
    });
  });
});
