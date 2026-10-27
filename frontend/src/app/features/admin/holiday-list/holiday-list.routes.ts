import { Routes } from '@angular/router';
import { MENU_CODES, MENU_CODE_DATA } from '../../../core/navigation/menu.model';
import { HolidayListService } from './holiday-list.service';

export const HOLIDAY_LIST_ROUTES: Routes = [
  {
    path: '',
    data: { [MENU_CODE_DATA]: MENU_CODES.holidayList },
    runGuardsAndResolvers: 'always',
    providers: [HolidayListService],
    loadComponent: () => import('./holiday-list.page').then((m) => m.HolidayListPage),
  },
];
