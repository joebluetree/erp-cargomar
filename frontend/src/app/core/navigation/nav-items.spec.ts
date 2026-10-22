import { ICON_TONES } from '../../shared/ui/icon-tone/icon-tone';
import { NAV_ICONS, NAV_ITEMS } from './nav-items';

describe('NAV_ITEMS', () => {
  it('lists the Dashboard, the Company List, the Branch List, Profile, the Employee List, then the Holiday List', () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.route])).toEqual([
      ['Dashboard', '/'],
      ['Company List', '/reports/companies'],
      ['Branch List', '/reports/branches'],
      ['Profile', '/admin/profile'],
      ['Employee List', '/admin/employees'],
      ['Holiday List', '/admin/holidays'],
    ]);
  });

  it('gives every entry an icon that is registered in NAV_ICONS', () => {
    expect(NAV_ITEMS.every((i) => i.icon in NAV_ICONS)).toBe(true);
  });

  it('gives every entry an icon color from the named set, a different one each', () => {
    const tones = NAV_ITEMS.map((i) => i.tone);

    expect(tones.every((t) => t !== undefined && ICON_TONES.includes(t))).toBe(true);
    expect(new Set(tones).size).toBe(NAV_ITEMS.length);
  });

  it('colors the Dashboard blue, the Company List green, the Branch List teal, Profile violet, the Employee List amber and the Holiday List rose', () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.tone])).toEqual([
      ['Dashboard', 'blue'],
      ['Company List', 'green'],
      ['Branch List', 'teal'],
      ['Profile', 'violet'],
      ['Employee List', 'amber'],
      ['Holiday List', 'rose'],
    ]);
  });

  it('has unique destinations', () => {
    expect(new Set(NAV_ITEMS.map((i) => i.route)).size).toBe(NAV_ITEMS.length);
  });
});
