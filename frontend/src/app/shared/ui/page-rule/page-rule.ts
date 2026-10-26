import { Component } from '@angular/core';

/**
 * The thin line under a page's header (Back button and title) on screens without a filter row, in the same color as
 * the filter row's separators, so every screen's header is set off the same way.
 * See kb/architecture/frontend.md, "Look and feel".
 */
@Component({
  selector: 'app-page-rule',
  host: { class: 'block', 'data-slot': 'page-rule' },
  template: `<hr class="mb-4 border-table-line" />`,
})
export class PageRule {}
