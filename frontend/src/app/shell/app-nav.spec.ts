import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { NAV_ITEMS, NAV_MENU } from '../core/navigation/nav-items';
import { AppNav } from './app-nav';

@Component({ template: '' })
class Blank {}

describe('AppNav', () => {
  const onNavigated = vi.fn();

  @Component({ imports: [AppNav], template: '<app-nav (navigated)="onNavigated()" />' })
  class Host {
    onNavigated = onNavigated;
  }

  async function render(url = '/') {
    onNavigated.mockReset();
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        { provide: NAV_MENU, useValue: [NAV_ITEMS[0], { label: 'Reports', icon: 'lucideHouse', route: '/reports' }] },
        provideRouter([
          { path: '', pathMatch: 'full', component: Blank },
          { path: 'reports', component: Blank },
          { path: 'reports/new', component: Blank },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create(url);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, fixture, harness };
  }

  const links = (el: HTMLElement) => Array.from(el.querySelectorAll('a'));
  const active = (el: HTMLElement) => links(el).filter((a) => a.classList.contains('active')).map((a) => a.textContent?.trim());

  it('colors each entry\'s icon with its own tone, and an entry without a tone keeps the text color', async () => {
    const { el } = await render();

    const icons = Array.from(el.querySelectorAll('a ng-icon')) as HTMLElement[];
    expect(icons.map((i) => i.getAttribute('data-icon-tone'))).toEqual(['blue', null]);
    expect(icons[0].style.getPropertyValue('--ng-icon__color')).toBe('var(--icon-blue)');
    expect(icons[1].style.getPropertyValue('--ng-icon__color')).toBe('');
  });

  it('keeps the icon color when an entry is the current page', async () => {
    const { el } = await render('/');

    const current = links(el).find((a) => a.classList.contains('active'))!;
    expect(current.querySelector('ng-icon')!.getAttribute('data-icon-tone')).toBe('blue');
    expect((current.querySelector('ng-icon') as HTMLElement).style.getPropertyValue('--ng-icon__color')).toBe('var(--icon-blue)');
  });

  it('lists the menu entries with icons and links', async () => {
    const { el } = await render();

    expect(links(el).map((a) => a.textContent?.trim())).toEqual(['Dashboard', 'Reports']);
    expect(links(el).map((a) => a.getAttribute('href'))).toEqual(['/', '/reports']);
    expect(el.querySelectorAll('a ng-icon')).toHaveLength(2);
  });

  it('exposes a labelled navigation landmark', async () => {
    const { el } = await render();

    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Main menu');
  });

  it('highlights Dashboard on the root', async () => {
    const { el } = await render('/');

    expect(active(el)).toEqual(['Dashboard']);
  });

  it('highlights an entry, not Dashboard, on its page', async () => {
    const { el } = await render('/reports');

    expect(active(el)).toEqual(['Reports']);
  });

  it('keeps an entry highlighted on a page under it', async () => {
    const { el } = await render('/reports/new');

    expect(active(el)).toEqual(['Reports']);
  });

  it('updates the highlight when navigating', async () => {
    const { el, fixture } = await render('/');

    await TestBed.inject(Router).navigateByUrl('/reports');
    fixture.detectChanges();

    expect(active(el)).toEqual(['Reports']);
  });

  it('emits navigated when an entry is chosen', async () => {
    const { el } = await render('/');

    links(el)[1].click();

    expect(onNavigated).toHaveBeenCalledOnce();
  });

  it('highlights the real Profile entry, with its violet icon, on the Profile page', async () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    await RouterTestingHarness.create('/admin/profile');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(active(el)).toEqual(['Profile']);
    const profile = links(el).find((a) => a.textContent?.trim() === 'Profile')!;
    expect(profile.getAttribute('href')).toBe('/admin/profile');
    expect(profile.querySelector('ng-icon')!.getAttribute('data-icon-tone')).toBe('violet');
  });

  it('highlights the real Employee List entry, with its amber icon, on a listed employee profile', async () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    await RouterTestingHarness.create('/admin/employees/e-9');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(active(el)).toEqual(['Employee List']);
    const entry = links(el).find((a) => a.textContent?.trim() === 'Employee List')!;
    expect(entry.getAttribute('href')).toBe('/admin/employees');
    expect(entry.querySelector('ng-icon')!.getAttribute('data-icon-tone')).toBe('amber');
  });

  it('highlights the real Holiday List entry, with its rose icon, on the Holiday List page', async () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    await RouterTestingHarness.create('/admin/holidays');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(active(el)).toEqual(['Holiday List']);
    const entry = links(el).find((a) => a.textContent?.trim() === 'Holiday List')!;
    expect(entry.getAttribute('href')).toBe('/admin/holidays');
    expect(entry.querySelector('ng-icon')!.getAttribute('data-icon-tone')).toBe('rose');
  });

  it('highlights the real Branch List entry, with its teal icon, on a branch holiday page', async () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    await RouterTestingHarness.create('/reports/branches/b-2/holidays');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(active(el)).toEqual(['Branch List']);
    const entry = links(el).find((a) => a.textContent?.trim() === 'Branch List')!;
    expect(entry.getAttribute('href')).toBe('/reports/branches');
    expect(entry.querySelector('ng-icon')!.getAttribute('data-icon-tone')).toBe('teal');
  });
});

