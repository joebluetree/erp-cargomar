import { Routes } from '@angular/router';
import { HolidayListService } from '../../admin/holiday-list/holiday-list.service';
import { BranchListService } from './branch-list.service';

export const BRANCH_LIST_ROUTES: Routes = [
  {
    path: '',
    providers: [BranchListService],
    loadComponent: () => import('./branch-list.page').then((m) => m.BranchListPage),
  },
  {
    // A listed branch's holiday list, on the Holiday List page (design D4).
    path: ':id/holidays',
    providers: [HolidayListService],
    loadComponent: () => import('../../admin/holiday-list/holiday-list.page').then((m) => m.HolidayListPage),
  },
];
