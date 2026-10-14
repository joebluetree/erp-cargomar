import { Routes } from '@angular/router';
import { LoginService } from './login.service';

export const LOGIN_ROUTES: Routes = [
  {
    path: '',
    providers: [LoginService],
    loadComponent: () => import('./login.page').then((m) => m.LoginPage),
  },
];
