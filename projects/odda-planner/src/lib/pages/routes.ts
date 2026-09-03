import { Routes } from '@angular/router';
import { isAdmin, isAuthenticated } from './guards';
import { Dashboard } from './management/dashboard/dashboard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'management',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/routes').then(x => x.AUTH_PLANNER_ROUTES)
  },
  {
    path: 'management',
    loadChildren: () => import('./management/routes').then(x => x.MANAGEMENT_ROUTES),
    canActivate: [
      isAuthenticated,
      isAdmin
    ]
  },
  {
    path: 'management/faq',
    loadComponent: () => import('./faq/faq.component').then(x => x.FaqComponent),
  },
  {
    path: 'cv-render/:cvId/:token',
    loadComponent: () => import('../pages/cv-render/cv-render.component').then(x => x.CvRenderComponent)
  },
  {
    path: 'new-app-info',
    loadComponent: () => import('./new-app-info/new-app-info').then(x => x.NewAppInfo)
  }
];
