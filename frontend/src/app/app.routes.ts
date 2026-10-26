import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';
import { menuAccessGuard } from './core/navigation/menu-access.guard';
import { Shell } from './shell/shell';

export const routes: Routes = [
  // The only screen outside the shell. A logged-in user is sent to the Dashboard.
  {
    path: 'login',
    canMatch: [guestGuard],
    loadChildren: () => import('./features/admin/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: '',
    component: Shell,
    // Every screen inside the shell needs a session; without one the login screen is shown.
    canMatch: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
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
