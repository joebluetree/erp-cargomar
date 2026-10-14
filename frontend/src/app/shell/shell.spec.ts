import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthSession, SESSION_STORAGE_KEY } from '../core/auth/auth-session';
import { testSession } from '../core/auth/auth-session.testing';
import { authGuard } from '../core/auth/auth.guards';
import { NAV_ITEMS, NAV_MENU } from '../core/navigation/nav-items';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vi } from 'vitest';
import { Shell } from './shell';

@Component({ template: '<p id="page-body">Page body</p>' })
class PageStub {}

describe('Shell', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
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

  it('makes the application name a link to the Dashboard, in the page-title green, with its size and weight', async () => {
    const { el } = await render();

    const caption = el.querySelector('header a') as HTMLAnchorElement;
    expect(caption.getAttribute('href')).toBe('/');
    expect(caption.textContent?.trim()).toBe('Cargomar Pvt Ltd');
    expect(Array.from(caption.classList)).toEqual(expect.arrayContaining(['text-xl', 'font-bold']));
    // The header token (the page-title green, see the token test), with no hover color change, no underline (the base styles give links none) and no fill.
    expect(caption.classList).toContain('text-header-company');
    expect(caption.className).not.toMatch(/hover:|text-(primary|blue|green)|underline|bg-/);
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

  it('has no user menu in the header: only the menu buttons, Change branch, the theme switch and Log out', async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
    const { el } = await render();

    const labels = Array.from(el.querySelectorAll('header button')).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Open menu', 'Hide navigation bar', 'Change branch', 'Switch to dark theme', 'Log out']);
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

  describe('session in the header', () => {
    const details = (el: HTMLElement) => el.querySelector('[data-slot="session-details"]') as HTMLElement | null;
    const logoutButton = (el: HTMLElement) => el.querySelector('header button[aria-label="Log out"]') as HTMLButtonElement;

    /** A stored session, as after a login: AuthSession reads it when the test creates it. */
    async function renderLoggedIn() {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession()));
      return render();
    }

    const changeBranchButton = (el: HTMLElement) =>
      el.querySelector('header button[aria-label="Change branch"]') as HTMLButtonElement | null;

    it('puts Change branch right after the session details and before the theme switch', async () => {
      const { el } = await renderLoggedIn();

      const button = changeBranchButton(el)!;
      expect(details(el)!.nextElementSibling).toBe(button);
      expect(button.nextElementSibling).toBe(themeButton(el));
      expect(button.getAttribute('type')).toBe('button');
      expect(button.getAttribute('title')).toBe('Change branch');
      expect(button.classList).toContain('shrink-0');
      expect(button.querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('shows no Change branch button without a session', async () => {
      const { el } = await render();

      expect(changeBranchButton(el)).toBeNull();
    });

    it('opens the Change Branch dialog, which loads the lists', async () => {
      const { el } = await renderLoggedIn();

      changeBranchButton(el)!.click();
      // The dialog's code is loaded on first use, so wait until it has arrived and rendered.
      const app = TestBed.inject(ApplicationRef);
      await vi.waitFor(
        () => {
          app.tick();
          expect(document.querySelector('[role="dialog"]')).not.toBeNull();
        },
        { timeout: 5000, interval: 20 },
      );

      const dialog = document.querySelector('[role="dialog"]')!;
      expect(dialog.querySelector('[hlmDialogTitle]')?.textContent?.trim()).toBe('Change Branch');
      // Wide enough for each label to sit beside its field (36rem), capped to the screen by the dialog itself.
      const content = dialog.querySelector('hlm-dialog-content')!;
      expect(Array.from(content.classList)).toEqual(expect.arrayContaining(['w-xl', 'sm:max-w-xl']));
      expect(content.classList).not.toContain('sm:max-w-md'); // the generated cap is replaced, not stacked
      TestBed.inject(HttpTestingController).expectOne('admin/session/options');
      document.body.querySelectorAll('.cdk-overlay-container').forEach((c) => c.replaceChildren());
    });

    it('shows the new branch and year as soon as the session switches', async () => {
      const { harness, el } = await renderLoggedIn();

      TestBed.inject(AuthSession).start(testSession({ branchName: 'Mumbai', yearName: '2024-2025' }));
      harness.detectChanges();

      const parts = Array.from(details(el)!.querySelectorAll('span[aria-hidden="true"]')).map((s) => s.textContent?.trim());
      expect(parts).toEqual(['ADMIN', 'Mumbai', '2024-2025']);
    });

    it('shows the user name, the branch and the year, before the theme switch', async () => {
      const { el } = await renderLoggedIn();

      const parts = Array.from(details(el)!.querySelectorAll('span[aria-hidden="true"]')).map((s) => s.textContent?.trim());
      expect(parts).toEqual(['ADMIN', 'Kochi', '2025-2026']);
      expect(details(el)!.compareDocumentPosition(themeButton(el)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(themeButton(el).compareDocumentPosition(logoutButton(el)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('shows the user in bold blue, the branch in dark yellow and the year in bold in the text color', async () => {
      const { el } = await renderLoggedIn();

      const [user, branch, year] = Array.from(details(el)!.querySelectorAll('span[aria-hidden="true"]'));
      expect(Array.from(user.classList)).toEqual(expect.arrayContaining(['font-semibold', 'text-header-user']));
      expect(branch.classList).toContain('text-header-branch');
      expect(branch.className).not.toMatch(/font-(semibold|bold)/);
      expect(Array.from(year.classList)).toEqual(expect.arrayContaining(['font-semibold', 'text-header-year']));
      expect(details(el)!.querySelectorAll('.text-muted-foreground')).toHaveLength(0);
    });

    it('takes the title color from the page titles and gives the branch a dark yellow, in both themes', () => {
      const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
      const values = (token: string) => Array.from(css.matchAll(new RegExp(`^\\s*--${token}:\\s*([^;]+);`, 'gm'))).map((m) => m[1].trim());

      // The page titles are text-primary, so the company title follows --primary in both themes (no dark override).
      expect(values('header-company')).toEqual(['var(--primary)']);
      // Dark yellow: a light and a dark value, both with a yellow hue (oklch hue 80 to 95).
      const branch = values('header-branch');
      expect(branch).toHaveLength(2);
      for (const value of branch) {
        const hue = Number(/oklch\([\d.]+ [\d.]+ ([\d.]+)\)/.exec(value)?.[1]);
        expect(hue).toBeGreaterThanOrEqual(80);
        expect(hue).toBeLessThanOrEqual(95);
      }
    });

    it('keeps the full text available on hover and to screen readers', async () => {
      const { el } = await renderLoggedIn();

      expect(details(el)!.getAttribute('title')).toBe('ADMIN, Kochi, 2025-2026');
      expect(details(el)!.querySelector('.sr-only')?.textContent?.trim()).toBe('Logged in as ADMIN, Kochi, 2025-2026');
    });

    it('shortens the details on narrow screens and never pushes the buttons out of view', async () => {
      const { el } = await renderLoggedIn();

      const [user, company, year] = Array.from(details(el)!.querySelectorAll('span[aria-hidden="true"]'));
      expect(Array.from(details(el)!.classList)).toEqual(expect.arrayContaining(['min-w-0', 'ml-auto']));
      expect(user.classList).toContain('truncate');
      expect(Array.from(company.classList)).toEqual(expect.arrayContaining(['hidden', 'sm:inline', 'truncate']));
      expect(Array.from(year.classList)).toEqual(expect.arrayContaining(['hidden', 'sm:inline']));
      expect(themeButton(el).classList).toContain('shrink-0');
      expect(logoutButton(el).classList).toContain('shrink-0');
    });

    it('uses the logged-in company as the main title, still a link to the Dashboard with the same look', async () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(testSession({ companyName: 'CARGOMAR PRIVATE LTD' })));
      const { el } = await render();

      const title = el.querySelector('header a')!;
      expect(title.textContent?.trim()).toBe('CARGOMAR PRIVATE LTD');
      expect(title.getAttribute('href')).toBe('/');
      expect(Array.from(title.classList)).toEqual(expect.arrayContaining(['text-xl', 'font-bold']));
      expect(details(el)!.textContent).not.toContain('CARGOMAR PRIVATE LTD');
    });

    it('shows no session details and no Log out without a session', async () => {
      const { el } = await render();

      expect(details(el)).toBeNull();
      expect(logoutButton(el)).toBeNull();
      expect(themeButton(el).classList).toContain('ml-auto');
    });

    it('logs out: ends the session and shows the login screen; Back stays on the login screen', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            { path: 'login', component: PageStub },
            {
              path: '',
              component: Shell,
              canMatch: [authGuard],
              children: [
                { path: '', pathMatch: 'full', component: PageStub },
                { path: 'reports', component: PageStub },
              ],
            },
          ]),
        ],
      });
      TestBed.inject(AuthSession).start(testSession());
      const harness = await RouterTestingHarness.create('/');
      await harness.navigateByUrl('/reports');
      const router = TestBed.inject(Router);

      logoutButton(harness.routeNativeElement as HTMLElement).click();
      await settle(harness);

      expect(router.url).toBe('/login');
      expect(TestBed.inject(AuthSession).isLoggedIn()).toBe(false);
      expect(document.querySelector('[data-slot="session-details"]')).toBeNull();

      history.back();
      await new Promise((resolve) => setTimeout(resolve, 50));
      await settle(harness);
      expect(router.url).toBe('/login');

      // Whatever Back restores, the page that was open before cannot be shown again without a login.
      await harness.navigateByUrl('/reports');
      expect(router.url).toBe('/login');
    });
  });
});
