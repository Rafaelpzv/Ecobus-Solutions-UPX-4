import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RoomService, RoomMeta } from '../../services/room.service';

@Component({
  selector: 'app-room-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lobby-wrap">
      <!-- Background -->
      <div class="entry-bg">
        <div class="bg-orb orb-1"></div>
        <div class="bg-orb orb-2"></div>
        <div class="bg-grid"></div>
      </div>

      <div class="lobby-card">
        <!-- Header -->
        <div class="card-header">
          <a class="back-link" (click)="goBack()">← Início</a>
          <div class="entry-logo">
            <span>🚌</span>
            <span class="logo-text">EcoBus <strong>Solutions</strong></span>
          </div>
        </div>

        <div class="lobby-icon">📡</div>
        <h1>Entrar em uma Sala</h1>
        <p class="card-subtitle">
          Compartilhe sua localização em tempo real com sua equipe. Escolha seu papel e entre em uma
          sala.
        </p>

        <!-- Role -->
        <div class="role-row">
          <button
            class="role-btn"
            [class.selected]="chosenRole() === 'driver'"
            (click)="chosenRole.set('driver')"
          >
            <span class="rb-icon">🚌</span>
            <span class="rb-label">Motorista</span>
            <span class="rb-desc">Compartilha localização<br />com passageiros</span>
            @if (chosenRole() === 'driver') {
              <div class="rb-check">✓</div>
            }
          </button>
          <button
            class="role-btn"
            [class.selected]="chosenRole() === 'passenger'"
            (click)="chosenRole.set('passenger')"
          >
            <span class="rb-icon">🧍</span>
            <span class="rb-label">Passageiro</span>
            <span class="rb-desc">Acompanha motorista<br />no mapa</span>
            @if (chosenRole() === 'passenger') {
              <div class="rb-check">✓</div>
            }
          </button>
        </div>

        <!-- Form -->
        <div class="lobby-form">
          <div class="lf-group">
            <label>Seu nome <span class="optional">(opcional)</span></label>
            <input
              type="text"
              class="eco-input"
              placeholder="ex: Carlos Silva"
              [(ngModel)]="nameInput"
              maxlength="30"
            />
          </div>
          <div class="lf-group">
            <label>Código da sala</label>
            <div class="code-wrap">
              <span class="code-prefix">🏷️</span>
              <input
                type="text"
                class="eco-input code-input"
                [class.error]="validationError()"
                [class.success]="codeInput().length > 2 && !validationError()"
                placeholder="ex: linha-307"
                [ngModel]="codeInput()"
                (ngModelChange)="codeInput.set($event); onCodeChange($event)"
                (keydown.enter)="enter()"
                maxlength="40"
                autocomplete="off"
                spellcheck="false"
              />
              <button class="dice-btn" (click)="generateCode()" title="Gerar código aleatório">
                🎲
              </button>
            </div>
            @if (validationError()) {
              <div class="field-error">⚠️ {{ validationError() }}</div>
            }
            @if (codeInput().length > 2 && !validationError()) {
              <div class="share-hint">
                <span>💡</span>
                <span
                  >Compartilhe o código <strong>{{ normalizedCode() }}</strong> com sua equipe</span
                >
              </div>
            }
            <div class="code-hint">Letras, números, hífens e underlines. Mín. 3 caracteres.</div>
          </div>
        </div>

        <button
          class="join-btn"
          [disabled]="!canEnter()"
          [class.loading]="loading()"
          (click)="enter()"
        >
          @if (loading()) {
            <span class="btn-spinner"></span>
            Conectando...
          } @else {
            Entrar na Sala →
          }
        </button>

        <!-- Recent rooms -->
        @if (recentRooms().length > 0) {
          <div class="recent-section">
            <div class="recent-header">
              <span class="recent-title">Salas recentes</span>
              <button class="clear-btn" (click)="clearRecent()">Limpar</button>
            </div>
            @for (room of recentRooms(); track room.code) {
              <div class="recent-item" (click)="useRecent(room)">
                <div class="ri-icon">{{ room.role === 'driver' ? '🚌' : '🧍' }}</div>
                <div class="ri-info">
                  <div class="ri-code">{{ room.code }}</div>
                  <div class="ri-meta">
                    {{ room.role === 'driver' ? 'Motorista' : 'Passageiro' }}
                    @if (room.name) {
                      · {{ room.name }}
                    }
                    · {{ formatTime(room.lastUsed) }}
                  </div>
                </div>
                <span class="ri-arrow">→</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      * {
        box-sizing: border-box;
      }

      .lobby-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px 16px;
        position: relative;
        overflow: hidden;
        font-family: 'Segoe UI', system-ui, sans-serif;
      }

      /* Background */
      .entry-bg {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
      }
      .bg-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(100px);
        opacity: 0.35;
      }
      .orb-1 {
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, #cc0000, transparent 70%);
        top: -200px;
        right: -100px;
      }
      .orb-2 {
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, #660000, transparent 70%);
        bottom: -100px;
        left: -50px;
      }
      .bg-grid {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
        background-size: 40px 40px;
      }

      /* Card */
      .lobby-card {
        position: relative;
        z-index: 1;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 32px 36px 36px;
        width: 100%;
        max-width: 560px;
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(20px);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
        color: #fff;
      }

      /* Card header */
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
      }
      .back-link {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        transition: color 0.2s;
        &:hover {
          color: #fff;
        }
      }
      .entry-logo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        color: rgba(255, 255, 255, 0.8);
        strong {
          color: #fff;
        }
      }

      .lobby-icon {
        font-size: 48px;
        text-align: center;
        display: block;
        margin-bottom: 12px;
      }

      h1 {
        font-size: 26px;
        font-weight: 800;
        color: #fff;
        text-align: center;
        margin: 0 0 10px;
      }
      .card-subtitle {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
        text-align: center;
        line-height: 1.6;
        margin: 0 0 28px;
      }

      /* Role buttons */
      .role-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 24px;
      }
      .role-btn {
        background: rgba(255, 255, 255, 0.04);
        border: 2px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        padding: 16px 12px;
        text-align: center;
        cursor: pointer;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
        color: rgba(255, 255, 255, 0.7);
        &:hover {
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.07);
          color: #fff;
        }
        &.selected {
          border-color: #cc2200;
          background: rgba(204, 34, 0, 0.12);
          color: #fff;
        }
      }
      .rb-icon {
        font-size: 28px;
      }
      .rb-label {
        font-size: 14px;
        font-weight: 700;
        color: #fff;
      }
      .rb-desc {
        font-size: 11px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.45);
      }
      .rb-check {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #cc2200;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      /* Form */
      .lobby-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-bottom: 20px;
      }
      .lf-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: rgba(255, 255, 255, 0.4);
      }
      .optional {
        font-weight: 400;
        text-transform: none;
        letter-spacing: 0;
        color: rgba(255, 255, 255, 0.25);
      }

      .eco-input {
        background: rgba(255, 255, 255, 0.06);
        border: 1.5px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 15px;
        font-family: inherit;
        width: 100%;
        transition: all 0.2s;
        &::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }
        &:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.08);
        }
        &.error {
          border-color: #ff4444;
        }
        &.success {
          border-color: #00cc66;
        }
      }

      .code-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }
      .code-prefix {
        position: absolute;
        left: 14px;
        font-size: 15px;
        pointer-events: none;
        z-index: 1;
      }
      .code-input {
        padding-left: 42px;
        padding-right: 48px;
        font-family: 'Courier New', monospace;
        font-size: 15px;
        letter-spacing: 0.5px;
      }
      .dice-btn {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.5;
        transition:
          opacity 0.2s,
          transform 0.2s;
        &:hover {
          opacity: 1;
          transform: rotate(20deg);
        }
      }
      .field-error {
        font-size: 12px;
        color: #ff6666;
        margin-top: 4px;
      }
      .share-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
        margin-top: 5px;
        strong {
          color: rgba(255, 255, 255, 0.7);
        }
      }
      .code-hint {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.2);
        margin-top: 3px;
      }

      /* Join button */
      .join-btn {
        width: 100%;
        padding: 14px;
        border-radius: 14px;
        border: none;
        background: linear-gradient(135deg, #cc2200, #ff4422);
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
        margin-bottom: 24px;
        letter-spacing: 0.3px;
        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(204, 34, 0, 0.4);
        }
        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }
      .btn-spinner {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #fff;
        animation: spin 0.7s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Recent rooms */
      .recent-section {
        border-top: 1px solid rgba(255, 255, 255, 0.07);
        padding-top: 16px;
      }
      .recent-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .recent-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: rgba(255, 255, 255, 0.35);
      }
      .clear-btn {
        background: none;
        border: none;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: color 0.2s;
        &:hover {
          color: rgba(255, 255, 255, 0.6);
        }
      }
      .recent-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        cursor: pointer;
        transition: all 0.15s;
        margin-bottom: 6px;
        &:last-child {
          margin-bottom: 0;
        }
        &:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }
      }
      .ri-icon {
        font-size: 18px;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .ri-info {
        flex: 1;
        min-width: 0;
      }
      .ri-code {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        font-family: 'Courier New', monospace;
      }
      .ri-meta {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.3);
        margin-top: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ri-arrow {
        color: rgba(255, 255, 255, 0.25);
        font-size: 13px;
      }
    `,
  ],
})
export class RoomEntryComponent implements OnInit {
  chosenRole = signal<'driver' | 'passenger'>('passenger');
  codeInput = signal('');
  nameInput = '';
  loading = signal(false);

  validationError = signal<string | null>(null);

  normalizedCode = computed(() => this.roomService.normalizeCode(this.codeInput()));

  canEnter = computed(() => {
    const validation = this.roomService.validateCode(this.codeInput());
    return validation.valid && !this.loading();
  });

  recentRooms = computed(() => this.roomService.recentRooms());

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private roomService: RoomService,
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('codigo');
    if (code) {
      this.codeInput.set(code);
    }
  }

  onCodeChange(value: string): void {
    const result = this.roomService.validateCode(value);
    this.validationError.set(result.valid || !value ? null : (result.error ?? null));
  }

  generateCode(): void {
    this.codeInput.set(this.roomService.generateCode());
    this.validationError.set(null);
  }

  enter(): void {
    if (!this.canEnter()) return;

    const validation = this.roomService.validateCode(this.codeInput());
    if (!validation.valid) {
      this.validationError.set(validation.error ?? 'Código inválido');
      return;
    }

    this.loading.set(true);
    const normalized = this.roomService.normalizeCode(this.codeInput());
    const name =
      this.nameInput.trim() || (this.chosenRole() === 'driver' ? 'Motorista' : 'Passageiro');

    this.roomService.enterRoom(normalized, this.chosenRole(), name);

    setTimeout(() => {
      this.router.navigate(['/rastreamento', normalized], {
        queryParams: { role: this.chosenRole(), name },
      });
    }, 600);
  }

  useRecent(room: RoomMeta): void {
    this.codeInput.set(room.code);
    this.chosenRole.set(room.role);
    this.nameInput = room.name;
    this.validationError.set(null);
  }

  clearRecent(): void {
    this.roomService.clearRecent();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  formatTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 2) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  }
}
