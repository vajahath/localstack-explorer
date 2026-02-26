import { Routes } from '@angular/router';
import { SetupWizardComponent } from './components/setup-wizard/setup-wizard';

export const routes: Routes = [
  { path: '', component: SetupWizardComponent },
  {
    path: 'explorer',
    loadComponent: () => import('./components/explorer/explorer').then((m) => m.ExplorerComponent),
  },
  { path: '**', redirectTo: '' },
];
