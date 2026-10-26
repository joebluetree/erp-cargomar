import { lucideBuilding2, lucideCircleUser, lucideFileText, lucideHouse, lucideUsers } from '@ng-icons/lucide';
import { appCalendarColor } from '../../shared/ui/icons/calendar-color';
import { IconToneName } from '../../shared/ui/icon-tone/icon-tone';

/** How a menu entry looks: the name of an icon registered in `NAV_ICONS`, and its named icon color (`ICON_TONES`). */
export interface NavLook {
  icon: string;
  tone: IconToneName;
}

/** Icons used by the menu. Components that show it register these with `provideIcons`. */
export const NAV_ICONS = { appCalendarColor, lucideBuilding2, lucideCircleUser, lucideFileText, lucideHouse, lucideUsers };

/** The Dashboard entry: always first, needs no right, and is not a menu of the database. */
export const DASHBOARD_ENTRY: NavLook & { label: string; route: string } = {
  label: 'Dashboard',
  route: '/',
  icon: 'lucideHouse',
  tone: 'blue',
};

/**
 * The look of each menu by its route (`MENUM.MENU_ROUTE1`). The menu itself comes from the user's rights; only its
 * icon and color are the application's. A new menu shows with `DEFAULT_LOOK` until it is added here.
 */
export const NAV_LOOK: Readonly<Record<string, NavLook>> = {
  'reports/companies': { icon: 'lucideFileText', tone: 'green' },
  'reports/branches': { icon: 'lucideBuilding2', tone: 'teal' },
  'admin/profile': { icon: 'lucideCircleUser', tone: 'violet' },
  'admin/employees': { icon: 'lucideUsers', tone: 'amber' },
  // A multi-colour calendar: its own colours, so the tone does not change it.
  'admin/holidays': { icon: 'appCalendarColor', tone: 'rose' },
};

/** The look of a menu whose route has none of its own. */
export const DEFAULT_LOOK: NavLook = { icon: 'lucideFileText', tone: 'brand' };

/** The look of a menu route (with or without a leading slash). */
export function lookOf(route: string): NavLook {
  return NAV_LOOK[route.replace(/^\/+/, '')] ?? DEFAULT_LOOK;
}
