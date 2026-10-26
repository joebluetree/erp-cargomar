import { Provider, computed, signal } from '@angular/core';
import { MenuModule } from './menu.model';
import { MenuService, entryForUrl } from './menu.service';

/** A loaded menu for specs: no HTTP, the given modules; `loaded: false` for one that is still loading. */
export function provideTestMenu(modules: MenuModule[] = [], { loaded = true } = {}): Provider {
  const entries = computed(() => modules.flatMap((m) => m.menus));
  const stub: Partial<MenuService> = {
    modules: signal(modules).asReadonly(),
    loaded: signal(loaded).asReadonly(),
    error: signal(false).asReadonly(),
    entries,
    whenLoaded: () => Promise.resolve(),
    ensureLoaded: () => undefined,
    entryForUrl: (url: string) => entryForUrl(entries(), url),
  };
  return { provide: MenuService, useValue: stub };
}

/** The five new-software menus of the dev data, in one module "Hr". */
export const TEST_MENU: MenuModule[] = [
  {
    id: 'hr',
    name: 'Hr',
    menus: [
      { id: 'm-comp', code: 'NS-COMPLIST', name: 'Company List', route: 'reports/companies' },
      { id: 'm-branch', code: 'NS-BRANCHLIST', name: 'Branch List', route: 'reports/branches' },
      { id: 'm-profile', code: 'NS-EMPPROFILE', name: 'Profile', route: 'admin/profile' },
      { id: 'm-emp', code: 'NS-EMPLIST', name: 'Employee List', route: 'admin/employees' },
      { id: 'm-hol', code: 'NS-HOLIDAYLIST', name: 'Holiday List', route: 'admin/holidays' },
    ],
  },
];
