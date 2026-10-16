import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/** The logged-in user, the working context (company, default branch, latest financial year) and the access token. */
export interface Session {
  token: string;
  /** When the token expires (ISO 8601). */
  expiresAt: string;
  userCode: string;
  userName: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  branchId: string;
  branchName: string;
  yearId: string;
  yearCode: string;
  yearName: string;
  /** The user's employee (`USERM.USER_EMP_ID`); null when the user has none. Not shown on screen. */
  employeeId: string | null;
}

export const SESSION_STORAGE_KEY = 'ierp-session';

/**
 * The session of the current browser tab. It is kept in `sessionStorage`, so it survives a reload of the tab and
 * ends when the tab is closed. A stored session whose token has expired is not used. If the browser does not allow
 * storing it, the session still works until the page is reloaded.
 */
@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly doc = inject(DOCUMENT);

  private readonly state = signal<Session | null>(this.readStored());
  readonly session = this.state.asReadonly();
  readonly isLoggedIn = computed(() => this.state() !== null);

  /** What the header shows: the company as its title, and the user name, branch and financial year at its right. */
  readonly details = computed(() => {
    const s = this.state();
    return s ? { company: s.companyName, user: s.userName, branch: s.branchName, year: s.yearName } : null;
  });

  constructor() {
    // A page that the browser restores from its back-forward cache (Back after a reload, then Log out) keeps its old
    // memory, including a session that has been ended since. Reload it, so the stored session (and the guard) decide.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && this.storedToken() !== (this.state()?.token ?? null)) {
        this.reload();
      }
    };
    const view = this.doc.defaultView;
    view?.addEventListener('pageshow', onPageShow);
    inject(DestroyRef).onDestroy(() => view?.removeEventListener('pageshow', onPageShow));
  }

  start(session: Session): void {
    this.state.set(session);
    this.write(session);
  }

  end(): void {
    this.state.set(null);
    this.write(null);
  }

  /** True while a session exists and its token has not expired; an expired session is ended. */
  isActive(): boolean {
    const s = this.state();
    if (s && isExpired(s)) {
      this.end();
      return false;
    }
    return s !== null;
  }

  /** Reloads the page; a method so tests can replace it. */
  protected reload(): void {
    this.doc.defaultView?.location.reload();
  }

  private storedToken(): string | null {
    try {
      const raw = this.doc.defaultView?.sessionStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? ((JSON.parse(raw) as Session).token ?? null) : null;
    } catch {
      return this.state()?.token ?? null; // storage blocked: memory is all there is
    }
  }

  private readStored(): Session | null {
    try {
      const raw = this.doc.defaultView?.sessionStorage.getItem(SESSION_STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as Session) : null;
      if (stored && typeof stored.token === 'string' && !isExpired(stored)) {
        // A session stored before the employee id existed has no such field; it reads as none.
        return { ...stored, employeeId: stored.employeeId ?? null };
      }
      if (raw) {
        this.doc.defaultView?.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
      return null;
    } catch {
      return null; // storage blocked or unreadable: start logged out
    }
  }

  private write(session: Session | null): void {
    try {
      const storage = this.doc.defaultView?.sessionStorage;
      if (session) {
        storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        storage?.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // storage blocked: the session lasts until the page is reloaded
    }
  }
}

function isExpired(session: Session): boolean {
  const expiresAt = Date.parse(session.expiresAt);
  return Number.isNaN(expiresAt) || expiresAt <= Date.now();
}
