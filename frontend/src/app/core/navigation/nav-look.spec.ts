import { ICON_TONES } from '../../shared/ui/icon-tone/icon-tone';
import { DASHBOARD_ENTRY, DEFAULT_LOOK, NAV_ICONS, NAV_LOOK, lookOf } from './nav-look';

describe('nav look', () => {
  it('starts with the Dashboard, blue, at the root', () => {
    expect(DASHBOARD_ENTRY).toEqual({ label: 'Dashboard', route: '/', icon: 'lucideHouse', tone: 'blue' });
  });

  it('gives the screens their icons and colors by route', () => {
    expect(Object.entries(NAV_LOOK).map(([route, look]) => [route, look.tone])).toEqual([
      ['reports/companies', 'green'],
      ['reports/branches', 'teal'],
      ['admin/profile', 'violet'],
      ['admin/employees', 'amber'],
      ['admin/holidays', 'rose'],
    ]);
  });

  it('uses only registered icons and named colors, a different color each', () => {
    const looks = [DASHBOARD_ENTRY, DEFAULT_LOOK, ...Object.values(NAV_LOOK)];

    expect(looks.every((l) => l.icon in NAV_ICONS && ICON_TONES.includes(l.tone))).toBe(true);
    expect(new Set([DASHBOARD_ENTRY.tone, ...Object.values(NAV_LOOK).map((l) => l.tone)]).size).toBe(6);
  });

  it('finds a look with or without a leading slash, and falls back for an unknown route', () => {
    expect(lookOf('/admin/holidays')).toEqual({ icon: 'appCalendarColor', tone: 'rose' });
    expect(lookOf('admin/holidays').tone).toBe('rose');
    expect(lookOf('sales/orders')).toBe(DEFAULT_LOOK);
  });
});
