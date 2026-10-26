import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LOADING_BAR_DELAY_MS } from '../loading-bar/loading-bar';
import { LoadingOverlay } from './loading-overlay';

@Component({
  imports: [LoadingOverlay],
  template: '<app-loading-overlay [active]="active()" />',
})
class Host {
  readonly active = signal(false);
}

describe('LoadingOverlay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function create() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const layer = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-slot="loading-freeze"]');
    const set = (active: boolean) => {
      fixture.componentInstance.active.set(active);
      fixture.detectChanges();
    };
    const wait = (ms: number) => {
      vi.advanceTimersByTime(ms);
      fixture.detectChanges();
    };
    return { layer, set, wait };
  }

  it('freezes the whole window at once while active, catching clicks, with no tint, blur, fade or busy cursor', () => {
    const { layer, set } = create();
    expect(layer()).toBeNull();

    set(true);

    const el = layer()!;
    expect(el.classList).toContain('fixed');
    expect(el.classList).toContain('inset-0');
    expect(el.className).not.toMatch(/bg-|blur|transition|cursor-/);
    expect(el.querySelector('ng-icon')).toBeNull();
  });

  it('shows a spinner after the loading delay, still with no tint', () => {
    const { layer, set, wait } = create();

    set(true);
    wait(LOADING_BAR_DELAY_MS);

    const el = layer()!;
    expect(el.hasAttribute('data-waiting')).toBe(true);
    expect(el.querySelector('ng-icon.animate-spin')).not.toBeNull();
    expect(el.className).not.toMatch(/bg-|blur/);
  });

  it('goes away as soon as the load ends', () => {
    const { layer, set, wait } = create();
    set(true);
    wait(LOADING_BAR_DELAY_MS);

    set(false);

    expect(layer()).toBeNull();
  });
});
