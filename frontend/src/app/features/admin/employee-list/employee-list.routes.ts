import { Routes } from '@angular/router';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { EmployeeListService } from './employee-list.service';

export const EMPLOYEE_LIST_ROUTES: Routes = [
  {
    path: '',
    providers: [EmployeeListService],
    loadComponent: () => import('./employee-list.page').then((m) => m.EmployeeListPage),
  },
  {
    // A listed employee's profile, view only, on the Profile screen.
    path: ':id',
    providers: [EmployeeProfileService],
    loadComponent: () => import('../employee-profile/employee-profile.page').then((m) => m.EmployeeProfilePage),
  },
];
