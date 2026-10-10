import { Routes } from '@angular/router';
import { CompanyListService } from './company-list.service';

export const COMPANY_LIST_ROUTES: Routes = [
  {
    path: '',
    providers: [CompanyListService],
    loadComponent: () => import('./company-list.page').then((m) => m.CompanyListPage),
  },
];
