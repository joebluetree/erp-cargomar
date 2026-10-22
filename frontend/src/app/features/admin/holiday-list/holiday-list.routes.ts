import { Routes } from '@angular/router';
import { HolidayListService } from './holiday-list.service';

export const HOLIDAY_LIST_ROUTES: Routes = [
  {
    path: '',
    providers: [HolidayListService],
    loadComponent: () => import('./holiday-list.page').then((m) => m.HolidayListPage),
  },
];
