import { Routes } from '@angular/router';
import { Shell } from './shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
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
      // Further feature routes are added here as lazy children.
    ],
  },
  { path: '**', redirectTo: '' },
];
