import {Routes} from '@angular/router';

export const AUTH_PLANNER_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login').then(x => x.Login)
  },
  {
    path: 'recovery/:token',
    loadComponent: () => import('./recovery/recovery.component').then(x => x.RecoveryComponent)
  },
  {
    path: 'recovery',
    loadComponent: () => import('./request-password-change/request-password-change.component').then(x => x.RequestPasswordChangeComponent)
  }
];
