import { Directive, computed, input } from '@angular/core';

/**
 * The named icon colors. Each is a value in `styles.css` (`--icon-<name>`): the six palette tones have their own light and
 * dark values, and `brand` follows the main green (`--primary`) so an icon can match the page titles.
 */
export const ICON_TONES = ['blue', 'green', 'amber', 'violet', 'rose', 'teal', 'brand'] as const;
export type IconToneName = (typeof ICON_TONES)[number];

/**
 * Colors an icon with one of the named icon colors of the theme: `<ng-icon [appIconTone]="item.tone" />`.
 * It sets the icon component's own CSS variable (`--ng-icon__color`) to `var(--icon-<tone>)`; a Tailwind `text-*`
 * class could lose to the icon component, which sets its color inside a CSS layer. Without a tone the icon keeps the
 * text color. See kb/architecture/frontend.md, "Look and feel".
 */
@Directive({
  selector: '[appIconTone]',
  host: {
    '[style.--ng-icon__color]': 'color()',
    '[attr.data-icon-tone]': 'appIconTone() || null',
  },
})
export class AppIconTone {
  readonly appIconTone = input<IconToneName | null | undefined>();

  protected readonly color = computed(() => {
    const tone = this.appIconTone();
    return tone ? `var(--icon-${tone})` : null;
  });
}
