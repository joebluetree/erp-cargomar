import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

/**
 * The one style of a form field's validation message (small text in the theme's error color), shown under the
 * field. Screens write `<p appFieldError id="...">` and link it to the input with `aria-describedby`; they never
 * color the message themselves. See kb/architecture/frontend.md, "Look and feel".
 */
@Directive({
  selector: '[appFieldError]',
  host: { 'data-slot': 'field-error' },
})
export class FieldError {
  constructor() {
    classes(() => 'text-sm text-destructive');
  }
}
