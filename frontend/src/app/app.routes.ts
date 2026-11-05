import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';
import { historyEpochGuard } from './core/navigation/history-epoch';
import { menuAccessGuard } from './core/navigation/menu-access.guard';
import { commonViewNoDashboardGuard } from './features/common-view/common-view.guards';
import { Shell } from './shell/shell';

export const routes: Routes = [
  // Outside the shell, with the common view below. A logged-in user is sent to the Dashboard.
  {
    path: 'login',
    canMatch: [guestGuard],
    loadChildren: () => import('./features/admin/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  // The common view (admin-common-endpoint): `/view?appid=…&menuid=…` starts a session from the APPDETAILS row and opens
  // the menu's own route inside the shell, which then shows only the content. No session is needed to open it.
  {
    path: 'view',
    loadChildren: () => import('./features/common-view/common-view.routes').then((m) => m.COMMON_VIEW_ROUTES),
  },
  {
    path: '',
    component: Shell,
    // Every screen inside the shell needs a session; without one the login screen is shown. The browser's Back to a
    // screen opened before a branch switch opens the Dashboard instead.
    canMatch: [authGuard],
    canActivateChild: [historyEpochGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        // The common view has no Dashboard: Back from its screen goes to the previous page instead.
        canActivate: [commonViewNoDashboardGuard],
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'reports/companies',
        canActivateChild: [menuAccessGuard],
        loadChildren: () =>
          import('./features/reports/company-list/company-list.routes').then((m) => m.COMPANY_LIST_ROUTES),
      },
      {
        path: 'reports/branches',
        canActivateChild: [menuAccessGuard],
        loadChildren: () =>
          import('./features/reports/branch-list/branch-list.routes').then((m) => m.BRANCH_LIST_ROUTES),
      },
      {
        path: 'admin/profile',
        canActivateChild: [menuAccessGuard],
        loadChildren: () =>
          import('./features/admin/employee-profile/employee-profile.routes').then((m) => m.EMPLOYEE_PROFILE_ROUTES),
      },
      {
        path: 'admin/employees',
        canActivateChild: [menuAccessGuard],
        loadChildren: () =>
          import('./features/admin/employee-list/employee-list.routes').then((m) => m.EMPLOYEE_LIST_ROUTES),
      },
      {
        path: 'admin/holidays',
        canActivateChild: [menuAccessGuard],
        loadChildren: () =>
          import('./features/admin/holiday-list/holiday-list.routes').then((m) => m.HOLIDAY_LIST_ROUTES),
      },
      {
        // The latest announcement, opened from the bar above the header; every logged-in user may open it (no menu).
        path: 'admin/notification',
        loadChildren: () =>
          import('./features/admin/notification/notification.routes').then((m) => m.NOTIFICATION_ROUTES),
      },
      {
        // In place of a screen without the view right (the menu access guard keeps the screen's URL).
        path: 'no-access',
        loadComponent: () => import('./features/no-access/no-access.page').then((m) => m.NoAccessPage),
      },
      // Further feature routes are added here as lazy children; a screen with a menu gets the menu access guard
      // (canActivateChild), and its own routes name their menu in data.menuCode.
    ],
  },
  { path: '**', redirectTo: '' },
];
