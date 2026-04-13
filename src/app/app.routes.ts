import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component/home.component';
import { LayoutComponent } from './layout/layout.component'; // 👈 novo layout

export const routes: Routes = [
  // 🔹 HOME (sem sidebar)
  {
    path: '',
    component: HomeComponent,
  },

  // 🔹 ÁREA COM SIDEBAR
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard.component/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'painel-motorista',
        loadComponent: () =>
          import('./pages/driver-panel.component/driver-panel.component').then(
            (m) => m.DriverPanelComponent,
          ),
      },
      {
        path: 'mapa',
        loadComponent: () =>
          import('./pages/map.component/map.component').then((m) => m.MapComponent),
      },
      {
        path: 'historico',
        loadComponent: () =>
          import('./pages/history.component/history.component').then((m) => m.HistoryComponent),
      },
      {
        path: 'rotas',
        loadComponent: () =>
          import('./pages/routes.component/routes.component').then((m) => m.RoutesComponent),
      },
      {
        path: 'rastreamento',
        loadComponent: () =>
          import('./pages/tracking.component/tracking.component').then((m) => m.TrackingComponent),
      },
      {
        path: 'sinais',
        loadComponent: () =>
          import('./pages/signals.component/signals.component').then((m) => m.SignalsComponent),
      },
    ],
  },

  // 🔹 fallback
  {
    path: '**',
    redirectTo: '',
  },
];
