import { Routes } from '@angular/router';
import { NotificationScreenService } from './notification.service';

/** The Notification screen the bar above the header opens. Every logged-in user may open it: it has no menu. */
export const NOTIFICATION_ROUTES: Routes = [
  {
    path: '',
    runGuardsAndResolvers: 'always',
    providers: [NotificationScreenService],
    loadComponent: () => import('./notification.page').then((m) => m.NotificationPage),
  },
];
