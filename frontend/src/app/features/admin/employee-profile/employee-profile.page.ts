import { Location, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { PageTitle } from '../../../shared/ui/page-title/page-title';
import { PageRule } from '../../../shared/ui/page-rule/page-rule';
import { EMPTY_VALUE, ProfileSection, initialsOf, profileSections } from './employee-profile.model';
import { EmployeeProfileService } from './employee-profile.service';
import { MENU_CODES, MENU_ID_PARAM } from '../../../core/navigation/menu.model';

/**
 * Where each box sits when the boxes are in rows (`fits`), by its title (the basic box has none): the basic box, Contact
 * and Bank on the first row; Address under the basic box and ID and Documents under Contact and Bank on the second. A
 * box is at most 48rem wide, except IDs, which fills the width of Contact and Bank above it. Start and span of IDs are
 * set together: `col-span-2` alone sets the `grid-column` shorthand, which would reset the start to column 1. The class
 * names are written out in full so Tailwind generates them.
 */
const PLACEMENT: Record<string, string> = {
  '': 'col-start-1 row-start-1 max-w-[48rem]',
  'Contact Details': 'col-start-2 row-start-1 max-w-[48rem]',
  'Bank Details': 'col-start-3 row-start-1 max-w-[48rem]',
  Address: 'col-start-1 row-start-2 max-w-[48rem]',
  'ID and Documents': 'col-[2/span_2] row-start-2 max-w-none',
};

/**
 * The Profile screen: the logged-in user's own employee profile, view only. The backend finds the employee from the
 * session, so the screen asks for no id. Opened from the Employee List (`/admin/employees/{id}`), it shows that
 * employee instead, with a back button to the list, and "Employee not found." when the backend answers 404. As in the reference `profile.JPG`, each group of details is in its own tinted
 * card on the plain page. When the cards fit the content area at their natural width they are in rows, sized to their
 * content: the basic card, Contact and Bank on the first row at the same height; Address (the basic card's width) and
 * ID and Documents (as tall as Address) on the second. When they do not fit, they are stacked one below the other.
 * Every field is a label-value row.
 */
@Component({
  selector: 'app-employee-profile',
  imports: [NgTemplateOutlet, NgIcon, HlmAvatarImports, HlmButtonImports, HlmCardImports, PageTitle, PageRule],
  providers: [provideIcons({ lucideArrowLeft })],
  templateUrl: './employee-profile.page.html',
})
export class EmployeeProfilePage {
  protected readonly service = inject(EmployeeProfileService);
  private readonly changes = inject(ChangeDetectorRef);
  private readonly location = inject(Location);
  private readonly router = inject(Router, { optional: true });
  /** True when the user reached this page from another page of the app, so browser history can take them back. */
  private readonly cameFromApp = this.router?.currentNavigation()?.previousNavigation != null;

  /** The employee opened from the Employee List; null on the user's own Profile. */
  protected readonly employeeId = inject(ActivatedRoute, { optional: true })?.snapshot.paramMap.get('id') ?? null;

  protected readonly sections = computed(() => {
    const profile = this.service.profile();
    return profile ? profileSections(profile) : [];
  });
  protected readonly initials = computed(() => initialsOf(this.service.profile()?.name ?? null));
  protected readonly name = computed(() => this.service.profile()?.name || EMPTY_VALUE);

  /** True while the boxes fit the content area in rows; false stacks them. */
  protected readonly fits = signal(true);
  /** The grid's natural width in rows, measured while in rows and remembered while stacked. */
  private naturalWidth = 0;

  private readonly host = viewChild<ElementRef<HTMLElement>>('profileHost');
  private readonly grid = viewChild<ElementRef<HTMLElement>>('profileGrid');

  constructor() {
    this.service.load(this.employeeId ?? undefined);

    // Watch the space available (the host) and the grid's own size (its content can change). Both exist only once the
    // profile is shown. The measurement runs in the next animation frame, not inside the observer's callback: switching
    // the layout there resizes the observed elements in the same frame, which the browser reports as a "ResizeObserver
    // loop" error. One frame later is still before the next paint of the new size.
    effect((onCleanup) => {
      const host = this.host()?.nativeElement;
      const grid = this.grid()?.nativeElement;
      if (!host || !grid || typeof ResizeObserver === 'undefined') return;
      let frame = 0;
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => this.measure(host, grid));
      });
      observer.observe(host);
      observer.observe(grid);
      onCleanup(() => {
        cancelAnimationFrame(frame);
        observer.disconnect();
      });
    });

    // The service outlives the page (it is provided by the route), so the photo's object URL is freed here.
    inject(DestroyRef).onDestroy(() => this.service.releasePhoto());
  }

  /** The grid placement classes of a box: its cell when in rows, none when stacked. */
  protected placementOf(section: ProfileSection): string {
    return this.fits() ? (PLACEMENT[section.title] ?? '') : '';
  }

  protected reload(): void {
    this.service.load(this.employeeId ?? undefined);
  }

  /**
   * Back to the page the user came from (for an employee, the Employee List as it was left). Opened directly, an
   * employee's profile goes to the Employee List and the user's own profile to the Dashboard.
   */
  protected back(): void {
    if (this.cameFromApp) {
      this.location.back();
    } else if (this.employeeId) {
      void this.router?.navigate(['/admin/employees'], { queryParams: { [MENU_ID_PARAM]: MENU_CODES.employeeList } });
    } else {
      void this.router?.navigateByUrl('/');
    }
  }

  /** In rows the grid is `w-max`, so its width is the boxes' natural width; it fits when the host is at least as wide. */
  private measure(host: HTMLElement, grid: HTMLElement): void {
    if (this.fits()) {
      this.naturalWidth = grid.getBoundingClientRect().width;
    }
    const fits = host.getBoundingClientRect().width >= this.naturalWidth;
    if (fits !== this.fits()) {
      this.fits.set(fits);
      this.changes.detectChanges();
    }
  }
}
