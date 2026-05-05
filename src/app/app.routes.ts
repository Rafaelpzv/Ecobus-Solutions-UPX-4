import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },

  {
    path: 'rastreamento',
    loadComponent: () =>
      import('./pages/tracking.component/tracking.component').then((m) => m.TrackingComponent),
  },
  {
    path: 'sala',
    loadComponent: () =>
      import('./pages/room-entry.component/room-entry.component').then((m) => m.RoomEntryComponent),
  },
  {
    path: 'rastreamento/:codigo',
    loadComponent: () =>
      import('./pages/custom-tracking.component/custom-tracking.component').then(
        (m) => m.CustomTrackingComponent,
      ),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin.component/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
