import { Routes } from '@angular/router';
import { MENU_CODES, MENU_CODE_DATA } from '../../../core/navigation/menu.model';
import { EmployeeProfileService } from './employee-profile.service';

export const EMPLOYEE_PROFILE_ROUTES: Routes = [
  {
    path: '',
    data: { [MENU_CODE_DATA]: MENU_CODES.profile },
    runGuardsAndResolvers: 'always',
    providers: [EmployeeProfileService],
    loadComponent: () => import('./employee-profile.page').then((m) => m.EmployeeProfilePage),
  },
];
