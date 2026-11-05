import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AnnouncementBar, LINE_BREAK_GAP, MORE_DETAILS_TEXT } from './announcement-bar';

@Component({ template: 'stub' })
class Stub {}

@Component({
  imports: [AnnouncementBar],
  template: `<app-announcement-bar [text]="text()" />`,
})
class Host {
  readonly text = signal('Office closed on Friday');
}

describe('AnnouncementBar', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([{ path: 'admin/notification', component: Stub }])],
    });
    fixture = TestBed.createComponent(Host);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const link = () => el.querySelector<HTMLAnchorElement>('a')!;
  const moving = () => el.querySelector<HTMLElement>('[data-slot="announcement-heading"]')!;
  const text = () => el.querySelector<HTMLElement>('[data-slot="announcement-text"]')!;
  const more = () => el.querySelector<HTMLElement>('[data-slot="announcement-more"]')!;
  const duration = () => parseFloat(moving().style.getPropertyValue('--announcement-duration'));

  it('is one link to the Notification screen that holds the text', () => {
    expect(el.querySelectorAll('a')).toHaveLength(1);
    expect(link().getAttribute('href')).toBe('/admin/notification');
    expect(text().textContent).toBe('Office closed on Friday');
    expect(link().contains(moving())).toBe(true);
  });

  it('names the text once and what it does for screen readers, and hides the moving copies from them', () => {
    expect(link().getAttribute('aria-label')).toBe('Notification: Office closed on Friday. Open the notification');
    expect(moving().getAttribute('aria-hidden')).toBe('true');
  });

  it('adds "Click here for more Details" after the text, a little apart, smaller and underlined, moving with it', () => {
    expect(MORE_DETAILS_TEXT).toBe('Click here for more Details');
    expect(more().textContent).toBe('Click here for more Details');
    // After the text, inside the moving copy, so it scrolls with it.
    expect(text().nextElementSibling).toBe(more());
    expect(moving().contains(more())).toBe(true);
    expect(moving().textContent).toBe('Office closed on FridayClick here for more Details');
    // Smaller than the 16 px text: 14 px.
    for (const c of ['ms-10', 'text-sm', 'underline']) expect(more().classList).toContain(c);
  });

  it('keeps the added phrase apart from the text, which stays exactly as entered', () => {
    fixture.componentInstance.text.set('Bonus announced');
    fixture.detectChanges();

    expect(text().textContent).toBe('Bonus announced');
    expect(el.querySelectorAll('[data-slot="announcement-more"]')).toHaveLength(1);
  });

  it('shows no tooltip on hover', () => {
    expect(el.querySelectorAll('[title]')).toHaveLength(0);
  });

  it('opens the Notification screen on a click anywhere on the bar, beside the text too', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    link().click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/admin/notification');
  });

  it('can be reached with the keyboard: a link, so Enter opens it', () => {
    expect(link().tabIndex).toBe(0);
    expect(link().hasAttribute('href')).toBe(true);
  });

  it('is one flat color from the theme with a thin line below it, normal-weight 16 px text, one line high, with the hand pointer', () => {
    const classes = link().classList;
    for (const c of ['bg-announcement', 'text-announcement-foreground', 'border-b', 'text-base', 'h-9', 'cursor-pointer']) expect(classes).toContain(c);
    // No gradient, no fading and no bold text.
    expect([...classes].filter((c) => /^(bg-linear|from-|via-|to-|bg-size|animate-|font-semibold|font-bold)/.test(c))).toEqual([]);
  });

  it('shows the text only once: no repeats and no dividers', () => {
    expect(el.querySelectorAll('[data-slot="announcement-heading"]')).toHaveLength(1);
    expect(el.querySelectorAll('[data-slot="announcement-divider"]')).toHaveLength(0);
  });

  it("runs the text inside a lane inset from both ends: it starts at the lane's right end and leaves at its left", () => {
    const lane = el.querySelector<HTMLElement>('[data-slot="announcement-lane"]')!;

    expect(link().classList).toContain('px-6');
    expect(lane.contains(moving())).toBe(true);
    for (const c of ['overflow-hidden', 'flex-1', 'min-w-0']) expect(lane.classList).toContain(c);
    // Its left padding is the lane's width, so the text starts at the lane's right end.
    expect(moving().classList).toContain('pl-[100%]');
  });

  it('moves the text from right to left, pausing on hover and focus', () => {
    for (const c of ['animate-announcement', 'whitespace-pre', 'group-hover:[animation-play-state:paused]', 'group-focus-visible:[animation-play-state:paused]']) {
      expect(moving().classList).toContain(c);
    }
  });

  it('stands still with reduced motion at the left of the lane, cut with an ellipsis', () => {
    for (const c of ['motion-reduce:animate-none', 'motion-reduce:pl-0', 'motion-reduce:max-w-full', 'motion-reduce:overflow-hidden', 'motion-reduce:text-ellipsis']) {
      expect(moving().classList).toContain(c);
    }
  });

  it('shows the text exactly as entered: spaces kept, each line break a wide gap, all on one line', () => {
    fixture.componentInstance.text.set('  Festival   bonus\r\nfor all\nstaff  ');
    fixture.detectChanges();

    expect(text().textContent).toBe(`  Festival   bonus${LINE_BREAK_GAP}for all${LINE_BREAK_GAP}staff  `);
    expect(moving().classList).toContain('whitespace-pre');
    // The link's name reads the words once, without the gaps.
    expect(link().getAttribute('aria-label')).toBe('Notification: Festival bonus for all staff. Open the notification');
  });

  it('gives a longer text more time, so every text moves at about the same speed', () => {
    const short = duration();
    fixture.componentInstance.text.set('A much longer text '.repeat(40));
    fixture.detectChanges();

    expect(short).toBeGreaterThan(0);
    expect(duration()).toBeGreaterThan(short);
  });

  it('is white with ICEGATE navy text in the light theme, and black with white text in the dark theme', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    const block = (selector: string) => css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)));
    const value = (text: string, name: string) => new RegExp(`--${name}: ([^;]+);`).exec(text)![1].trim().toLowerCase();
    const names = ['announcement-bg', 'announcement-fg'];

    expect(names.map((n) => value(block(':root'), n))).toEqual(['#ffffff', '#183473']);
    expect(names.map((n) => value(block(':root.dark'), n))).toEqual(['#000000', '#ffffff']);
    // One pass moves the text by its own width plus the lane's (its padding), so it leaves the lane on the left.
    expect(css).toMatch(/@keyframes announcement \{[^}]*translateX\(0\)[^}]*\}[^}]*translateX\(-100%\)/);
  });
});
