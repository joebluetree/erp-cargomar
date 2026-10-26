import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle } from '@ng-icons/lucide';
import { LOADING_BAR_DELAY_MS } from '../loading-bar/loading-bar';

/**
 * The freeze layer while the application waits for the backend: while `active` is true it covers the whole window
 * and catches every click, with the normal mouse pointer. It is fully clear, so the screen looks unchanged, only
 * frozen; after the loading delay it shows a spinner in the middle. Its host makes the content behind it inert, so the
 * keyboard cannot reach it either.
 */
@Component({
  selector: 'app-loading-overlay',
  imports: [NgIcon],
  providers: [provideIcons({ lucideLoaderCircle })],
  host: { class: 'contents', 'data-slot': 'loading-overlay' },
  template: `
    @if (active()) {
      <div
        data-slot="loading-freeze"
        class="fixed inset-0 z-[60] flex items-center justify-center"
        [attr.data-waiting]="waiting() || null"
        aria-hidden="true"
      >
        @if (waiting()) {
          <ng-icon name="lucideLoaderCircle" class="animate-spin text-4xl text-primary" />
        }
      </div>
    }
  `,
})
export class LoadingOverlay {
  readonly active = input(false);

  /** True once the load has lasted the loading delay: the spinner shows. */
  protected readonly waiting = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      clearTimeout(this.timer);
      if (this.active()) {
        this.timer = setTimeout(() => this.waiting.set(true), LOADING_BAR_DELAY_MS);
      } else {
        this.waiting.set(false);
      }
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }
}
