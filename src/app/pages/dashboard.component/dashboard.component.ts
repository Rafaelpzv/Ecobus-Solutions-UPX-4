import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container anim-fade-up">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Visão geral em tempo real do sistema EcoBus Solutions</p>
      </div>

      <!-- KPI Stats -->
      <div class="grid-4" style="margin-bottom:24px">
        @for (stat of stats; track stat.label) {
          <div class="stat-card">
            <div class="stat-icon" [style.background]="stat.iconBg">{{ stat.icon }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-change">{{ stat.change }}</div>
          </div>
        }
      </div>

      <!-- Main grid -->
      <div class="dash-grid">
        <!-- Active signals -->
        <div class="card">
          <div class="card-header">
            <h3>Sinais Ativos</h3>
            <span class="badge badge-green">
              <div class="pulse-dot" style="width:6px;height:6px"></div>
              Ao vivo
            </span>
          </div>
          <div class="signals-list">
            @for (s of activeSignals; track s.id) {
              <div class="signal-row">
                <div class="signal-left">
                  <div class="signal-dot" [class]="'dot-' + s.priority"></div>
                  <div>
                    <div class="signal-stop">{{ s.stop }}</div>
                    <div class="signal-line">{{ s.line }}</div>
                  </div>
                </div>
                <div class="signal-right">
                  <span class="signal-count">{{ s.count }} passageiro(s)</span>
                  <span class="signal-time">{{ s.time }}</span>
                </div>
              </div>
            }
          </div>
          <a
            routerLink="/sinais"
            class="btn btn-ghost btn-sm"
            style="width:100%; justify-content:center; margin-top:12px"
          >
            Ver todos os sinais →
          </a>
        </div>

        <!-- Routes summary -->
        <div class="card">
          <div class="card-header">
            <h3>Rotas em Operação</h3>
            <span class="badge badge-teal">{{ activeRoutes }} ativas</span>
          </div>
          <div class="routes-list">
            @for (r of routes; track r.id) {
              <div class="route-row">
                <div class="route-num" [style.background]="r.color + '22'" [style.color]="r.color">
                  {{ r.num }}
                </div>
                <div class="route-info">
                  <div class="route-name">{{ r.name }}</div>
                  <div class="route-meta">{{ r.stops }} pontos · {{ r.buses }} veículo(s)</div>
                </div>
                <div class="route-status">
                  <span
                    class="badge"
                    [class]="r.status === 'Em rota' ? 'badge-green' : 'badge-amber'"
                    >{{ r.status }}</span
                  >
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Bar chart -->
        <div class="card chart-card">
          <div class="card-header">
            <h3>Sinais por Hora de Hoje</h3>
          </div>
          <div class="bar-chart">
            @for (bar of hourlyData; track bar.hour) {
              <div class="bar-col">
                <div class="bar-fill" [style.height.%]="bar.pct" [class.peak]="bar.peak"></div>
                <div class="bar-label">{{ bar.hour }}</div>
              </div>
            }
          </div>
        </div>

        <!-- Recent activity -->
        <div class="card">
          <div class="card-header">
            <h3>Atividade Recente</h3>
          </div>
          <div class="activity-list">
            @for (a of activity; track a.id) {
              <div class="activity-row">
                <div class="act-icon" [style.background]="a.iconBg">{{ a.icon }}</div>
                <div class="act-info">
                  <div class="act-title">{{ a.title }}</div>
                  <div class="act-desc">{{ a.desc }}</div>
                </div>
                <div class="act-time">{{ a.time }}</div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Bottom row -->
      <div class="grid-3" style="margin-top:20px">
        <!-- Demand by stops -->
        <div class="card col-span-2">
          <div class="card-header"><h3>Demanda por Ponto (últimas 24h)</h3></div>
          <table class="eco-table">
            <thead>
              <tr>
                <th>Ponto</th>
                <th>Sinais</th>
                <th>Embarques</th>
                <th>Taxa</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (row of demandTable; track row.stop) {
                <tr>
                  <td style="color:var(--text-primary); font-weight:500">{{ row.stop }}</td>
                  <td>{{ row.signals }}</td>
                  <td>{{ row.boards }}</td>
                  <td style="color:var(--primary); font-weight:600">{{ row.rate }}%</td>
                  <td>
                    <span class="badge" [class]="row.rate > 90 ? 'badge-green' : 'badge-amber'">{{
                      row.rate > 90 ? 'Ótimo' : 'Regular'
                    }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Quick actions -->
        <div class="card">
          <div class="card-header"><h3>Ações Rápidas</h3></div>
          <div class="quick-actions">
            @for (qa of quickActions; track qa.label) {
              <a [routerLink]="qa.path" class="qa-btn">
                <span class="qa-icon" [style.background]="qa.bg">{{ qa.icon }}</span>
                <span class="qa-label">{{ qa.label }}</span>
                <span class="qa-arrow">→</span>
              </a>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dash-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto;
        gap: 20px;
      }
      .chart-card {
        grid-column: 1 / -1;
      }
      .col-span-2 {
        grid-column: span 2;
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        h3 {
          font-size: 15px;
          font-weight: 700;
        }
      }

      /* Signals */
      .signals-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .signal-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border-radius: var(--radius-md);
        background: var(--bg-surface);
        border: 1px solid var(--border);
      }
      .signal-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .signal-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        &.dot-high {
          background: var(--primary);
          box-shadow: 0 0 8px var(--primary);
        }
        &.dot-medium {
          background: var(--amber);
        }
        &.dot-low {
          background: var(--text-muted);
        }
      }
      .signal-stop {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .signal-line {
        font-size: 11px;
        color: var(--text-muted);
      }
      .signal-right {
        text-align: right;
      }
      .signal-count {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: var(--primary);
      }
      .signal-time {
        display: block;
        font-size: 11px;
        color: var(--text-muted);
      }

      /* Routes */
      .routes-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .route-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        border-radius: var(--radius-md);
        background: var(--bg-surface);
        border: 1px solid var(--border);
      }
      .route-num {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Exo 2', sans-serif;
        font-size: 13px;
        font-weight: 800;
        flex-shrink: 0;
      }
      .route-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .route-meta {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .route-status {
        margin-left: auto;
      }

      /* Bar chart */
      .bar-chart {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        height: 120px;
        padding: 0 4px;
      }
      .bar-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        height: 100%;
      }
      .bar-fill {
        width: 100%;
        border-radius: 4px 4px 0 0;
        background: var(--bg-elevated);
        margin-top: auto;
        transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        &.peak {
          background: var(--primary);
          box-shadow: 0 0 10px var(--primary-glow);
        }
      }
      .bar-label {
        font-size: 10px;
        color: var(--text-muted);
      }

      /* Activity */
      .activity-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .activity-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      .act-icon {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        flex-shrink: 0;
      }
      .act-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .act-desc {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 2px;
      }
      .act-time {
        font-size: 11px;
        color: var(--text-muted);
        white-space: nowrap;
        margin-left: auto;
      }

      /* Quick actions */
      .quick-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .qa-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: var(--radius-md);
        background: var(--bg-surface);
        border: 1px solid var(--border);
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 500;
        transition: all var(--transition);
        &:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
          border-color: var(--border-strong);
        }
      }
      .qa-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }
      .qa-label {
        flex: 1;
      }
      .qa-arrow {
        color: var(--text-muted);
      }

      @media (max-width: 900px) {
        .dash-grid {
          grid-template-columns: 1fr;
        }
        .chart-card {
          grid-column: 1;
        }
        .col-span-2 {
          grid-column: 1;
        }
      }
    `,
  ],
})
export class DashboardComponent {
  activeRoutes = 5;

  stats = [
    {
      icon: '📍',
      label: 'Sinais Hoje',
      value: '127',
      change: '↑ +18% vs ontem',
      iconBg: 'rgba(0,230,118,0.12)',
    },
    {
      icon: '✅',
      label: 'Embarques',
      value: '114',
      change: '↑ Taxa de 89.7%',
      iconBg: 'rgba(0,180,216,0.12)',
    },
    {
      icon: '🚌',
      label: 'Veículos Ativos',
      value: '8',
      change: '3 em manutenção',
      iconBg: 'rgba(255,214,0,0.12)',
    },
    {
      icon: '👥',
      label: 'Passageiros',
      value: '2.340',
      change: '↑ +5% esta semana',
      iconBg: 'rgba(255,82,82,0.12)',
    },
  ];

  activeSignals = [
    {
      id: 1,
      stop: 'Ponto Central',
      line: 'Linha 307',
      count: 4,
      time: '2 min atrás',
      priority: 'high',
    },
    {
      id: 2,
      stop: 'Terminal Norte',
      line: 'Linha 412',
      count: 2,
      time: '5 min atrás',
      priority: 'medium',
    },
    {
      id: 3,
      stop: 'Av. São Paulo',
      line: 'Linha 215',
      count: 1,
      time: '8 min atrás',
      priority: 'medium',
    },
    {
      id: 4,
      stop: 'Shopping Iguatemi',
      line: 'Linha 550',
      count: 3,
      time: '11 min atrás',
      priority: 'high',
    },
    { id: 5, stop: 'FACENS', line: 'Fretado A', count: 2, time: '15 min atrás', priority: 'low' },
  ];

  routes = [
    {
      id: 1,
      num: '307',
      name: 'Centro → Vila Hortência',
      stops: 14,
      buses: 2,
      color: '#00e676',
      status: 'Em rota',
    },
    {
      id: 2,
      num: '412',
      name: 'Terminal → Brigadeiro',
      stops: 18,
      buses: 2,
      color: '#00b4d8',
      status: 'Em rota',
    },
    {
      id: 3,
      num: '215',
      name: 'Campolim → Centro',
      stops: 11,
      buses: 1,
      color: '#ffd600',
      status: 'Aguardando',
    },
    {
      id: 4,
      num: '550',
      name: 'Shopping → UNESP',
      stops: 9,
      buses: 1,
      color: '#ff5252',
      status: 'Em rota',
    },
  ];

  hourlyData = [
    { hour: '6h', pct: 25, peak: false },
    { hour: '7h', pct: 60, peak: false },
    { hour: '8h', pct: 90, peak: true },
    { hour: '9h', pct: 55, peak: false },
    { hour: '10h', pct: 30, peak: false },
    { hour: '11h', pct: 20, peak: false },
    { hour: '12h', pct: 45, peak: false },
    { hour: '13h', pct: 40, peak: false },
    { hour: '14h', pct: 25, peak: false },
    { hour: '15h', pct: 20, peak: false },
    { hour: '16h', pct: 50, peak: false },
    { hour: '17h', pct: 100, peak: true },
    { hour: '18h', pct: 85, peak: true },
    { hour: '19h', pct: 40, peak: false },
  ];

  activity = [
    {
      id: 1,
      icon: '📍',
      title: 'Sinal emitido',
      desc: 'Ponto Central · Linha 307 · 4 passageiros',
      time: '2 min',
      iconBg: 'rgba(0,230,118,0.15)',
    },
    {
      id: 2,
      icon: '✅',
      title: 'Embarque confirmado',
      desc: 'Terminal Norte · 2 passageiros embarcaram',
      time: '7 min',
      iconBg: 'rgba(0,180,216,0.15)',
    },
    {
      id: 3,
      icon: '🚌',
      title: 'Veículo despachado',
      desc: 'Linha 412 · Saiu do terminal',
      time: '12 min',
      iconBg: 'rgba(255,214,0,0.15)',
    },
    {
      id: 4,
      icon: '⚠️',
      title: 'Atraso detectado',
      desc: 'Linha 215 · 8 min de atraso',
      time: '18 min',
      iconBg: 'rgba(255,82,82,0.15)',
    },
    {
      id: 5,
      icon: '📊',
      title: 'Relatório gerado',
      desc: 'Resumo diário disponível',
      time: '1 hora',
      iconBg: 'rgba(255,255,255,0.06)',
    },
  ];

  demandTable = [
    { stop: 'Ponto Central', signals: 32, boards: 31, rate: 97 },
    { stop: 'Terminal Norte', signals: 28, boards: 26, rate: 93 },
    { stop: 'Av. São Paulo', signals: 19, boards: 17, rate: 89 },
    { stop: 'Shopping Iguatemi', signals: 24, boards: 22, rate: 92 },
    { stop: 'FACENS', signals: 15, boards: 13, rate: 87 },
    { stop: 'Parque das Águas', signals: 9, boards: 7, rate: 78 },
  ];

  quickActions = [
    { path: '/sinais', icon: '📍', label: 'Emitir Sinal', bg: 'rgba(0,230,118,0.12)' },
    {
      path: '/painel-motorista',
      icon: '🚌',
      label: 'Painel Motorista',
      bg: 'rgba(0,180,216,0.12)',
    },
    { path: '/mapa', icon: '🗺️', label: 'Ver Mapa ao Vivo', bg: 'rgba(255,214,0,0.12)' },
    { path: '/rotas', icon: '🛣️', label: 'Gerenciar Rotas', bg: 'rgba(255,82,82,0.12)' },
    { path: '/historico', icon: '📋', label: 'Ver Histórico', bg: 'rgba(255,255,255,0.06)' },
  ];
}
