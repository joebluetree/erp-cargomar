import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { testSession } from '../../core/auth/auth-session.testing';
import { AuthSession } from '../../core/auth/auth-session';
import { ChangeBranchDialog } from '../../features/admin/change-branch/change-branch.dialog';
import { SESSION_OPTIONS } from '../../features/admin/change-branch/change-branch.testing';
import { LoginPage } from '../../features/admin/login/login.page';
import { LoginService } from '../../features/admin/login/login.service';
import { Dashboard } from '../../features/dashboard/dashboard';
import { CompanyListPage } from '../../features/reports/company-list/company-list.page';
import { CompanyListService } from '../../features/reports/company-list/company-list.service';
import { Shell } from '../../shell/shell';
import { clickableElements, clickableSelector } from './clickable';

/**
 * The hand pointer is one global rule in styles.css. jsdom loads no stylesheet, so these tests take the rule's
 * selector list from the file and check, with the DOM's own `matches`, what the screens render against it.
 */
describe('hand pointer on everything clickable', () => {
  const selector = clickableSelector();
  const covered = (el: Element) => el.matches(selector);

  describe('the rule', () => {
    const make = (html: string) => {
      const host = document.createElement('div');
      host.innerHTML = html;
      return host.firstElementChild!;
    };

    it('covers enabled buttons, links, dropdowns, role=button and summary', () => {
      expect(covered(make('<button type="button">x</button>'))).toBe(true);
      expect(covered(make('<a href="/x">x</a>'))).toBe(true);
      expect(covered(make('<select><option>1</option></select>'))).toBe(true);
      expect(covered(make('<div role="button">x</div>'))).toBe(true);
      expect(covered(make('<summary>x</summary>'))).toBe(true);
    });

    it('does not cover disabled things or links without a destination', () => {
      expect(covered(make('<button type="button" disabled>x</button>'))).toBe(false);
      expect(covered(make('<select disabled><option>1</option></select>'))).toBe(false);
      expect(covered(make('<div role="button" aria-disabled="true">x</div>'))).toBe(false);
      expect(covered(make('<a>x</a>'))).toBe(false);
    });

    it('does not cover plain text', () => {
      expect(covered(make('<p>x</p>'))).toBe(false);
      expect(covered(make('<span>x</span>'))).toBe(false);
    });
  });

  describe('the shell with the Dashboard', () => {
    async function render() {
      sessionStorage.clear(); // no session: the header shows no Change branch or Log out, whatever ran before
      TestBed.configureTestingModule({
        providers: [
          provideRouter([{ path: '', component: Shell, children: [{ path: '', component: Dashboard }] }]),
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });
      const harness = await RouterTestingHarness.create('/');
      harness.detectChanges();
      return harness.routeNativeElement as HTMLElement;
    }

    it('gives a hand to the hamburgers, the theme button, the menu entries and the quick links', async () => {
      const el = await render();

      const clickable = clickableElements(el);
      expect(clickable).toHaveLength(15); // the name link, 2 hamburgers, the theme button, 6 menu entries and 5 quick links
      const labels = clickable.map((c) => c.getAttribute('aria-label') ?? c.textContent?.trim());
      expect(labels).toEqual(expect.arrayContaining(['Cargomar Pvt Ltd', 'Open menu', 'Hide navigation bar', 'Switch to dark theme', 'Dashboard', 'Company List', 'Branch List', 'Profile', 'Employee List', 'Holiday List']));
      const missing = clickable.filter((c) => !covered(c)).map((c) => c.outerHTML.slice(0, 80));
      expect(missing).toEqual([]);
    });
  });

  describe('the login screen', () => {
    it('gives a hand to the eye, Remember me, Cancel and Login buttons, and to the Remember me label', () => {
      TestBed.configureTestingModule({
        imports: [LoginPage],
        providers: [LoginService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      });
      const fixture = TestBed.createComponent(LoginPage);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      const clickable = clickableElements(el);
      const labels = clickable.map((c) => c.getAttribute('aria-label') ?? c.textContent?.replace(/\s+/g, ' ').trim());
      expect(labels).toEqual(expect.arrayContaining(['Show password', 'Cancel', 'Login']));
      const missing = clickable.filter((c) => !covered(c)).map((c) => c.outerHTML.slice(0, 80));
      expect(missing).toEqual([]);
      // The checkbox is a button (covered above) whose own class would otherwise win over the global rule.
      const remember = el.querySelector('#login-remember')!;
      expect(clickable).toContain(remember);
      expect(remember.classList).toContain('cursor-pointer');
      // A label is not a button: clicking it toggles the box, so it gets the hand itself.
      expect(el.querySelector('label[for="login-remember"]')!.classList).toContain('cursor-pointer');
    });
  });

  describe('the Company List', () => {
    function render() {
      TestBed.configureTestingModule({
        imports: [CompanyListPage],
        providers: [CompanyListService, provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      });
      const fixture = TestBed.createComponent(CompanyListPage);
      fixture.detectChanges();
      const company = (n: number) => ({
        id: `C${n}`, code: `C${n}`, name: `Name ${n}`, address1: '', address2: '', address3: '', tel: '', email: '', web: '',
      });
      TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url === 'reports/companies')
        .flush({ items: [company(1), company(2), company(3)], total: 23, page: 1, pageSize: 10 });
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('gives a hand to every enabled button, the dropdown and the sort buttons', () => {
      const el = render();

      const clickable = clickableElements(el);
      const labels = clickable.map((c) => c.getAttribute('aria-label') ?? c.textContent?.replace(/\s+/g, ' ').trim());
      expect(labels).toEqual(expect.arrayContaining(['Back', 'Search', 'Wrap text: on', 'Code', 'Name', 'Next page', 'Last page']));
      expect(clickable.some((c) => c.tagName === 'SELECT')).toBe(true);
      const missing = clickable.filter((c) => !covered(c)).map((c) => c.outerHTML.slice(0, 80));
      expect(missing).toEqual([]);
    });

    it('does not give a hand to the disabled First and Previous buttons on page 1', () => {
      const el = render();

      const first = el.querySelector('button[aria-label="First page"]')!;
      const previous = el.querySelector('button[aria-label="Previous page"]')!;
      expect((first as HTMLButtonElement).disabled).toBe(true);
      expect(covered(first)).toBe(false);
      expect(covered(previous)).toBe(false);
      expect(clickableElements(el)).not.toContain(first);
    });

    it('gives selectable rows the hand through the shared table row, not through the page', () => {
      const el = render();

      const row = el.querySelector('tbody tr[tabindex]')!;
      expect(Array.from(row.classList)).toContain('[&[tabindex]]:cursor-pointer');
      // Rows are not buttons, so the global rule does not cover them; the table row directive does.
      expect(covered(row)).toBe(false);
    });
  });

  describe('the Change Branch dialog', () => {
    it('gives a hand to Select, Cancel, Close, both dropdowns and every list row', async () => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
      TestBed.inject(AuthSession).start(testSession());
      const app = TestBed.inject(ApplicationRef);
      const settle = async () => {
        app.tick();
        await app.whenStable();
        await new Promise((r) => setTimeout(r));
        app.tick();
      };
      TestBed.inject(HlmDialogService).open(ChangeBranchDialog);
      await settle();
      TestBed.inject(HttpTestingController).expectOne('admin/session/options').flush(SESSION_OPTIONS);
      await settle();
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;

      const clickable = clickableElements(dialog);
      const labels = clickable.map((c) => c.getAttribute('aria-label') ?? c.textContent?.replace(/\s+/g, ' ').trim());
      // The dropdowns are buttons named by their current value.
      expect(labels).toEqual(expect.arrayContaining(['Select', 'Cancel', 'Close', 'Kochi', '2025-2026']));
      expect(clickable.filter((c) => !covered(c)).map((c) => c.outerHTML.slice(0, 80))).toEqual([]);
      // List rows are options, not buttons: the shared select item gives them the hand itself.
      (document.getElementById('change-branch-branch') as HTMLButtonElement).click();
      await settle();
      const items = Array.from(document.querySelectorAll('hlm-select-item'));
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.classList.contains('cursor-pointer'))).toBe(true);
      document.body.replaceChildren();
      sessionStorage.clear();
    });
  });
});
