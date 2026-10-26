import { Component, inject, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronUp } from '@ng-icons/lucide';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuService } from '../core/navigation/menu.service';
import { NavCollapseStore } from '../core/navigation/nav-collapse.store';
import { DASHBOARD_ENTRY, NAV_ICONS, lookOf } from '../core/navigation/nav-look';
import { AppIconTone } from '../shared/ui/icon-tone/icon-tone';

/** Counts the menus created, for unique ids. */
let navCount = 0;

/**
 * The navigation menu, used in the desktop sidebar and inside the mobile sheet. Dashboard first, then the user's menu
 * from the backend (admin-user-rights design D4): each module as a heading with its menus under it. A module heading is
 * a button on a light brand-green background, always shown, that collapses or opens its menus, with an arrow up while
 * open and down while collapsed. Every menu link
 * carries its menu id; its highlight ignores the query, so a typed URL without it still shows where the user is.
 */
@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive, NgIcon, AppIconTone],
  providers: [provideIcons({ ...NAV_ICONS, lucideChevronDown, lucideChevronUp })],
  template: `
    <nav aria-label="Main menu">
      <ul class="grid gap-1 p-2">
        <li>
          <a
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            [routerLink]="dashboard.route"
            routerLinkActive="active bg-accent font-semibold text-accent-foreground"
            [routerLinkActiveOptions]="{ exact: true }"
            (click)="navigated.emit()"
          >
            <ng-icon [name]="dashboard.icon" [appIconTone]="dashboard.tone" class="text-base" aria-hidden="true" />
            <span>{{ dashboard.label }}</span>
          </a>
        </li>
        @for (module of menu.modules(); track module.id; let n = $index) {
          @let open = collapse.isOpen(module);
          <li data-slot="nav-group">
            <button
              type="button"
              data-slot="nav-module"
              class="mt-3 flex w-full items-center justify-between gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary hover:bg-primary/15"
              [attr.aria-expanded]="open"
              [attr.aria-controls]="groupId + '-' + n"
              (click)="collapse.toggle(module)"
            >
              <span>{{ module.name }}</span>
              <ng-icon
                [name]="open ? 'lucideChevronUp' : 'lucideChevronDown'"
                [attr.data-arrow]="open ? 'up' : 'down'"
                class="shrink-0 text-sm"
                aria-hidden="true"
              />
            </button>
            @if (open) {
              <ul class="grid gap-1" [id]="groupId + '-' + n">
                @for (entry of module.menus; track entry.id) {
                  <li>
                    <a
                      class="flex items-center gap-3 rounded-md py-2 pl-7 pr-3 text-sm hover:bg-accent hover:text-accent-foreground"
                      [routerLink]="'/' + entry.route"
                      [queryParams]="{ menuId: entry.code }"
                      routerLinkActive="active bg-accent font-semibold text-accent-foreground"
                      [routerLinkActiveOptions]="activeOptions"
                      (click)="navigated.emit()"
                    >
                      <ng-icon [name]="look(entry.route).icon" [appIconTone]="look(entry.route).tone" class="text-base" aria-hidden="true" />
                      <span>{{ entry.name }}</span>
                    </a>
                  </li>
                }
              </ul>
            }
          </li>
        }
      </ul>
    </nav>
  `,
})
export class AppNav {
  protected readonly menu = inject(MenuService);
  protected readonly collapse = inject(NavCollapseStore);
  /** A prefix for the ids of the module lists, unique to this menu (the sidebar and the mobile sheet both show one). */
  protected readonly groupId = `nav-group-${++navCount}`;
  protected readonly dashboard = DASHBOARD_ENTRY;
  protected readonly look = lookOf;
  /** An entry is current on its route and beneath it, whatever the query says. */
  protected readonly activeOptions = { paths: 'subset', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' } as const;

  /** Emitted when the user chooses an entry, so the mobile sheet can close. */
  readonly navigated = output<void>();
}
