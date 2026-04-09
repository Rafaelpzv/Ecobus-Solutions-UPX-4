import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container anim-fade-up">
      <div class="page-header">
        <h1>Mapa ao Vivo</h1>
        <p>Localização em tempo real dos veículos e sinais de passageiros</p>
      </div>

      <div class="map-layout">
        <!-- Sidebar -->
        <div class="map-sidebar">
          <div class="card" style="margin-bottom:16px">
            <div class="ms-header">
              <h3>Veículos Ativos</h3>
              <div class="pulse-dot"></div>
            </div>
            <div class="vehicle-list">
              @for (v of vehicles; track v.id) {
                <div
                  class="vehicle-item"
                  [class.selected]="selectedVehicle() === v.id"
                  (click)="selectVehicle(v.id)"
                >
                  <div class="vi-bus">🚌</div>
                  <div class="vi-info">
                    <div class="vi-line">Linha {{ v.line }}</div>
                    <div class="vi-route">{{ v.route }}</div>
                    <div class="vi-speed">{{ v.speed }} km/h · {{ v.passengers }} pass.</div>
                  </div>
                  <span
                    class="badge"
                    [class]="v.status === 'Em rota' ? 'badge-green' : 'badge-amber'"
                    >{{ v.status }}</span
                  >
                </div>
              }
            </div>
          </div>

          <div class="card">
            <h3 style="margin-bottom:14px">Sinais no Mapa</h3>
            <div class="signal-pins">
              @for (s of signalPins; track s.id) {
                <div class="signal-pin-item">
                  <div class="spi-dot" [class]="'pri-' + s.priority"></div>
                  <div class="spi-info">
                    <div class="spi-stop">{{ s.stop }}</div>
                    <div class="spi-count">{{ s.count }} passageiro(s)</div>
                  </div>
                  <span
                    class="badge"
                    [class]="s.priority === 'alta' ? 'badge-red' : 'badge-amber'"
                    >{{ s.priority }}</span
                  >
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Map canvas -->
        <div class="map-canvas">
          <div class="map-controls">
            <button class="map-ctrl-btn" title="Zoom in">+</button>
            <button class="map-ctrl-btn" title="Zoom out">−</button>
            <button class="map-ctrl-btn" title="Center" (click)="resetView()">⊙</button>
          </div>

          <!-- Simulated city map -->
          <div class="city-map">
            <!-- Grid streets -->
            <svg class="map-svg" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
              <!-- City blocks -->
              @for (street of streets; track street.id) {
                @if (street.horizontal) {
                  <line
                    [attr.x1]="street.x1"
                    [attr.y1]="street.y"
                    [attr.x2]="street.x2"
                    [attr.y2]="street.y"
                    [class]="'street ' + (street.main ? 'main-street' : '')"
                  />
                } @else {
                  <line
                    [attr.x1]="street.x"
                    [attr.y1]="street.y1"
                    [attr.x2]="street.x"
                    [attr.y2]="street.y2"
                    [class]="'street ' + (street.main ? 'main-street' : '')"
                  />
                }
              }

              <!-- Route line -->
              @for (route of mapRoutes; track route.id) {
                <polyline
                  [attr.points]="route.points"
                  class="route-line"
                  [style.stroke]="route.color"
                />
              }

              <!-- Bus stops -->
              @for (stop of mapStops; track stop.id) {
                <g class="stop-group" [attr.transform]="'translate(' + stop.x + ',' + stop.y + ')'">
                  <circle r="6" class="stop-circle" [class.has-signal]="stop.hasSignal" />
                  <text y="18" class="stop-label">{{ stop.name }}</text>
                </g>
              }

              <!-- Signal pins -->
              @for (pin of signalPins; track pin.id) {
                <g [attr.transform]="'translate(' + pin.x + ',' + pin.y + ')'">
                  <circle r="12" class="signal-ring" [class]="'ring-' + pin.priority" />
                  <text y="5" text-anchor="middle" font-size="12">📍</text>
                  <text y="28" text-anchor="middle" class="pin-count">{{ pin.count }}</text>
                </g>
              }

              <!-- Animated buses -->
              @for (v of vehicles; track v.id) {
                <g [attr.transform]="'translate(' + getBusX(v) + ',' + getBusY(v) + ')'">
                  <circle
                    r="14"
                    [class]="'bus-circle ' + (selectedVehicle() === v.id ? 'bus-selected' : '')"
                  />
                  <text y="5" text-anchor="middle" font-size="14">🚌</text>
                  <text y="28" text-anchor="middle" class="bus-label">{{ v.line }}</text>
                </g>
              }

              <!-- Labels -->
              <text x="400" y="30" text-anchor="middle" class="map-title">Sorocaba – Centro</text>
            </svg>
          </div>

          <!-- Map legend -->
          <div class="map-legend">
            <div class="legend-item">
              <div class="lg-dot green"></div>
              Veículo em rota
            </div>
            <div class="legend-item">
              <div class="lg-dot red"></div>
              Sinal de passageiro
            </div>
            <div class="legend-item">
              <div class="lg-dot blue"></div>
              Ponto de ônibus
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .map-layout {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 20px;
        height: calc(100vh - 200px);
      }
      .map-sidebar {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        gap: 0;
      }
      .ms-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        h3 {
          font-size: 15px;
          font-weight: 700;
        }
      }

      .vehicle-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .vehicle-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border);
        background: var(--bg-surface);
        cursor: pointer;
        transition: all var(--transition);
        &:hover,
        &.selected {
          border-color: rgba(0, 230, 118, 0.3);
          background: var(--primary-soft);
        }
      }
      .vi-bus {
        font-size: 18px;
        flex-shrink: 0;
      }
      .vi-info {
        flex: 1;
      }
      .vi-line {
        font-family: 'Exo 2', sans-serif;
        font-size: 13px;
        font-weight: 800;
        color: var(--text-primary);
      }
      .vi-route {
        font-size: 11px;
        color: var(--text-muted);
      }
      .vi-speed {
        font-size: 11px;
        color: var(--text-secondary);
        margin-top: 2px;
      }

      .signal-pins {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .signal-pin-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .spi-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
        &.pri-alta {
          background: var(--red);
          box-shadow: 0 0 6px var(--red);
        }
        &.pri-media {
          background: var(--amber);
        }
      }
      .spi-info {
        flex: 1;
      }
      .spi-stop {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .spi-count {
        font-size: 11px;
        color: var(--text-muted);
      }

      /* Map canvas */
      .map-canvas {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        position: relative;
        overflow: hidden;
      }
      .map-controls {
        position: absolute;
        top: 16px;
        right: 16px;
        z-index: 10;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .map-ctrl-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        color: var(--text-secondary);
        font-size: 16px;
        font-weight: 600;
        transition: all var(--transition);
        &:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
      }
      .city-map {
        width: 100%;
        height: calc(100% - 40px);
      }
      .map-svg {
        width: 100%;
        height: 100%;
      }

      /* SVG Styles */
      :host ::ng-deep {
        .street {
          stroke: rgba(0, 180, 216, 0.1);
          stroke-width: 1;
          fill: none;
        }
        .main-street {
          stroke: rgba(0, 180, 216, 0.2);
          stroke-width: 2;
        }
        .route-line {
          fill: none;
          stroke-width: 3;
          stroke-dasharray: 6, 3;
          opacity: 0.8;
        }
        .stop-circle {
          fill: var(--bg-elevated);
          stroke: var(--teal);
          stroke-width: 2;
        }
        .stop-circle.has-signal {
          fill: rgba(255, 82, 82, 0.2);
          stroke: var(--red);
        }
        .stop-label {
          fill: rgba(0, 180, 216, 0.5);
          font-size: 9px;
          text-anchor: middle;
        }
        .signal-ring {
          fill: transparent;
          stroke-width: 2;
          opacity: 0.7;
          &.ring-alta {
            stroke: var(--red);
            animation: pulse-ring 1.5s infinite;
          }
          &.ring-media {
            stroke: var(--amber);
          }
        }
        .pin-count {
          fill: var(--primary);
          font-size: 10px;
          font-weight: bold;
        }
        .bus-circle {
          fill: rgba(0, 230, 118, 0.15);
          stroke: var(--primary);
          stroke-width: 2;
        }
        .bus-circle.bus-selected {
          fill: rgba(0, 230, 118, 0.3);
          stroke: var(--primary);
          stroke-width: 3;
        }
        .bus-label {
          fill: var(--primary);
          font-size: 9px;
          font-weight: bold;
          font-family: 'Exo 2', sans-serif;
        }
        .map-title {
          fill: var(--text-muted);
          font-size: 11px;
          font-family: 'Exo 2', sans-serif;
        }
      }
      @keyframes pulse-ring {
        0%,
        100% {
          transform: scale(1);
          opacity: 0.7;
        }
        50% {
          transform: scale(1.4);
          opacity: 0.3;
        }
      }

      .map-legend {
        position: absolute;
        bottom: 16px;
        left: 16px;
        display: flex;
        gap: 16px;
        background: rgba(7, 24, 40, 0.8);
        backdrop-filter: blur(8px);
        padding: 8px 14px;
        border-radius: 20px;
        border: 1px solid var(--border);
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--text-secondary);
      }
      .lg-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        &.green {
          background: var(--primary);
        }
        &.red {
          background: var(--red);
        }
        &.blue {
          background: var(--teal);
        }
      }

      @media (max-width: 900px) {
        .map-layout {
          grid-template-columns: 1fr;
          height: auto;
        }
        .map-canvas {
          height: 400px;
        }
      }
    `,
  ],
})
export class MapComponent implements OnInit, OnDestroy {
  selectedVehicle = signal<number | null>(null);
  private interval: any;
  private tick = 0;

  vehicles = [
    {
      id: 1,
      line: '307',
      route: 'Centro → V. Hortência',
      speed: 38,
      passengers: 12,
      status: 'Em rota',
      px: 0.3,
      py: 0.5,
    },
    {
      id: 2,
      line: '412',
      route: 'Terminal → Brigadeiro',
      speed: 42,
      passengers: 8,
      status: 'Em rota',
      px: 0.6,
      py: 0.3,
    },
    {
      id: 3,
      line: '215',
      route: 'Campolim → Centro',
      speed: 0,
      passengers: 0,
      status: 'Parado',
      px: 0.8,
      py: 0.7,
    },
  ];

  streets = [
    // Horizontal streets
    { id: 'h1', horizontal: true, x1: 0, x2: 800, y: 80, main: true },
    { id: 'h2', horizontal: true, x1: 0, x2: 800, y: 160, main: false },
    { id: 'h3', horizontal: true, x1: 0, x2: 800, y: 240, main: true },
    { id: 'h4', horizontal: true, x1: 0, x2: 800, y: 320, main: false },
    { id: 'h5', horizontal: true, x1: 0, x2: 800, y: 400, main: true },
    { id: 'h6', horizontal: true, x1: 0, x2: 800, y: 460, main: false },
    // Vertical streets
    { id: 'v1', horizontal: false, x: 80, y1: 0, y2: 500, main: true },
    { id: 'v2', horizontal: false, x: 200, y1: 0, y2: 500, main: false },
    { id: 'v3', horizontal: false, x: 320, y1: 0, y2: 500, main: true },
    { id: 'v4', horizontal: false, x: 440, y1: 0, y2: 500, main: false },
    { id: 'v5', horizontal: false, x: 560, y1: 0, y2: 500, main: true },
    { id: 'v6', horizontal: false, x: 680, y1: 0, y2: 500, main: false },
  ];

  mapRoutes = [
    { id: 1, color: '#00e676', points: '80,240 200,240 320,240 440,240 560,240 680,240 760,240' },
    { id: 2, color: '#00b4d8', points: '80,400 80,320 80,240 80,160 200,80 320,80 440,80 560,80' },
  ];

  mapStops = [
    { id: 1, x: 80, y: 240, name: 'Terminal', hasSignal: false },
    { id: 2, x: 200, y: 240, name: 'Centro', hasSignal: true },
    { id: 3, x: 320, y: 240, name: 'Av. SP', hasSignal: true },
    { id: 4, x: 440, y: 240, name: 'Norte', hasSignal: false },
    { id: 5, x: 560, y: 240, name: 'Shopping', hasSignal: false },
    { id: 6, x: 680, y: 240, name: 'FACENS', hasSignal: true },
    { id: 7, x: 80, y: 400, name: 'Sul', hasSignal: false },
    { id: 8, x: 320, y: 80, name: 'Brigadeiro', hasSignal: false },
  ];

  signalPins = [
    { id: 1, x: 200, y: 240, stop: 'Centro / Av. SP', count: 3, priority: 'alta' },
    { id: 2, x: 320, y: 240, stop: 'Av. São Paulo', count: 2, priority: 'media' },
    { id: 3, x: 680, y: 240, stop: 'FACENS', count: 1, priority: 'media' },
  ];

  getBusX(v: any): number {
    const base = [80, 200, 320, 440, 560, 680, 760];
    const idx = Math.floor(this.tick / 20) % base.length;
    const progress = (this.tick % 20) / 20;
    if (v.id === 1)
      return base[idx] + (base[Math.min(idx + 1, base.length - 1)] - base[idx]) * progress;
    if (v.id === 2) return 80;
    return 680;
  }

  getBusY(v: any): number {
    if (v.id === 1) return 240;
    if (v.id === 2) {
      const pts = [400, 320, 240, 160, 80];
      const idx = Math.floor(this.tick / 30) % pts.length;
      return pts[idx];
    }
    return 240;
  }

  ngOnInit() {
    this.interval = setInterval(() => {
      this.tick++;
    }, 500);
  }
  ngOnDestroy() {
    clearInterval(this.interval);
  }

  selectVehicle(id: number) {
    this.selectedVehicle.set(this.selectedVehicle() === id ? null : id);
  }
  resetView() {}
}
