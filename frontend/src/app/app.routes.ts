import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';
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
        loadChildren: () =>
          import('./features/reports/company-list/company-list.routes').then((m) => m.COMPANY_LIST_ROUTES),
      },
      {
        path: 'admin/profile',
        loadChildren: () =>
          import('./features/admin/employee-profile/employee-profile.routes').then((m) => m.EMPLOYEE_PROFILE_ROUTES),
      },
      {
        path: 'admin/employees',
        loadChildren: () =>
          import('./features/admin/employee-list/employee-list.routes').then((m) => m.EMPLOYEE_LIST_ROUTES),
      },
      // Further feature routes are added here as lazy children.
    ],
  },
  { path: '**', redirectTo: '' },
];
