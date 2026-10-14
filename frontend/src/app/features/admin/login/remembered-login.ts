import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { LoginCredentials } from './login.model';

export const REMEMBERED_LOGIN_KEY = 'ierp-login-remembered';

/**
 * Remember me: the user code, password and company code of the last successful login with the box ticked, kept in
 * `localStorage` so they outlive the tab. The password is stored as typed, in plain text, as the user chose (see the
 * design's risks). Nothing here keeps a session. If the browser does not allow storage, or it holds something that is
 * not three strings, nothing is remembered.
 */
@Injectable({ providedIn: 'root' })
export class RememberedLogin {
  private readonly doc = inject(DOCUMENT);

  read(): LoginCredentials | null {
    try {
      const raw = this.doc.defaultView?.localStorage.getItem(REMEMBERED_LOGIN_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      return isCredentials(value)
        ? { userCode: value.userCode, password: value.password, companyCode: value.companyCode }
        : null;
    } catch {
      return null; // storage blocked or malformed
    }
  }

  save(credentials: LoginCredentials): void {
    const { userCode, password, companyCode } = credentials;
    try {
      this.doc.defaultView?.localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify({ userCode, password, companyCode }));
    } catch {
      // storage blocked: nothing is remembered
    }
  }

  forget(): void {
    try {
      this.doc.defaultView?.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
    } catch {
      // storage blocked: nothing was remembered
    }
  }
}

function isCredentials(value: unknown): value is LoginCredentials {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['userCode'] === 'string' && typeof v['password'] === 'string' && typeof v['companyCode'] === 'string';
}
