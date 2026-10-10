import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TableWrapToggle } from './table-wrap-toggle';

@Component({
  imports: [TableWrapToggle],
  template: '<app-table-wrap-toggle [(wrap)]="wrap" />',
})
class Host {
  readonly wrap = signal(false);
}

@Component({ imports: [TableWrapToggle], template: '<app-table-wrap-toggle />' })
class UnboundHost {}

describe('TableWrapToggle default', () => {
  it('is on when the screen does not set it', () => {
    const fixture = TestBed.createComponent(UnboundHost);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(button.textContent?.replace(/\s+/g, ' ').trim()).toBe('Wrap text: on');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('TableWrapToggle', () => {
  function render() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const button = () => el.querySelector('button')!;
    const label = () => button().textContent?.replace(/\s+/g, ' ').trim();
    const click = () => {
      button().click();
      fixture.detectChanges();
    };
    return { fixture, el, button, label, click, host: fixture.componentInstance };
  }

  it('shows the value the screen gives it (off here) in its label and to assistive technology', () => {
    const { label, button, host } = render();

    expect(label()).toBe('Wrap text: off');
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(host.wrap()).toBe(false);
  });

  it('turns on when clicked: the label, aria-pressed and the bound value follow', () => {
    const { label, button, click, host } = render();

    click();

    expect(label()).toBe('Wrap text: on');
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(host.wrap()).toBe(true);
  });

  it('turns off again when clicked a second time', () => {
    const { label, button, click, host } = render();

    click();
    click();

    expect(label()).toBe('Wrap text: off');
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(host.wrap()).toBe(false);
  });

  it('follows the value the screen sets (for example restored state)', () => {
    const { fixture, label, button, host } = render();

    host.wrap.set(true);
    fixture.detectChanges();

    expect(label()).toBe('Wrap text: on');
    expect(button().getAttribute('aria-pressed')).toBe('true');
  });

  it('changes its icon and look with the state, so the state is not only a color', () => {
    const { el, click } = render();
    // The icon is drawn as inline SVG, so a different icon means different markup.
    const icon = () => el.querySelector('ng-icon')!.innerHTML;
    const offIcon = icon();
    const offClasses = el.querySelector('button')!.className;

    click();

    expect(icon()).not.toBe(offIcon);
    expect(el.querySelector('button')!.className).not.toBe(offClasses);
  });

  it('is a real button of type button, so Enter and Space switch it and it never submits a form', () => {
    const { button } = render();

    expect(button().tagName).toBe('BUTTON');
    expect(button().type).toBe('button');
    expect(button().disabled).toBe(false);
    expect(button().tabIndex).toBe(0);
  });

  it('sends no request', () => {
    const { click } = render();

    click();
    click();

    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('is a left-aligned block with a data-slot and no literal color', () => {
    const { el } = render();
    const toggle = el.querySelector('app-table-wrap-toggle')!;

    expect(toggle.classList).toContain('block');
    expect(toggle.getAttribute('data-slot')).toBe('table-wrap-toggle');
    expect(toggle.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|\b(bg|text|border)-(red|blue|green|gray|slate|white|black)\b/i);
  });
});
