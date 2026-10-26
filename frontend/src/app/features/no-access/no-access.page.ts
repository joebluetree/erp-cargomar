import { Component } from '@angular/core';
import { NO_ACCESS_TEXT } from '../../core/navigation/menu.model';
import { PageTitle } from '../../shared/ui/page-title/page-title';

/** Shown in place of a screen the user has no view right on (admin-user-rights design D5). */
@Component({
  selector: 'app-no-access',
  imports: [PageTitle],
  template: `
    <h1 appPageTitle class="mb-4">No access</h1>
    <p role="status" data-slot="no-access" class="text-muted-foreground">{{ text }}</p>
  `,
})
export class NoAccessPage {
  protected readonly text = NO_ACCESS_TEXT;
}
