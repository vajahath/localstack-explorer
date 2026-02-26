import { Routes } from '@angular/router';
import { SetupWizardComponent } from './components/setup-wizard/setup-wizard';
import { ExplorerComponent } from './components/explorer/explorer';

export const routes: Routes = [
  { path: '', component: SetupWizardComponent },
  { path: 'explorer', component: ExplorerComponent },
  { path: '**', redirectTo: '' },
];
