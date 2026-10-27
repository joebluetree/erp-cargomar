import { Routes } from '@angular/router';
import { MENU_CODES, MENU_CODE_DATA, RELATED_MENU_CODES_DATA } from '../../../core/navigation/menu.model';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { EmployeeListService } from './employee-list.service';

export const EMPLOYEE_LIST_ROUTES: Routes = [
  {
    path: '',
    // The Profile column opens the Profile, so the Profile's rights load with the list's.
    data: { [MENU_CODE_DATA]: MENU_CODES.employeeList, [RELATED_MENU_CODES_DATA]: [MENU_CODES.profile] },
    runGuardsAndResolvers: 'always',
    providers: [EmployeeListService],
    loadComponent: () => import('./employee-list.page').then((m) => m.EmployeeListPage),
  },
  {
    // A listed employee's profile, view only, on the Profile screen, so it needs the Profile right.
    path: ':id',
    data: { [MENU_CODE_DATA]: MENU_CODES.profile },
    runGuardsAndResolvers: 'always',
    providers: [EmployeeProfileService],
    loadComponent: () => import('../employee-profile/employee-profile.page').then((m) => m.EmployeeProfilePage),
  },
];
