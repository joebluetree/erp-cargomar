import { Component } from '@angular/core';

/**
 * The filter row every table with filters uses: a thin separator above, one wrapping row that holds what is put
 * inside the element (each filter as a label beside its input, then the Search button), and a thin separator below.
 * Screens project their filters into it and add no layout or color of their own for the row.
 * See kb/architecture/frontend.md, "Look and feel".
 */
@Component({
  selector: 'app-table-toolbar',
  host: { class: 'block', 'data-slot': 'table-toolbar' },
  template: `
    <hr class="border-table-line" />
    <div class="flex flex-wrap items-center gap-x-6 gap-y-3 py-3"><ng-content /></div>
    <hr class="mb-4 border-table-line" />
  `,
})
export class TableToolbar {}
