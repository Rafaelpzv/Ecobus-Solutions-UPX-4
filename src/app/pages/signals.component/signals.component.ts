import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Signal {
  id: number;
  stop: string;
  line: string;
  count: number;
  time: string;
  priority: 'alta' | 'media' | 'baixa';
  status: 'pendente' | 'atendido' | 'cancelado';
  lat?: number;
  lng?: number;
}

@Component({
  selector: 'app-signals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container anim-fade-up">
      <div class="page-header">
        <div>
          <h1>Sinais de Embarque</h1>
          <p>Passageiros aguardando nos pontos em tempo real</p>
        </div>
        <button class="btn btn-primary" (click)="showForm.set(true)">+ Novo Sinal</button>
      </div>

      <!-- Stats -->
      <div class="grid-4" style="margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(255,82,82,0.12)">🚨</div>
          <div class="stat-label">Pendentes</div>
          <div class="stat-value" style="color:var(--red)">{{ pendingCount() }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(0,230,118,0.12)">✅</div>
          <div class="stat-label">Atendidos hoje</div>
          <div class="stat-value">{{ servedCount() }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(0,180,216,0.12)">👥</div>
          <div class="stat-label">Passageiros</div>
          <div class="stat-value">{{ totalPassengers() }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(255,214,0,0.12)">⏱️</div>
          <div class="stat-label">Tempo médio</div>
          <div class="stat-value">
            4.2<span style="font-size:16px;color:var(--text-muted)"> min</span>
          </div>
        </div>
      </div>

      <!-- New signal form -->
      @if (showForm()) {
        <div class="card new-signal-card" style="margin-bottom:20px">
          <h3 style="margin-bottom:16px">Emitir Sinal de Presença</h3>
          <div class="form-row">
            <div class="fg">
              <label>Ponto de embarque</label
              ><input
                [(ngModel)]="newStop"
                placeholder="ex: Av. São Paulo, 450"
                class="eco-input"
              />
            </div>
            <div class="fg">
              <label>Linha</label>
              <select [(ngModel)]="newLine" class="eco-input">
                <option value="">Selecione</option>
                <option>307</option>
                <option>412</option>
                <option>215</option>
                <option>550</option>
                <option>Fretado A</option>
              </select>
            </div>
            <div class="fg sm">
              <label>Passageiros</label
              ><input type="number" [(ngModel)]="newCount" min="1" class="eco-input" />
            </div>
            <div class="fg sm">
              <label>Prioridade</label>
              <select [(ngModel)]="newPriority" class="eco-input">
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" (click)="showForm.set(false)">Cancelar</button>
            <button class="btn btn-primary" (click)="addSignal()">📍 Emitir Sinal</button>
          </div>
        </div>
      }

      <!-- Signals list -->
      <div class="signals-grid">
        @for (s of signals(); track s.id) {
          <div class="signal-card" [class]="'pri-' + s.priority">
            <div class="sc-top">
              <div class="sc-prio" [class]="'prio-' + s.priority"></div>
              <div class="sc-stop">{{ s.stop }}</div>
              <span
                class="badge"
                [class]="
                  s.status === 'pendente'
                    ? 'badge-red'
                    : s.status === 'atendido'
                      ? 'badge-green'
                      : 'badge-gray'
                "
              >
                {{ s.status }}
              </span>
            </div>
            <div class="sc-meta">
              <span class="sc-line">🚌 Linha {{ s.line }}</span>
              <span class="sc-count">👥 {{ s.count }} pass.</span>
              <span class="sc-time">🕐 {{ s.time }}</span>
            </div>
            @if (s.status === 'pendente') {
              <div class="sc-actions">
                <button class="btn btn-primary btn-sm" (click)="serve(s.id)">✓ Atender</button>
                <button class="btn btn-ghost btn-sm" (click)="cancel(s.id)">Cancelar</button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 16px;
      }
      .form-row {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .fg {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
        min-width: 160px;
        &.sm {
          max-width: 120px;
        }
      }
      label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-muted);
      }
      .eco-input {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        color: var(--text-primary);
        padding: 9px 12px;
        border-radius: var(--radius-md);
        font-size: 13px;
        font-family: inherit;
        &:focus {
          outline: none;
          border-color: var(--primary);
        }
      }
      .form-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .signals-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 14px;
      }
      .signal-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-left: 4px solid var(--text-muted);
        border-radius: var(--radius-lg);
        padding: 16px;
        transition: all var(--transition);
        &.pri-alta {
          border-left-color: var(--red);
        }
        &.pri-media {
          border-left-color: var(--amber);
        }
        &.pri-baixa {
          border-left-color: var(--text-muted);
        }
      }
      .sc-top {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      .sc-prio {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
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
      .sc-stop {
        flex: 1;
        font-weight: 700;
        font-size: 14px;
        color: var(--text-primary);
      }
      .sc-meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .sc-actions {
        display: flex;
        gap: 8px;
      }
    `,
  ],
})
export class SignalsComponent implements OnInit, OnDestroy {
  showForm = signal(false);
  newStop = '';
  newLine = '307';
  newCount = 1;
  newPriority: 'alta' | 'media' | 'baixa' = 'media';

  signals = signal<Signal[]>([
    {
      id: 1,
      stop: 'Ponto Central',
      line: '307',
      count: 4,
      time: '17:45',
      priority: 'alta',
      status: 'pendente',
    },
    {
      id: 2,
      stop: 'Terminal Norte',
      line: '412',
      count: 2,
      time: '17:31',
      priority: 'media',
      status: 'pendente',
    },
    {
      id: 3,
      stop: 'Av. São Paulo, 450',
      line: '215',
      count: 1,
      time: '17:18',
      priority: 'baixa',
      status: 'pendente',
    },
    {
      id: 4,
      stop: 'Shopping Iguatemi',
      line: '550',
      count: 3,
      time: '16:55',
      priority: 'alta',
      status: 'atendido',
    },
    {
      id: 5,
      stop: 'FACENS',
      line: '307',
      count: 5,
      time: '16:40',
      priority: 'media',
      status: 'atendido',
    },
  ]);

  pendingCount = () => this.signals().filter((s) => s.status === 'pendente').length;
  servedCount = () => this.signals().filter((s) => s.status === 'atendido').length;
  totalPassengers = () =>
    this.signals()
      .filter((s) => s.status === 'pendente')
      .reduce((a, s) => a + s.count, 0);

  private interval: any;
  ngOnInit() {
    this.interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const stops = [
          'Parque das Águas',
          'Largo do Café',
          'Rua XV de Novembro',
          'Av. Afonso Vergueiro',
        ];
        const lines = ['307', '412', '215', '550'];
        this.signals.update((s) => [
          {
            id: Date.now(),
            stop: stops[Math.floor(Math.random() * stops.length)],
            line: lines[Math.floor(Math.random() * lines.length)],
            count: Math.floor(Math.random() * 4) + 1,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            priority: (['alta', 'media', 'baixa'] as const)[Math.floor(Math.random() * 3)],
            status: 'pendente',
          },
          ...s,
        ]);
      }
    }, 6000);
  }
  ngOnDestroy() {
    clearInterval(this.interval);
  }

  addSignal() {
    if (!this.newStop) return;
    this.signals.update((s) => [
      {
        id: Date.now(),
        stop: this.newStop,
        line: this.newLine,
        count: this.newCount,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        priority: this.newPriority,
        status: 'pendente',
      },
      ...s,
    ]);
    this.newStop = '';
    this.showForm.set(false);
  }

  serve(id: number) {
    this.signals.update((s) => s.map((x) => (x.id === id ? { ...x, status: 'atendido' } : x)));
  }
  cancel(id: number) {
    this.signals.update((s) => s.map((x) => (x.id === id ? { ...x, status: 'cancelado' } : x)));
  }
}
