import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Route {
  id: number;
  num: string;
  name: string;
  origin: string;
  destination: string;
  stops: number;
  buses: number;
  color: string;
  status: string;
  passengers: number;
  distance: string;
  frequency: string;
}

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container anim-fade-up">
      <div class="page-header">
        <div>
          <h1>Gestão de Rotas</h1>
          <p>Cadastre e gerencie rotas e pontos de embarque</p>
        </div>
        <button class="btn btn-primary" (click)="showModal.set(true)">+ Nova Rota</button>
      </div>

      <!-- Stats -->
      <div class="grid-4" style="margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(0,230,118,0.12)">🛣️</div>
          <div class="stat-label">Total de Rotas</div>
          <div class="stat-value">{{ routes().length }}</div>
          <div class="stat-change text-green">↑ 2 novas este mês</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(0,180,216,0.12)">🚌</div>
          <div class="stat-label">Veículos em Rota</div>
          <div class="stat-value">{{ activeVehicles }}</div>
          <div class="stat-change text-teal">de 11 disponíveis</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(255,214,0,0.12)">📍</div>
          <div class="stat-label">Pontos Cadastrados</div>
          <div class="stat-value">52</div>
          <div class="stat-change text-amber">↑ 3 novos pontos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(255,82,82,0.12)">👥</div>
          <div class="stat-label">Passageiros/Dia</div>
          <div class="stat-value">2.34K</div>
          <div class="stat-change text-green">↑ +8% esta semana</div>
        </div>
      </div>

      <!-- Routes grid -->
      <div class="routes-grid">
        @for (route of routes(); track route.id) {
          <div class="route-card" [style.border-left-color]="route.color">
            <div class="rc-header">
              <div
                class="rc-num"
                [style.background]="route.color + '22'"
                [style.color]="route.color"
              >
                {{ route.num }}
              </div>
              <div class="rc-title">
                <div class="rc-name">{{ route.name }}</div>
                <div class="rc-path">{{ route.origin }} → {{ route.destination }}</div>
              </div>
              <span class="badge" [class]="route.status === 'Ativa' ? 'badge-green' : 'badge-gray'">
                {{ route.status }}
              </span>
            </div>

            <div class="rc-stats">
              <div class="rcs-item">
                <span class="rcs-val">{{ route.stops }}</span>
                <span class="rcs-lbl">Pontos</span>
              </div>
              <div class="rcs-sep"></div>
              <div class="rcs-item">
                <span class="rcs-val">{{ route.buses }}</span>
                <span class="rcs-lbl">Veículos</span>
              </div>
              <div class="rcs-sep"></div>
              <div class="rcs-item">
                <span class="rcs-val">{{ route.distance }}</span>
                <span class="rcs-lbl">Distância</span>
              </div>
              <div class="rcs-sep"></div>
              <div class="rcs-item">
                <span class="rcs-val" style="color:var(--primary)">{{ route.passengers }}</span>
                <span class="rcs-lbl">Pass./dia</span>
              </div>
            </div>

            <div class="rc-detail">
              <span>🔄 Frequência: {{ route.frequency }}</span>
            </div>

            <div class="rc-actions">
              <button class="btn btn-ghost btn-sm">Ver Pontos</button>
              <button class="btn btn-outline btn-sm">Editar</button>
              <button class="btn btn-danger btn-sm" (click)="deleteRoute(route.id)">Excluir</button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="showModal.set(false)">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Nova Rota</h2>
            <button class="close-btn" (click)="showModal.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label>Número da Linha</label>
                <input
                  type="text"
                  [(ngModel)]="newRoute.num"
                  placeholder="ex: 307"
                  class="eco-input"
                />
              </div>
              <div class="form-group">
                <label>Nome da Rota</label>
                <input
                  type="text"
                  [(ngModel)]="newRoute.name"
                  placeholder="ex: Centro → Vila Hortência"
                  class="eco-input"
                />
              </div>
              <div class="form-group">
                <label>Origem</label>
                <input
                  type="text"
                  [(ngModel)]="newRoute.origin"
                  placeholder="Ponto de origem"
                  class="eco-input"
                />
              </div>
              <div class="form-group">
                <label>Destino</label>
                <input
                  type="text"
                  [(ngModel)]="newRoute.destination"
                  placeholder="Ponto de destino"
                  class="eco-input"
                />
              </div>
              <div class="form-group">
                <label>Número de Paradas</label>
                <input
                  type="number"
                  [(ngModel)]="newRoute.stops"
                  placeholder="0"
                  class="eco-input"
                />
              </div>
              <div class="form-group">
                <label>Frequência</label>
                <select [(ngModel)]="newRoute.frequency" class="eco-select">
                  <option>A cada 15 min</option>
                  <option>A cada 20 min</option>
                  <option>A cada 30 min</option>
                  <option>A cada 45 min</option>
                  <option>A cada 60 min</option>
                </select>
              </div>
              <div class="form-group">
                <label>Cor da Rota</label>
                <div class="color-options">
                  @for (c of colorOptions; track c) {
                    <div
                      class="color-opt"
                      [style.background]="c"
                      [class.selected]="newRoute.color === c"
                      (click)="newRoute.color = c"
                    ></div>
                  }
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="showModal.set(false)">Cancelar</button>
            <button class="btn btn-primary" (click)="addRoute()">Criar Rota</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
      }

      .routes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
        gap: 20px;
      }
      .route-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-left: 4px solid var(--primary);
        border-radius: var(--radius-lg);
        padding: 20px;
        transition: all var(--transition);
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
      }
      .rc-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 16px;
      }
      .rc-num {
        min-width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Exo 2', sans-serif;
        font-size: 16px;
        font-weight: 900;
        flex-shrink: 0;
      }
      .rc-title {
        flex: 1;
      }
      .rc-name {
        font-weight: 700;
        font-size: 15px;
        color: var(--text-primary);
      }
      .rc-path {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 3px;
      }
      .rc-stats {
        display: flex;
        align-items: center;
        gap: 0;
        margin-bottom: 12px;
        background: var(--bg-surface);
        border-radius: var(--radius-md);
        overflow: hidden;
      }
      .rcs-item {
        flex: 1;
        text-align: center;
        padding: 10px 8px;
      }
      .rcs-val {
        display: block;
        font-family: 'Exo 2', sans-serif;
        font-size: 18px;
        font-weight: 800;
        color: var(--text-primary);
      }
      .rcs-lbl {
        display: block;
        font-size: 10px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .rcs-sep {
        width: 1px;
        background: var(--border);
        align-self: stretch;
      }
      .rc-detail {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 14px;
      }
      .rc-actions {
        display: flex;
        gap: 8px;
      }

      /* Modal */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .modal-box {
        background: var(--bg-card);
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-xl);
        width: 100%;
        max-width: 600px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
        animation: fadeInUp 0.3s ease;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 24px 0;
        h2 {
          font-size: 20px;
        }
      }
      .close-btn {
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: var(--text-muted);
        width: 32px;
        height: 32px;
        border-radius: 8px;
        font-size: 14px;
        transition: all var(--transition);
        &:hover {
          background: rgba(255, 255, 255, 0.15);
          color: var(--text-primary);
        }
      }
      .modal-body {
        padding: 24px;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-muted);
      }
      .eco-input,
      .eco-select {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        color: var(--text-primary);
        padding: 10px 14px;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-family: inherit;
        transition: border-color var(--transition);
        &:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-soft);
        }
      }
      .eco-select option {
        background: var(--bg-surface);
      }
      .color-options {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .color-opt {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        cursor: pointer;
        transition: all var(--transition);
        border: 2px solid transparent;
        &.selected {
          border-color: white;
          transform: scale(1.2);
        }
        &:hover {
          transform: scale(1.1);
        }
      }
      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 24px;
        border-top: 1px solid var(--border);
      }
    `,
  ],
})
export class RoutesComponent {
  showModal = signal(false);
  activeVehicles = 8;
  colorOptions = ['#00e676', '#00b4d8', '#ffd600', '#ff5252', '#ab47bc', '#ff7043', '#26c6da'];

  newRoute = {
    num: '',
    name: '',
    origin: '',
    destination: '',
    stops: 0,
    frequency: 'A cada 20 min',
    color: '#00e676',
  };

  routes = signal<Route[]>([
    {
      id: 1,
      num: '307',
      name: 'Centro → Vila Hortência',
      origin: 'Terminal Central',
      destination: 'Vila Hortência',
      stops: 14,
      buses: 2,
      color: '#00e676',
      status: 'Ativa',
      passengers: 450,
      distance: '12 km',
      frequency: 'A cada 15 min',
    },
    {
      id: 2,
      num: '412',
      name: 'Terminal → Brigadeiro',
      origin: 'Terminal Norte',
      destination: 'Brigadeiro',
      stops: 18,
      buses: 2,
      color: '#00b4d8',
      status: 'Ativa',
      passengers: 380,
      distance: '15 km',
      frequency: 'A cada 20 min',
    },
    {
      id: 3,
      num: '215',
      name: 'Campolim → Centro',
      origin: 'Campolim',
      destination: 'Terminal Central',
      stops: 11,
      buses: 1,
      color: '#ffd600',
      status: 'Ativa',
      passengers: 290,
      distance: '9 km',
      frequency: 'A cada 30 min',
    },
    {
      id: 4,
      num: '550',
      name: 'Shopping → UNESP',
      origin: 'Shopping Iguatemi',
      destination: 'UNESP Sorocaba',
      stops: 9,
      buses: 1,
      color: '#ff5252',
      status: 'Ativa',
      passengers: 210,
      distance: '7 km',
      frequency: 'A cada 20 min',
    },
    {
      id: 5,
      num: 'F-A',
      name: 'Fretado FACENS',
      origin: 'Terminal Central',
      destination: 'FACENS',
      stops: 5,
      buses: 1,
      color: '#ab47bc',
      status: 'Ativa',
      passengers: 95,
      distance: '6 km',
      frequency: 'A cada 60 min',
    },
    {
      id: 6,
      num: '101',
      name: 'Zona Norte Circular',
      origin: 'Terminal Norte',
      destination: 'Terminal Norte',
      stops: 22,
      buses: 0,
      color: '#26c6da',
      status: 'Inativa',
      passengers: 0,
      distance: '18 km',
      frequency: 'A cada 45 min',
    },
  ]);

  addRoute() {
    if (!this.newRoute.num || !this.newRoute.name) return;
    this.routes.update((r) => [
      ...r,
      {
        id: Date.now(),
        num: this.newRoute.num,
        name: this.newRoute.name,
        origin: this.newRoute.origin,
        destination: this.newRoute.destination,
        stops: this.newRoute.stops,
        buses: 0,
        color: this.newRoute.color,
        status: 'Inativa',
        passengers: 0,
        distance: '— km',
        frequency: this.newRoute.frequency,
      },
    ]);
    this.newRoute = {
      num: '',
      name: '',
      origin: '',
      destination: '',
      stops: 0,
      frequency: 'A cada 20 min',
      color: '#00e676',
    };
    this.showModal.set(false);
  }

  deleteRoute(id: number) {
    if (confirm('Deseja realmente excluir esta rota?')) {
      this.routes.update((r) => r.filter((x) => x.id !== id));
    }
  }
}
