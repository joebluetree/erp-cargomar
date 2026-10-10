import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: 'div[hlmTableContainer]',
  host: { 'data-slot': 'table-container' },
})
export class HlmTableContainer {
  constructor() {
    // `group` lets the cells react to data-wrap="true" on this container (the "Wrap text" toggle); off, the table scrolls sideways.
    classes(() => 'group relative w-full overflow-x-auto');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <table> element.
 */
@Directive({
  selector: 'table[hlmTable]',
  host: { 'data-slot': 'table' },
})
export class HlmTable {
  constructor() {
    // The common table look is set here once (12px text); screens add no color or size classes. See kb/architecture/frontend.md, "Look and feel".
    classes(() => 'w-full caption-bottom text-xs');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <thead> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'thead[hlmTHead],thead[hlmTableHeader]',
  host: { 'data-slot': 'table-header' },
})
export class HlmTHead {
  constructor() {
    classes(() => '[&_tr]:border-b');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <tbody> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'tbody[hlmTBody],tbody[hlmTableBody]',
  host: { 'data-slot': 'table-body' },
})
export class HlmTBody {
  constructor() {
    classes(() => '[&_tr:last-child]:border-0');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <tfoot> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'tfoot[hlmTFoot],tfoot[hlmTableFooter]',
  host: { 'data-slot': 'table-footer' },
})
export class HlmTFoot {
  constructor() {
    classes(() => 'bg-muted/50 border-t font-medium [&>tr]:last:border-b-0');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <tr> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'tr[hlmTr],tr[hlmTableRow]',
  host: { 'data-slot': 'table-row' },
})
export class HlmTr {
  constructor() {
    // Stripe on the even body rows, hover, and the selected color from data-state="selected" (they exclude each
    // other with :not, so the selected row never turns into a stripe or a hover color). Clickable rows get a focus ring.
    classes(
      () =>
        'border-b transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset [&[tabindex]]:cursor-pointer ' +
        'even:not-data-[state=selected]:bg-table-stripe hover:not-data-[state=selected]:bg-muted ' +
        'data-[state=selected]:bg-table-selected has-aria-expanded:bg-muted/50',
    );
  }
}

/**
 * Directive to apply Shadcn-like styling to a <th> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'th[hlmTh],th[hlmTableHead]',
  host: { 'data-slot': 'table-head' },
})
export class HlmTh {
  constructor() {
    classes(
      () =>
        'bg-table-header text-table-header-foreground border-table-header-line h-10 border-r px-2 text-start align-middle font-medium whitespace-nowrap last:border-r-0 [&:has([role=checkbox])]:pe-0 group-data-[wrap=true]:whitespace-normal group-data-[wrap=true]:wrap-anywhere',
    );
  }
}

/**
 * Directive to apply Shadcn-like styling to a <td> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'td[hlmTd],td[hlmTableCell]',
  host: { 'data-slot': 'table-cell' },
})
export class HlmTd {
  constructor() {
    classes(() => 'border-table-line border-r p-2 align-middle whitespace-nowrap last:border-r-0 [&:has([role=checkbox])]:pe-0 group-data-[wrap=true]:whitespace-normal group-data-[wrap=true]:wrap-anywhere');
  }
}

/**
 * Directive to apply Shadcn-like styling to a <caption> element
 * within an HlmTable context.
 */
@Directive({
  selector: 'caption[hlmCaption],caption[hlmTableCaption]',
  host: { 'data-slot': 'table-caption' },
})
export class HlmCaption {
  constructor() {
    classes(() => 'text-muted-foreground mt-4 text-sm');
  }
}
