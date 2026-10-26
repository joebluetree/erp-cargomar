import { Routes } from '@angular/router';
import { autoLoginGuard } from './auto-login.guard';
import { LoginService } from './login.service';

export const LOGIN_ROUTES: Routes = [
  {
    path: '',
    providers: [LoginService],
    // A link with ?appid= logs in before the screen is created, and opens the Dashboard without showing it.
    canActivate: [autoLoginGuard],
    loadComponent: () => import('./login.page').then((m) => m.LoginPage),
  },
];
