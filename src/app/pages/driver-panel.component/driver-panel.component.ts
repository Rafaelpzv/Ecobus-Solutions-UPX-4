import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Alert {
  id: number;
  stop: string;
  count: number;
  distance: string;
  priority: 'alta' | 'media' | 'baixa';
  time: string;
  confirmed: boolean;
}

@Component({
  selector: 'app-driver-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container anim-fade-up">
      <div class="page-header">
        <h1>Painel do Motorista</h1>
        <p>Alertas em tempo real de passageiros aguardando nos pontos</p>
      </div>

      <!-- Driver status bar -->
      <div class="driver-bar">
        <div class="driver-info">
          <div class="driver-avatar">CS</div>
          <div>
            <div class="driver-name">Carlos Silva</div>
            <div class="driver-detail">Motorista · Veículo #308</div>
          </div>
        </div>
        <div class="route-info">
          <span class="route-badge">Linha 307</span>
          <span class="route-desc">Centro → Vila Hortência</span>
        </div>
        <div class="driver-stats-mini">
          <div class="dsm-item">
            <span class="dsm-val">{{ completedStops() }}</span>
            <span class="dsm-lbl">Paradas</span>
          </div>
          <div class="dsm-item">
            <span class="dsm-val">{{ totalBoarded() }}</span>
            <span class="dsm-lbl">Embarcados</span>
          </div>
          <div class="dsm-item">
            <span class="dsm-val">{{ alerts().length }}</span>
            <span class="dsm-lbl">Alertas</span>
          </div>
        </div>
        <div class="driver-status" [class.active]="isActive()">
          <div class="pulse-dot" [class.pulse-amber]="!isActive()"></div>
          {{ isActive() ? 'Em rota' : 'Parado' }}
        </div>
      </div>

      <div class="panel-grid">
        <!-- Alerts column -->
        <div class="alerts-col">
          <div class="col-header">
            <h3>Alertas de Passageiros</h3>
            @if (alerts().length > 0) {
              <span class="badge badge-red">{{ alerts().length }} pendente(s)</span>
            } @else {
              <span class="badge badge-green">Sem pendências</span>
            }
          </div>

          <div class="alerts-list">
            @for (alert of alerts(); track alert.id) {
              <div class="alert-card" [class]="'priority-' + alert.priority">
                <div class="alert-header">
                  <div class="alert-priority-dot" [class]="'prio-' + alert.priority"></div>
                  <span class="alert-stop">{{ alert.stop }}</span>
                  <span
                    class="badge"
                    [class]="
                      alert.priority === 'alta'
                        ? 'badge-red'
                        : alert.priority === 'media'
                          ? 'badge-amber'
                          : 'badge-gray'
                    "
                  >
                    {{ alert.priority | titlecase }}
                  </span>
                </div>
                <div class="alert-body">
                  <div class="alert-stat">
                    <span>👥 {{ alert.count }} passageiro(s)</span>
                    <span>📍 {{ alert.distance }}</span>
                    <span>🕐 {{ alert.time }}</span>
                  </div>
                </div>
                <div class="alert-actions">
                  <button class="btn btn-outline-success" (click)="confirmStop(alert.id)">
                    ✓ Confirmar Parada
                  </button>
                  <button class="btn btn-outline-danger" (click)="skipStop(alert.id)">Pular</button>
                </div>
              </div>
            }

            @if (alerts().length === 0) {
              <div class="empty-alerts">
                <span>✅</span>
                <p>Nenhum alerta pendente</p>
                <small>Todos os passageiros foram atendidos</small>
              </div>
            }
          </div>
        </div>

        <!-- Route progress -->
        <div class="route-col">
          <div class="card" style="margin-bottom:20px">
            <div class="col-header" style="margin-bottom:16px">
              <h3>Progresso da Rota</h3>
              <span class="text-muted" style="font-size:12px"
                >{{ completedStops() }}/{{ totalStops }} paradas</span
              >
            </div>
            <div class="route-progress">
              @for (stop of routeStops; track stop.id; let i = $index) {
                <div
                  class="route-stop-item"
                  [class.done]="stop.done"
                  [class.current]="stop.current"
                >
                  <div class="rsi-line-top" [class.filled]="stop.done || stop.current"></div>
                  <div class="rsi-dot">
                    @if (stop.done) {
                      ✓
                    } @else if (stop.current) {
                      🚌
                    } @else {
                      {{ i + 1 }}
                    }
                  </div>
                  <div class="rsi-line-bottom" [class.filled]="stop.done"></div>
                  <div class="rsi-info">
                    <div class="rsi-name">{{ stop.name }}</div>
                    @if (stop.passengers > 0) {
                      <div class="rsi-pass">{{ stop.passengers }} sinal(is)</div>
                    }
                    @if (stop.current) {
                      <div class="rsi-eta">← Próxima parada</div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Quick stats -->
          <div class="card">
            <div class="col-header" style="margin-bottom:16px"><h3>Resumo do Turno</h3></div>
            <div class="shift-stats">
              @for (s of shiftStats; track s.label) {
                <div class="shift-stat-item">
                  <span class="ss-icon">{{ s.icon }}</span>
                  <div>
                    <div class="ss-val" [style.color]="s.color">{{ s.value }}</div>
                    <div class="ss-lbl">{{ s.label }}</div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .driver-bar {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
        background: var(--bg-card);
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-lg);
        padding: 16px 24px;
        margin-bottom: 24px;
      }
      .driver-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .driver-avatar {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--primary), var(--teal));
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Exo 2', sans-serif;
        font-weight: 700;
        font-size: 14px;
        color: var(--text-inverse);
      }
      .driver-name {
        font-weight: 700;
        font-size: 15px;
        color: var(--text-primary);
      }
      .driver-detail {
        font-size: 12px;
        color: var(--text-muted);
      }
      .route-info {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
      }
      .route-badge {
        font-family: 'Exo 2', sans-serif;
        font-size: 14px;
        font-weight: 800;
        background: var(--primary-soft);
        color: var(--primary);
        border: 1px solid rgba(0, 230, 118, 0.2);
        padding: 4px 12px;
        border-radius: 8px;
      }
      .route-desc {
        font-size: 14px;
        color: var(--text-secondary);
      }
      .driver-stats-mini {
        display: flex;
        gap: 24px;
      }
      .dsm-item {
        text-align: center;
      }
      .dsm-val {
        display: block;
        font-family: 'Exo 2', sans-serif;
        font-size: 20px;
        font-weight: 800;
        color: var(--text-primary);
      }
      .dsm-lbl {
        font-size: 11px;
        color: var(--text-muted);
      }
      .driver-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
        background: var(--bg-surface);
        border: 1px solid var(--border);
        padding: 8px 16px;
        border-radius: 20px;
        &.active {
          color: var(--primary);
          background: var(--primary-soft);
          border-color: rgba(0, 230, 118, 0.2);
        }
      }
      .pulse-amber::after {
        border-color: var(--amber);
      }

      /* Panel Grid */
      .panel-grid {
        display: grid;
        grid-template-columns: 1fr 380px;
        gap: 20px;
      }
      .col-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        h3 {
          font-size: 15px;
          font-weight: 700;
        }
      }

      /* Alerts */
      .alerts-col {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 20px;
      }
      .alerts-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .alert-card {
        border-radius: var(--radius-md);
        padding: 16px;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        transition: all var(--transition);
        &.priority-alta {
          border-color: rgba(255, 82, 82, 0.3);
          background: rgba(255, 82, 82, 0.04);
        }
        &.priority-media {
          border-color: rgba(255, 214, 0, 0.3);
          background: rgba(255, 214, 0, 0.04);
        }
      }
      .alert-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      .alert-priority-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        &.prio-alta {
          background: var(--red);
          box-shadow: 0 0 8px var(--red);
        }
        &.prio-media {
          background: var(--amber);
        }
        &.prio-baixa {
          background: var(--text-muted);
        }
      }
      .alert-stop {
        font-weight: 700;
        font-size: 14px;
        color: var(--text-primary);
        flex: 1;
      }
      .alert-body {
        margin-bottom: 12px;
      }
      .alert-stat {
        display: flex;
        gap: 16px;
        font-size: 13px;
        color: var(--text-secondary);
      }
      .alert-actions {
        display: flex;
        gap: 8px;
      }
      .empty-alerts {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-muted);
        span {
          font-size: 36px;
          display: block;
          margin-bottom: 12px;
        }
        p {
          font-size: 15px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        small {
          font-size: 12px;
        }
      }

      /* Route progress */
      .route-progress {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .route-stop-item {
        display: grid;
        grid-template-columns: 20px 32px 1fr;
        grid-template-rows: 1fr auto 1fr;
        gap: 0 12px;
        min-height: 50px;
      }
      .rsi-line-top,
      .rsi-line-bottom {
        grid-column: 2;
        width: 2px;
        background: var(--border);
        margin: 0 auto;
        &.filled {
          background: var(--primary);
        }
      }
      .rsi-line-top {
        grid-row: 1;
        height: 100%;
      }
      .rsi-line-bottom {
        grid-row: 3;
        height: 100%;
      }
      .rsi-dot {
        grid-column: 2;
        grid-row: 2;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--bg-elevated);
        border: 2px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .route-stop-item.done .rsi-dot {
        background: var(--primary-soft);
        border-color: var(--primary);
        color: var(--primary);
      }
      .route-stop-item.current .rsi-dot {
        background: var(--teal-glow);
        border-color: var(--teal);
        font-size: 16px;
      }
      .rsi-info {
        grid-column: 3;
        grid-row: 1 / 4;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 4px 0;
      }
      .rsi-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .rsi-pass {
        font-size: 11px;
        color: var(--primary);
        margin-top: 2px;
      }
      .rsi-eta {
        font-size: 11px;
        color: var(--teal);
        margin-top: 2px;
        font-weight: 600;
      }

      /* Shift stats */
      .shift-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .shift-stat-item {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ss-icon {
        font-size: 20px;
      }
      .ss-val {
        font-family: 'Exo 2', sans-serif;
        font-size: 20px;
        font-weight: 800;
      }
      .ss-lbl {
        font-size: 11px;
        color: var(--text-muted);
      }

      @media (max-width: 900px) {
        .panel-grid {
          grid-template-columns: 1fr;
        }
        .driver-bar {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class DriverPanelComponent implements OnInit, OnDestroy {
  isActive = signal(true);
  completedStops = signal(4);
  totalBoarded = signal(11);
  totalStops = 14;

  alerts = signal<Alert[]>([
    {
      id: 1,
      stop: 'Av. São Paulo, 450',
      count: 3,
      distance: '0.8 km',
      priority: 'alta',
      time: '2 min',
      confirmed: false,
    },
    {
      id: 2,
      stop: 'Terminal Norte',
      count: 1,
      distance: '1.4 km',
      priority: 'media',
      time: '5 min',
      confirmed: false,
    },
    {
      id: 3,
      stop: 'Largo do Café',
      count: 2,
      distance: '2.1 km',
      priority: 'media',
      time: '8 min',
      confirmed: false,
    },
    {
      id: 4,
      stop: 'Parque das Águas',
      count: 1,
      distance: '3.0 km',
      priority: 'baixa',
      time: '12 min',
      confirmed: false,
    },
  ]);

  routeStops = [
    { id: 1, name: 'Terminal Central', passengers: 0, done: true, current: false },
    { id: 2, name: 'Rua XV de Novembro', passengers: 0, done: true, current: false },
    { id: 3, name: 'Praça Coronel Fernando', passengers: 0, done: true, current: false },
    { id: 4, name: 'Av. São Paulo, 450', passengers: 3, done: false, current: true },
    { id: 5, name: 'Terminal Norte', passengers: 1, done: false, current: false },
    { id: 6, name: 'Largo do Café', passengers: 2, done: false, current: false },
    { id: 7, name: 'Parque das Águas', passengers: 1, done: false, current: false },
    { id: 8, name: 'Vila Hortência', passengers: 0, done: false, current: false },
  ];

  shiftStats = [
    { icon: '⏱️', value: '1h 24m', label: 'Tempo em rota', color: 'var(--teal)' },
    { icon: '📍', value: '4/14', label: 'Paradas feitas', color: 'var(--primary)' },
    { icon: '👥', value: '11', label: 'Embarcados', color: 'var(--amber)' },
    { icon: '✅', value: '97%', label: 'Taxa de atend.', color: 'var(--primary)' },
  ];

  private interval: any;

  ngOnInit() {
    this.interval = setInterval(() => {
      if (Math.random() > 0.85) {
        const newAlert: Alert = {
          id: Date.now(),
          stop: ['Rua Sete de Setembro', 'Av. Afonso Vergueiro', 'Pça. Frei Baraúna'][
            Math.floor(Math.random() * 3)
          ],
          count: Math.floor(Math.random() * 4) + 1,
          distance: (Math.random() * 4 + 0.5).toFixed(1) + ' km',
          priority: 'media',
          time: 'agora',
          confirmed: false,
        };
        this.alerts.update((a) => [newAlert, ...a]);
      }
    }, 8000);
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  confirmStop(id: number) {
    this.alerts.update((a) => a.filter((x) => x.id !== id));
    this.completedStops.update((v) => v + 1);
    this.totalBoarded.update((v) => v + 1);
  }

  skipStop(id: number) {
    this.alerts.update((a) => a.filter((x) => x.id !== id));
  }
}
