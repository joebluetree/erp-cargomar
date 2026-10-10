import { ICON_TONES } from '../../shared/ui/icon-tone/icon-tone';
import { NAV_ICONS, NAV_ITEMS } from './nav-items';

describe('NAV_ITEMS', () => {
  it('lists the Dashboard, then the Company List', () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.route])).toEqual([
      ['Dashboard', '/'],
      ['Company List', '/reports/companies'],
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

  it('colors the Dashboard blue and the Company List green', () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.tone])).toEqual([
      ['Dashboard', 'blue'],
      ['Company List', 'green'],
    ]);
  });

  it('has unique destinations', () => {
    expect(new Set(NAV_ITEMS.map((i) => i.route)).size).toBe(NAV_ITEMS.length);
  });
});
