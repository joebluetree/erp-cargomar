import { Routes } from '@angular/router';
import { EmployeeProfileService } from './employee-profile.service';

export const EMPLOYEE_PROFILE_ROUTES: Routes = [
  {
    path: '',
    providers: [EmployeeProfileService],
    loadComponent: () => import('./employee-profile.page').then((m) => m.EmployeeProfilePage),
  },
];
