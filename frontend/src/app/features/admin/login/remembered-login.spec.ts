import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { REMEMBERED_LOGIN_KEY, RememberedLogin } from './remembered-login';

describe('RememberedLogin', () => {
  const entry = { userCode: 'ADMIN', password: ' Secret 1 ', companyCode: 'CPL' };
  const remembered = () => TestBed.inject(RememberedLogin);

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('remembers nothing when nothing is stored', () => {
    expect(remembered().read()).toBeNull();
  });

  it('reads back what was saved, the password unchanged', () => {
    remembered().save(entry);

    expect(remembered().read()).toEqual(entry);
    expect(JSON.parse(localStorage.getItem(REMEMBERED_LOGIN_KEY)!)).toEqual(entry);
  });

  it('stores only the three values', () => {
    remembered().save({ ...entry, extra: 'x' } as typeof entry);

    expect(Object.keys(JSON.parse(localStorage.getItem(REMEMBERED_LOGIN_KEY)!))).toEqual(['userCode', 'password', 'companyCode']);
  });

  it('forgets', () => {
    remembered().save(entry);
    remembered().forget();

    expect(remembered().read()).toBeNull();
    expect(localStorage.getItem(REMEMBERED_LOGIN_KEY)).toBeNull();
  });

  it('ignores malformed JSON and a value of the wrong shape', () => {
    for (const raw of ['{not json', 'null', '"text"', '[]', '{"userCode":"A","password":1,"companyCode":"C"}', '{"userCode":"A","companyCode":"C"}']) {
      localStorage.setItem(REMEMBERED_LOGIN_KEY, raw);
      expect(remembered().read()).toBeNull();
    }
  });

  it('remembers nothing and does not fail when the storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => remembered().save(entry)).not.toThrow();
    expect(() => remembered().forget()).not.toThrow();
    expect(remembered().read()).toBeNull();
  });
});
