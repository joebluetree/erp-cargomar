import { Routes } from '@angular/router';
import { MENU_CODES, MENU_CODE_DATA } from '../../../core/navigation/menu.model';
import { CompanyListService } from './company-list.service';

export const COMPANY_LIST_ROUTES: Routes = [
  {
    path: '',
    data: { [MENU_CODE_DATA]: MENU_CODES.companyList },
    runGuardsAndResolvers: 'always',
    providers: [CompanyListService],
    loadComponent: () => import('./company-list.page').then((m) => m.CompanyListPage),
  },
];
