import { Component, inject, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_ICONS, NAV_MENU } from '../core/navigation/nav-items';
import { AppIconTone } from '../shared/ui/icon-tone/icon-tone';

/** The navigation menu. Used in the desktop sidebar and inside the mobile sheet. */
@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive, NgIcon, AppIconTone],
  providers: [provideIcons(NAV_ICONS)],
  template: `
    <nav aria-label="Main menu">
      <ul class="grid gap-1 p-2">
        @for (item of items; track item.route) {
          <li>
            <a
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              [routerLink]="item.route"
              routerLinkActive="active bg-accent font-semibold text-accent-foreground"
              [routerLinkActiveOptions]="{ exact: item.route === '/' }"
              (click)="navigated.emit()"
            >
              <ng-icon [name]="item.icon" [appIconTone]="item.tone" class="text-base" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class AppNav {
  protected readonly items = inject(NAV_MENU);

  /** Emitted when the user chooses an entry, so the mobile sheet can close. */
  readonly navigated = output<void>();
}
