import { InjectionToken } from '@angular/core';
import { lucideFileText, lucideHouse } from '@ng-icons/lucide';
import { IconToneName } from '../../shared/ui/icon-tone/icon-tone';

/** One entry in the main navigation menu. */
export interface NavItem {
  label: string;
  /** Name of an icon registered in `NAV_ICONS`, e.g. `lucideHouse`. */
  icon: string;
  /** Router destination. `/` is matched exactly; others also match their child routes. */
  route: string;
  /** The named icon color of the entry (see `ICON_TONES`). Without one the icon shows in the text color. */
  tone?: IconToneName;
}

/** Icons used by `NAV_ITEMS`. Components that show the items register these with `provideIcons`. */
export const NAV_ICONS = { lucideFileText, lucideHouse };

/**
 * The single list that drives the sidebar menu and the Dashboard quick links.
 * To add an ERP module's screen: add one item here (with its icon, added to `NAV_ICONS`, and an icon color `tone`)
 * and its route in `app.routes.ts`.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', icon: 'lucideHouse', route: '/', tone: 'blue' },
  { label: 'Company List', icon: 'lucideFileText', route: '/reports/companies', tone: 'green' },
];

/** The menu as injected into components. Defaults to `NAV_ITEMS`; tests can provide a different list. */
export const NAV_MENU = new InjectionToken<readonly NavItem[]>('NAV_MENU', {
  providedIn: 'root',
  factory: () => NAV_ITEMS,
});
