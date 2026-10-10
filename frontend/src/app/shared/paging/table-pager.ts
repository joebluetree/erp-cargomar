import { Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideChevronsLeft, lucideChevronsRight } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { PAGE_SIZES, rangeOf } from './paged';

/**
 * The footer every table uses: the rows shown out of the total, the page size, and First / Previous / Next / Last.
 * It only reports what the user chose; the table asks the backend for the new page.
 */
@Component({
  selector: 'app-table-pager',
  imports: [NgIcon, HlmButtonImports, HlmLabelImports],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideChevronsLeft, lucideChevronsRight })],
  templateUrl: './table-pager.html',
})
export class TablePager {
  /** Number of rows that match in all. */
  readonly total = input.required<number>();
  /** One-based current page. */
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly pageSizes = PAGE_SIZES;
  protected readonly range = computed(() => rangeOf(this.total(), this.page(), this.pageSize()));
  protected readonly atFirst = computed(() => this.page() <= 1);
  protected readonly atLast = computed(() => this.page() >= this.range().pageCount);

  protected first(): void {
    this.pageChange.emit(1);
  }

  protected previous(): void {
    this.pageChange.emit(this.page() - 1);
  }

  protected next(): void {
    this.pageChange.emit(this.page() + 1);
  }

  protected last(): void {
    this.pageChange.emit(this.range().pageCount);
  }

  protected setPageSize(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
