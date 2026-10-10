import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

/**
 * The one style of a page's main heading (size, weight and the green main color). Pages write
 * `<h1 appPageTitle>` and add layout classes only (such as a bottom margin); they never restyle the title.
 * See kb/architecture/frontend.md, "Look and feel".
 */
@Directive({
  selector: '[appPageTitle]',
  host: { 'data-slot': 'page-title' },
})
export class PageTitle {
  constructor() {
    classes(() => 'text-2xl font-semibold text-primary');
  }
}
