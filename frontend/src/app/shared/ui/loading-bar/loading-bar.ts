import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';

/** How long a load must last before the bar shows, so quick requests do not make it flicker. */
export const LOADING_BAR_DELAY_MS = 200;

/**
 * A thin animated bar that shows while `active` is true (after a short delay): the application's sign that it is
 * waiting for the backend. It is placed by its host; it adds no space of its own when hidden. With reduced motion it
 * is a still bar.
 */
@Component({
  selector: 'app-loading-bar',
  host: { class: 'block', 'data-slot': 'loading-bar' },
  template: `
    @if (shown()) {
      <div role="progressbar" aria-label="Loading" class="h-0.5 w-full overflow-hidden bg-primary/20">
        <div class="h-full w-1/3 animate-loading-bar bg-primary motion-reduce:w-full motion-reduce:animate-none"></div>
      </div>
    }
  `,
})
export class LoadingBar {
  readonly active = input(false);

  protected readonly shown = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      clearTimeout(this.timer);
      if (this.active()) {
        this.timer = setTimeout(() => this.shown.set(true), LOADING_BAR_DELAY_MS);
      } else {
        this.shown.set(false);
      }
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }
}
