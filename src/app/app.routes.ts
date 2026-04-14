import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component/home.component';

export const routes: Routes = [
  // 🔹 HOME (sem sidebar)
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'rastreamento',
    loadComponent: () =>
      import('./pages/tracking.component/tracking.component').then((m) => m.TrackingComponent),
  },
];
