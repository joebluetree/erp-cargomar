import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router } from '@angular/router';

/**
 * What the application is waiting for, for the loading bar and the freeze layer in the shell: the backend requests
 * running (the loading interceptor counts every request through `HttpClient`), and a page change in progress (which
 * may download the screen's code and check its rights before any request of the screen). `busy` is true while either
 * has not finished.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pending = signal(0);
  private readonly navigating = signal(false);

  /** True while a backend request runs or a page change is in progress. */
  readonly busy = computed(() => this.pending() > 0 || this.navigating());

  constructor() {
    inject(Router)
      .events.pipe(takeUntilDestroyed())
      .subscribe((e) => {
        if (e instanceof NavigationStart) this.navigating.set(true);
        else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError || e instanceof NavigationSkipped)
          this.navigating.set(false);
      });
  }

  begin(): void {
    this.pending.update((n) => n + 1);
  }

  end(): void {
    this.pending.update((n) => Math.max(0, n - 1));
  }
}
