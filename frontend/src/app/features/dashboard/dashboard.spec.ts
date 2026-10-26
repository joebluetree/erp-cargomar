import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuModule } from '../../core/navigation/menu.model';
import { TEST_MENU, provideTestMenu } from '../../core/navigation/menu.testing';
import { NAV_LOOK } from '../../core/navigation/nav-look';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  function create(modules: MenuModule[] = [], loaded = true) {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideTestMenu(modules, { loaded })],
    });
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const quickLinks = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('.quick-links a')).map((a) => [a.textContent?.trim(), a.getAttribute('href')]);

  it('shows a heading and a welcome text', () => {
    const { el } = create();

    expect(el.querySelector('h1')?.textContent).toContain('Dashboard');
    expect(el.textContent).toContain('Welcome to iErp');
  });

  it('shows the heading in the primary color', () => {
    const { el } = create();

    expect(el.querySelector('h1')!.classList).toContain('text-primary');
  });

  it('shows no loading message of its own while the menu loads, only the welcome', () => {
    const { el } = create(TEST_MENU, false);

    expect(el.querySelector('[role="status"]')).toBeNull();
    expect(el.textContent).not.toContain('Loading');
    expect(el.textContent).toContain('Welcome to iErp');
  });

  it('shows no quick-links section while the user has no menus', () => {
    const { el } = create([]);

    expect(el.querySelector('.quick-links')).toBeNull();
    expect(el.textContent).not.toContain('Quick links');
  });

  it('shows a quick link for each of the user\'s menus, with its menu code, and none for the Dashboard', () => {
    const { el } = create(TEST_MENU);

    expect(quickLinks(el)).toEqual([
      ['Company List', '/reports/companies?menuId=NS-COMPLIST'],
      ['Branch List', '/reports/branches?menuId=NS-BRANCHLIST'],
      ['Profile', '/admin/profile?menuId=NS-EMPPROFILE'],
      ['Employee List', '/admin/employees?menuId=NS-EMPLIST'],
      ['Holiday List', '/admin/holidays?menuId=NS-HOLIDAYLIST'],
    ]);
  });

  it('groups the quick links under module headings, in module order', () => {
    const { el } = create([
      { id: 'acc', name: 'Accounts', menus: [{ id: 'm-x', code: 'X', name: 'Ledger', route: 'accounts/ledger' }] },
      ...TEST_MENU,
    ]);

    const headings = Array.from(el.querySelectorAll('[data-slot="quick-links-module"]')).map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Accounts', 'Hr']);
    const groups = Array.from(el.querySelectorAll('.quick-links')).map((ul) => ul.querySelectorAll('a').length);
    expect(groups).toEqual([1, 5]);
  });

  it('colors a quick link\'s icon with the same tone as its menu entry', () => {
    const { el } = create(TEST_MENU);

    const icons = Array.from(el.querySelectorAll('.quick-links a ng-icon')) as HTMLElement[];
    for (const [index, entry] of TEST_MENU[0].menus.entries()) {
      const tone = NAV_LOOK[entry.route].tone;
      expect(icons[index].getAttribute('data-icon-tone')).toBe(tone);
      expect(icons[index].style.getPropertyValue('--ng-icon__color')).toBe(`var(--icon-${tone})`);
    }
  });

  it('sends no backend requests of its own', () => {
    create(TEST_MENU);

    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
