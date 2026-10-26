import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { MenuModule } from '../core/navigation/menu.model';
import { TEST_MENU, provideTestMenu } from '../core/navigation/menu.testing';
import { AppNav } from './app-nav';

@Component({ template: '' })
class Blank {}

describe('AppNav', () => {
  const onNavigated = vi.fn();

  @Component({ imports: [AppNav], template: '<app-nav (navigated)="onNavigated()" />' })
  class Host {
    onNavigated = onNavigated;
  }

  async function render(url = '/', modules: MenuModule[] = TEST_MENU) {
    onNavigated.mockReset();
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideTestMenu(modules), provideRouter([{ path: '**', component: Blank }])],
    });
    const harness = await RouterTestingHarness.create(url);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, fixture, harness };
  }

  const links = (el: HTMLElement) => Array.from(el.querySelectorAll('a'));
  const labels = (el: HTMLElement) => links(el).map((a) => a.textContent?.trim());
  const active = (el: HTMLElement) => links(el).filter((a) => a.classList.contains('active')).map((a) => a.textContent?.trim());
  const entry = (el: HTMLElement, label: string) => links(el).find((a) => a.textContent?.trim() === label)!;

  it('lists Dashboard first, then each module as a heading, with only HR open at login', async () => {
    const { el } = await render('/', [
      { id: 'acc', name: 'Accounts', menus: [{ id: 'm-x', code: 'X', name: 'Ledger', route: 'accounts/ledger' }] },
      ...TEST_MENU,
    ]);

    // Headings as "# name", then the entries; a module's entries are a list inside its item.
    const items = Array.from(el.querySelectorAll('nav [data-slot="nav-module"], nav a')).map((n) =>
      n.getAttribute('data-slot') === 'nav-module' ? `# ${n.textContent?.trim()}` : n.textContent?.trim(),
    );
    expect(items).toEqual(['Dashboard', '# Accounts', '# Hr', 'Company List', 'Branch List', 'Profile', 'Employee List', 'Holiday List']);
  });

  it('makes a module heading a button, and the HR module open, with an arrow up, at first', async () => {
    const { el } = await render();

    const heading = el.querySelector<HTMLButtonElement>('[data-slot="nav-module"]')!;
    expect(heading.tagName).toBe('BUTTON');
    expect(heading.type).toBe('button');
    expect(heading.querySelector('a')).toBeNull();
    expect(heading.getAttribute('aria-expanded')).toBe('true');
    expect(heading.querySelector('ng-icon')!.getAttribute('data-arrow')).toBe('up');
    expect(el.querySelector('#' + heading.getAttribute('aria-controls'))!.querySelectorAll('a')).toHaveLength(5);
  });

  it('gives a module heading a highlight background in the brand color, open or collapsed', async () => {
    const { el, fixture } = await render();
    const heading = el.querySelector<HTMLButtonElement>('[data-slot="nav-module"]')!;
    const highlighted = () => ['bg-primary/10', 'text-primary'].every((c) => heading.classList.contains(c));

    expect(highlighted()).toBe(true);
    heading.click();
    fixture.detectChanges();
    expect(highlighted()).toBe(true);
  });

  it('collapses a module, with an arrow down, and opens it again; other modules start collapsed', async () => {
    const { el, fixture } = await render('/', [
      { id: 'acc', name: 'Accounts', menus: [{ id: 'm-x', code: 'X', name: 'Ledger', route: 'accounts/ledger' }] },
      ...TEST_MENU,
    ]);
    const heading = (name: string) =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('[data-slot="nav-module"]')).find((b) => b.textContent?.trim() === name)!;

    expect(heading('Accounts').getAttribute('aria-expanded')).toBe('false');
    expect(heading('Accounts').querySelector('ng-icon')!.getAttribute('data-arrow')).toBe('down');

    heading('Hr').click();
    fixture.detectChanges();
    expect(labels(el)).toEqual(['Dashboard']);
    expect(heading('Hr').getAttribute('aria-expanded')).toBe('false');
    expect(heading('Hr').querySelector('ng-icon')!.getAttribute('data-arrow')).toBe('down');

    heading('Hr').click();
    heading('Accounts').click();
    fixture.detectChanges();
    expect(labels(el)).toEqual(['Dashboard', 'Ledger', 'Company List', 'Branch List', 'Profile', 'Employee List', 'Holiday List']);
    expect(heading('Hr').querySelector('ng-icon')!.getAttribute('data-arrow')).toBe('up');
    expect(heading('Accounts').getAttribute('aria-expanded')).toBe('true');
  });

  it('does not navigate or close the mobile menu when a module heading is clicked', async () => {
    const { el, fixture } = await render();

    el.querySelector<HTMLButtonElement>('[data-slot="nav-module"]')!.click();
    fixture.detectChanges();

    expect(onNavigated).not.toHaveBeenCalled();
  });

  it('lists only Dashboard when the user has no menus', async () => {
    const { el } = await render('/', []);

    expect(labels(el)).toEqual(['Dashboard']);
    expect(el.querySelector('[data-slot="nav-module"]')).toBeNull();
  });

  it('links each menu to its route with its menu code', async () => {
    const { el } = await render();

    expect(entry(el, 'Dashboard').getAttribute('href')).toBe('/');
    expect(entry(el, 'Employee List').getAttribute('href')).toBe('/admin/employees?menuId=NS-EMPLIST');
    expect(entry(el, 'Holiday List').getAttribute('href')).toBe('/admin/holidays?menuId=NS-HOLIDAYLIST');
  });

  it('gives each entry the icon and color of its route', async () => {
    const { el } = await render();

    const tones = links(el).map((a) => a.querySelector('ng-icon')!.getAttribute('data-icon-tone'));
    expect(tones).toEqual(['blue', 'green', 'teal', 'violet', 'amber', 'rose']);
    expect((entry(el, 'Dashboard').querySelector('ng-icon') as HTMLElement).style.getPropertyValue('--ng-icon__color')).toBe('var(--icon-blue)');
  });

  it('gives a menu of an unknown route the default look', async () => {
    const { el } = await render('/', [{ id: 'x', name: 'HR', menus: [{ id: 'm', code: 'C', name: 'New screen', route: 'new/screen' }] }]);

    expect(entry(el, 'New screen').querySelector('ng-icon')!.getAttribute('data-icon-tone')).toBe('brand');
  });

  it('exposes a labelled navigation landmark', async () => {
    const { el } = await render();

    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Main menu');
  });

  it('highlights Dashboard only on the root', async () => {
    expect(active((await render('/')).el)).toEqual(['Dashboard']);
  });

  it('highlights an entry on its page with its menu id', async () => {
    expect(active((await render('/admin/employees?menuId=m-emp')).el)).toEqual(['Employee List']);
  });

  it('highlights an entry beneath its route, and from a typed URL without the menu id', async () => {
    expect(active((await render('/reports/branches/b-2/holidays')).el)).toEqual(['Branch List']);
  });

  it('updates the highlight when navigating', async () => {
    const { el, fixture } = await render('/');

    await TestBed.inject(Router).navigateByUrl('/admin/holidays?menuId=m-hol');
    fixture.detectChanges();

    expect(active(el)).toEqual(['Holiday List']);
  });

  it('emits navigated when an entry is chosen', async () => {
    const { el } = await render('/');

    entry(el, 'Profile').click();

    expect(onNavigated).toHaveBeenCalledOnce();
  });
});
