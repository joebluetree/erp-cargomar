import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LOADING_BAR_DELAY_MS, LoadingBar } from './loading-bar';

@Component({
  imports: [LoadingBar],
  template: '<app-loading-bar [active]="active()" />',
})
class Host {
  readonly active = signal(false);
}

describe('LoadingBar', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function create() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const bar = () => (fixture.nativeElement as HTMLElement).querySelector('[role="progressbar"]');
    const set = (active: boolean) => {
      fixture.componentInstance.active.set(active);
      fixture.detectChanges();
    };
    const wait = (ms: number) => {
      vi.advanceTimersByTime(ms);
      fixture.detectChanges();
    };
    return { bar, set, wait };
  }

  it('shows an accessible progress bar once a load has lasted the delay', () => {
    const { bar, set, wait } = create();

    set(true);
    wait(LOADING_BAR_DELAY_MS - 1);
    expect(bar()).toBeNull();
    wait(1);

    expect(bar()).not.toBeNull();
    expect(bar()!.getAttribute('aria-label')).toBe('Loading');
  });

  it('does not show for a load shorter than the delay', () => {
    const { bar, set, wait } = create();

    set(true);
    wait(LOADING_BAR_DELAY_MS / 2);
    set(false);
    wait(LOADING_BAR_DELAY_MS);

    expect(bar()).toBeNull();
  });

  it('hides as soon as the load ends', () => {
    const { bar, set, wait } = create();
    set(true);
    wait(LOADING_BAR_DELAY_MS);

    set(false);

    expect(bar()).toBeNull();
  });

  it('uses theme colors and keeps still with reduced motion', () => {
    const { bar, set, wait } = create();
    set(true);
    wait(LOADING_BAR_DELAY_MS);

    const inner = bar()!.firstElementChild!;
    expect(inner.classList).toContain('bg-primary');
    expect(inner.classList).toContain('animate-loading-bar');
    expect(inner.classList).toContain('motion-reduce:animate-none');
  });
});
