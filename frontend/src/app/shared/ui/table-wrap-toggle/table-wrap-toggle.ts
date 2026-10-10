import { Component, model } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeftRight, lucideWrapText } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';

/**
 * The "Wrap text" toggle every table shows directly above itself. On (the default): cells wrap to the available
 * width. Off: cells keep their text on one line and the table scrolls sideways when it is too wide. The screen binds
 * `[(wrap)]` and puts `data-wrap="true"` on its table container while it is on; the shared table cells do the rest.
 * The state is written in the label and in `aria-pressed`, not only in a color.
 * See kb/architecture/frontend.md, "Look and feel".
 */
@Component({
  selector: 'app-table-wrap-toggle',
  imports: [NgIcon, HlmButtonImports],
  providers: [provideIcons({ lucideArrowLeftRight, lucideWrapText })],
  host: { class: 'block', 'data-slot': 'table-wrap-toggle' },
  template: `
    <button
      hlmBtn
      [variant]="wrap() ? 'secondary' : 'outline'"
      size="sm"
      type="button"
      [attr.aria-pressed]="wrap()"
      (click)="wrap.set(!wrap())"
    >
      <ng-icon [name]="wrap() ? 'lucideWrapText' : 'lucideArrowLeftRight'" aria-hidden="true" />
      Wrap text: {{ wrap() ? 'on' : 'off' }}
    </button>
  `,
})
export class TableWrapToggle {
  /** Whether the table wraps its text; on by default. Two-way: `[(wrap)]="signal"`. */
  readonly wrap = model(true);
}
