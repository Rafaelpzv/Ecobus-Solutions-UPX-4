import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component/home.component';

export const routes: Routes = [
  // ── Home (sem sidebar, sem navbar) ────────────────────────────────────────
  {
    path: '',
    component: HomeComponent,
  },

  // ── Rastreamento geral (rota legada mantida) ──────────────────────────────
  {
    path: 'rastreamento',
    loadComponent: () =>
      import('./pages/tracking.component/tracking.component').then((m) => m.TrackingComponent),
  },

  // ── Entrada de sala personalizada ─────────────────────────────────────────
  // Usuário digita ou cola um código de sala
  {
    path: 'sala',
    loadComponent: () =>
      import('./pages/room-entry.component/room-entry.component').then(
        (m) => m.RoomEntryComponent,
      ),
  },

  // ── Rastreamento personalizado por código de sala ─────────────────────────
  // Rota dinâmica: /rastreamento/linha-307, /rastreamento/facens-a
  {
    path: 'rastreamento/:codigo',
    loadComponent: () =>
      import(
        './pages/custom-tracking.component/custom-tracking.component'
      ).then((m) => m.CustomTrackingComponent),
  },

  // ── Fallback ───────────────────────────────────────────────────────────────
  {
    path: '**',
    redirectTo: '',
  },
];
