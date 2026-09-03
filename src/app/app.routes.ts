import { Routes } from '@angular/router';


export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('odda-planner').then(x => x.routes),
  }
];

