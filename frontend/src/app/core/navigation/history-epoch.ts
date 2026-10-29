import { Location } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { CanActivateChildFn, NavigationEnd, RedirectCommand, Router } from '@angular/router';

/** The `history.state` key that holds the epoch a browser history entry was made in. */
export const HISTORY_EPOCH_STATE = 'ierpHistoryEpoch';

const STORAGE_KEY = 'ierp.historyEpoch';

/**
 * The browser's history cannot be cleared, so a branch switch starts a new history epoch instead: every history entry
 * the app makes is stamped with the epoch it was made in, and `historyEpochGuard` turns the browser's Back (or Forward)
 * to an entry of an earlier epoch into the Dashboard. The screens of the old branch are so out of reach, while Back
 * keeps working among the screens opened since. The epoch is kept in session storage, so a reload keeps it.
 */
@Injectable({ providedIn: 'root' })
export class HistoryEpoch {
  private readonly location = inject(Location);
  private current = readStored() ?? newEpoch();

  constructor() {
    store(this.current);
    const subscription = inject(Router).events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.stamp();
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  get value(): string {
    return this.current;
  }

  /** Starts a new epoch: the history entries made so far can no longer be gone back to. */
  reset(): void {
    this.current = newEpoch();
    store(this.current);
  }

  /** Stamps the current history entry with the epoch, keeping the router's own state in it. */
  private stamp(): void {
    const state = (this.location.getState() ?? {}) as Record<string, unknown>;
    if (state[HISTORY_EPOCH_STATE] === this.current) return;
    this.location.replaceState(this.location.path(true), '', { ...state, [HISTORY_EPOCH_STATE]: this.current });
  }
}

/**
 * On the shell's screens: a Back or Forward of the browser to an entry of an earlier epoch (a screen opened before a
 * branch switch) opens the Dashboard in its place.
 */
export const historyEpochGuard: CanActivateChildFn = () => {
  const router = inject(Router);
  const epoch = inject(HistoryEpoch);
  const navigation = router.currentNavigation();
  if (navigation?.trigger !== 'popstate') return true;
  const made = (navigation.extras.state as Record<string, unknown> | undefined)?.[HISTORY_EPOCH_STATE];
  if (made === epoch.value) return true;
  return new RedirectCommand(router.parseUrl('/'), { replaceUrl: true });
};

function newEpoch(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function readStored(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked: memory is all there is
  }
}

function store(value: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage blocked: the epoch lasts until a reload
  }
}
