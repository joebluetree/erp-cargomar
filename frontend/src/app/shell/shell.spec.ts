import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NAV_ITEMS, NAV_MENU } from '../core/navigation/nav-items';
import { Shell } from './shell';

@Component({ template: '<p id="page-body">Page body</p>' })
class PageStub {}

describe('Shell', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        { provide: NAV_MENU, useValue: [NAV_ITEMS[0], { label: 'Reports', icon: 'lucideHouse', route: '/reports' }] },
        provideRouter([
          {
            path: '',
            component: Shell,
            children: [
              { path: '', pathMatch: 'full', component: PageStub },
              { path: 'reports', component: PageStub },
            ],
          },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create('/');
    const el = harness.routeNativeElement as HTMLElement;
    return { harness, el };
  }

  const sidebarToggle = (el: HTMLElement) => el.querySelector('button[aria-controls="sidebar"]') as HTMLButtonElement;
  const sidebar = (el: HTMLElement) => el.querySelector('aside')!;
  const menuButton = (el: HTMLElement) => el.querySelector('button[aria-label="Open menu"]') as HTMLButtonElement;
  const drawerNav = () => document.querySelector('hlm-sheet-content app-nav');

  async function settle(harness: RouterTestingHarness) {
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('shows the header with the app name, the sidebar menu and the routed page', async () => {
    const { el } = await render();

    expect(el.querySelector('header')?.textContent).toContain('Cargomar Pvt Ltd');
    expect(el.querySelector('aside app-nav a')).toBeTruthy();
    expect(el.querySelector('main #page-body')?.textContent).toBe('Page body');
  });

  it('lets the page fill the width beside the sidebar and start at its left edge', async () => {
    const { el } = await render();

    const main = el.querySelector('main')!;
    const classes = Array.from(main.classList);
    // Not centered and not capped: no auto margins, no maximum width.
    expect(classes).not.toContain('mx-auto');
    expect(classes.filter((c) => /^(m[xlr]-auto|max-w-)/.test(c))).toEqual([]);
    expect(classes).toEqual(expect.arrayContaining(['w-full', 'flex-1', 'min-w-0', 'p-6']));
    // It sits in the same row as the sidebar, so it takes the remaining width.
    expect(main.parentElement).toBe(el.querySelector('aside')!.parentElement);
  });

  it('shows "Cargomar Pvt Ltd" as the application name, not "iErp"', async () => {
    const { el } = await render();

    const name = el.querySelector('header a')!.textContent?.trim();
    expect(name).toBe('Cargomar Pvt Ltd');
    expect(el.querySelector('header')?.textContent).not.toContain('iErp');
  });

  it('makes the application name a link to the Dashboard, with the same look as before', async () => {
    const { el } = await render();

    const caption = el.querySelector('header a') as HTMLAnchorElement;
    expect(caption.getAttribute('href')).toBe('/');
    expect(caption.textContent?.trim()).toBe('Cargomar Pvt Ltd');
    expect(Array.from(caption.classList)).toEqual(expect.arrayContaining(['text-xl', 'font-bold']));
    // No color or underline of its own: it keeps the text color and the base styles give links no underline.
    expect(caption.className).not.toMatch(/text-(primary|blue|green)|underline|bg-/);
    expect(caption.getAttribute('title')).toBe('Go to the Dashboard');
  });

  it('shows the Dashboard when the application name is clicked from another screen', async () => {
    const { harness, el } = await render();
    await harness.navigateByUrl('/reports');
    await settle(harness);
    expect(TestBed.inject(Router).url).toBe('/reports');

    (el.querySelector('header a') as HTMLAnchorElement).click();
    await settle(harness);

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('stays on the Dashboard when the application name is clicked there', async () => {
    const { harness, el } = await render();

    (el.querySelector('header a') as HTMLAnchorElement).click();
    await settle(harness);

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('has two hamburger buttons and exactly one is visible at any width: the narrow one by CSS, the wide one by CSS', async () => {
    const { el } = await render();

    expect(Array.from(menuButton(el).classList)).toContain('md:hidden');
    expect(Array.from(sidebarToggle(el).classList)).toEqual(expect.arrayContaining(['hidden', 'md:inline-flex']));
    for (const button of [menuButton(el), sidebarToggle(el)]) {
      expect(button.querySelector('ng-icon')).not.toBeNull();
    }
  });

  it('colors both hamburger icons in the brand green, with the icon color variable so hover does not change it', async () => {
    const { el } = await render();

    for (const button of [menuButton(el), sidebarToggle(el)]) {
      const icon = button.querySelector('ng-icon') as HTMLElement;
      expect(icon.getAttribute('data-icon-tone')).toBe('brand');
      expect(icon.style.getPropertyValue('--ng-icon__color')).toBe('var(--icon-brand)');
    }
  });

  it('shows the sidebar beside the content at first, and the toggle says it can hide it', async () => {
    const { el } = await render();

    expect(sidebar(el).id).toBe('sidebar');
    expect(Array.from(sidebar(el).classList)).toEqual(expect.arrayContaining(['hidden', 'md:block']));
    // The fixed width and border stay next to the visibility class that changes.
    expect(Array.from(sidebar(el).classList)).toEqual(expect.arrayContaining(['w-56', 'flex-none', 'border-r']));
    expect(sidebarToggle(el).getAttribute('aria-label')).toBe('Hide navigation bar');
    expect(sidebarToggle(el).getAttribute('aria-expanded')).toBe('true');
    expect(sidebarToggle(el).getAttribute('aria-controls')).toBe(sidebar(el).id);
  });

  it('hides the sidebar when the hamburger is used, and the content keeps its flexible width', async () => {
    const { harness, el } = await render();

    sidebarToggle(el).click();
    await settle(harness);

    expect(Array.from(sidebar(el).classList)).toContain('hidden');
    expect(Array.from(sidebar(el).classList)).not.toContain('md:block');
    expect(sidebarToggle(el).getAttribute('aria-label')).toBe('Show navigation bar');
    expect(sidebarToggle(el).getAttribute('aria-expanded')).toBe('false');
    // The content is the flexible item of the row, so it takes the width the sidebar leaves.
    expect(Array.from(el.querySelector('main')!.classList)).toEqual(expect.arrayContaining(['flex-1', 'w-full']));
    expect(drawerNav()).toBeNull();
  });

  it('shows the sidebar again when the hamburger is used a second time', async () => {
    const { harness, el } = await render();

    sidebarToggle(el).click();
    await settle(harness);
    sidebarToggle(el).click();
    await settle(harness);

    expect(Array.from(sidebar(el).classList)).toEqual(expect.arrayContaining(['hidden', 'md:block']));
    expect(sidebarToggle(el).getAttribute('aria-label')).toBe('Hide navigation bar');
    expect(sidebarToggle(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps the sidebar hidden when the user moves to another screen', async () => {
    const { harness, el } = await render();

    sidebarToggle(el).click();
    await settle(harness);
    await harness.navigateByUrl('/reports');
    await settle(harness);

    expect(Array.from(sidebar(el).classList)).not.toContain('md:block');
    expect(sidebarToggle(el).getAttribute('aria-label')).toBe('Show navigation bar');
  });

  it('shows the sidebar again after a browser reload (a new application)', async () => {
    const first = await render();
    sidebarToggle(first.el).click();
    await settle(first.harness);
    expect(Array.from(sidebar(first.el).classList)).not.toContain('md:block');

    TestBed.resetTestingModule(); // a reload: nothing is remembered
    const second = await render();

    expect(Array.from(sidebar(second.el).classList)).toEqual(expect.arrayContaining(['hidden', 'md:block']));
    expect(sidebarToggle(second.el).getAttribute('aria-expanded')).toBe('true');
  });

  it('switches with the keyboard: it is a real button of type button', async () => {
    const { el } = await render();

    expect(sidebarToggle(el).tagName).toBe('BUTTON');
    expect(sidebarToggle(el).type).toBe('button');
    expect(sidebarToggle(el).disabled).toBe(false);
    expect(sidebarToggle(el).tabIndex).toBe(0);
  });

  it('has no user menu in the header', async () => {
    const { el } = await render();

    const labels = Array.from(el.querySelectorAll('header button')).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Open menu', 'Hide navigation bar', 'Switch to dark theme']);
  });

  const themeButton = (el: HTMLElement) => el.querySelector('header button[aria-label^="Switch to"]') as HTMLButtonElement;

  it('has a theme button whose name states the action', async () => {
    const { el } = await render();

    expect(themeButton(el).getAttribute('aria-label')).toBe('Switch to dark theme');
  });

  it('switches to dark and back, updating the name and the page theme', async () => {
    const { harness, el } = await render();

    themeButton(el).click();
    await settle(harness);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(themeButton(el).getAttribute('aria-label')).toBe('Switch to light theme');

    themeButton(el).click();
    await settle(harness);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(themeButton(el).getAttribute('aria-label')).toBe('Switch to dark theme');
  });

  it('remembers the chosen theme', async () => {
    const { harness, el } = await render();

    themeButton(el).click();
    await settle(harness);

    expect(localStorage.getItem('ierp-theme')).toBe('dark');
  });

  it('is reachable from the keyboard as a real button', async () => {
    const { el } = await render();

    expect(themeButton(el).tagName).toBe('BUTTON');
    expect(themeButton(el).tabIndex).toBe(0);
  });

  it('gives the header menu button an accessible name', async () => {
    const { el } = await render();

    expect(menuButton(el)).toBeTruthy();
  });

  it('opens the overlay menu from the header button', async () => {
    const { harness, el } = await render();
    expect(drawerNav()).toBeNull();

    menuButton(el).click();
    await settle(harness);

    expect(drawerNav()).not.toBeNull();
  });

  it('shows the same colored icons in the slide-in menu as in the sidebar', async () => {
    const { harness, el } = await render();
    const tones = (root: ParentNode) => Array.from(root.querySelectorAll('a ng-icon')).map((i) => i.getAttribute('data-icon-tone'));
    const sidebar = tones(el.querySelector('aside')!);

    menuButton(el).click();
    await settle(harness);

    expect(sidebar).toEqual(['blue', null]); // the test menu's second entry has no tone
    expect(tones(drawerNav()!)).toEqual(sidebar);
  });

  it('closes the overlay after an entry is chosen and shows that page', async () => {
    const { harness, el } = await render();
    menuButton(el).click();
    await settle(harness);

    (drawerNav()?.querySelector('a[href="/reports"]') as HTMLAnchorElement).click();
    await settle(harness);
    await new Promise((resolve) => setTimeout(resolve, 400));
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/reports');
    expect(drawerNav()).toBeNull();
  });

  it('closes the overlay when it is dismissed without choosing', async () => {
    const { harness, el } = await render();
    menuButton(el).click();
    await settle(harness);

    const close = Array.from(document.querySelectorAll('hlm-sheet-content button')).find((b) => b.textContent?.includes('Close'));
    (close as HTMLElement).click();
    await settle(harness);
    await new Promise((resolve) => setTimeout(resolve, 400));
    harness.detectChanges();

    expect(drawerNav()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
