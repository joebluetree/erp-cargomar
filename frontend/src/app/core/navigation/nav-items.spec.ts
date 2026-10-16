import { ICON_TONES } from '../../shared/ui/icon-tone/icon-tone';
import { NAV_ICONS, NAV_ITEMS } from './nav-items';

describe('NAV_ITEMS', () => {
  it('lists the Dashboard, the Company List, Profile, then the Employee List', () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.route])).toEqual([
      ['Dashboard', '/'],
      ['Company List', '/reports/companies'],
      ['Profile', '/admin/profile'],
      ['Employee List', '/admin/employees'],
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

  it('colors the Dashboard blue, the Company List green, Profile violet and the Employee List amber', () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.tone])).toEqual([
      ['Dashboard', 'blue'],
      ['Company List', 'green'],
      ['Profile', 'violet'],
      ['Employee List', 'amber'],
    ]);
  });

  it('has unique destinations', () => {
    expect(new Set(NAV_ITEMS.map((i) => i.route)).size).toBe(NAV_ITEMS.length);
  });
});
