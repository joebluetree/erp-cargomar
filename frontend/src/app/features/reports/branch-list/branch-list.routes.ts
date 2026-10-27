import { Routes } from '@angular/router';
import { MENU_CODES, MENU_CODE_DATA, RELATED_MENU_CODES_DATA } from '../../../core/navigation/menu.model';
import { HolidayListService } from '../../admin/holiday-list/holiday-list.service';
import { BranchListService } from './branch-list.service';

export const BRANCH_LIST_ROUTES: Routes = [
  {
    path: '',
    // The Holiday List icon opens a branch's holidays, so the Holiday List's rights load with the list's.
    data: { [MENU_CODE_DATA]: MENU_CODES.branchList, [RELATED_MENU_CODES_DATA]: [MENU_CODES.holidayList] },
    runGuardsAndResolvers: 'always',
    providers: [BranchListService],
    loadComponent: () => import('./branch-list.page').then((m) => m.BranchListPage),
  },
  {
    // A listed branch's holiday list, on the Holiday List page (design D4), so it needs the Holiday List right.
    path: ':id/holidays',
    data: { [MENU_CODE_DATA]: MENU_CODES.holidayList },
    runGuardsAndResolvers: 'always',
    providers: [HolidayListService],
    loadComponent: () => import('../../admin/holiday-list/holiday-list.page').then((m) => m.HolidayListPage),
  },
];
