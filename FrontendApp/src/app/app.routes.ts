import { Routes } from '@angular/router';
import { Shell } from './Component/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      {
        path: 'crypto',
        loadComponent: () => import('./Component/crypto/crypto').then(m => m.Crypto)
      },
      {
        path: 'json-formatter',
        loadComponent: () => import('./Component/json-formatter/json-formatter').then(m => m.JsonFormatter)
      },
      {
        path: 'tester',
        loadComponent: () => import('./Component/api-tester/api-tester').then(m => m.ApiTester)
      },
      { path: 'request-tester', redirectTo: 'tester', pathMatch: 'full' },
      { path: '', redirectTo: 'crypto', pathMatch: 'full' },
    ]
  }
];
