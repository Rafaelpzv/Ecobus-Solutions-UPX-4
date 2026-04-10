import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  WebSocketService,
  WsRole,
  LocationPayload,
  SignalPayload,
  PeerInfo,
} from '../../services/websocket.service';
import { LocationService, GpsPosition } from '../../services/location.service';

declare const L: any; // Leaflet loaded via CDN

interface TrackedPeer {
  clientId: string;
  role: WsRole;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  lastSeen: number;
  marker?: any;
}

interface SignalEvent {
  id: number;
  name: string;
  stop: string;
  count: number;
  lat?: number;
  lng?: number;
  time: string;
}

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ═══════════════════════ LOBBY (role not chosen) ═══════════════════════ -->
    @if (!joined()) {
      <div class="lobby-wrap anim-fade-up">
        <div class="lobby-card">
          <div class="lobby-icon">📡</div>
          <h1>Rastreamento ao Vivo</h1>
          <p>
            Compartilhe sua localização em tempo real com sua equipe. Escolha seu papel e entre em
            uma sala.
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

          <!-- Name + Room -->
          <div class="lobby-form">
            <div class="lf-group">
              <label>Seu nome</label>
              <input
                [(ngModel)]="myName"
                placeholder="ex: Carlos Silva"
                class="eco-input"
                maxlength="30"
              />
            </div>
            <div class="lf-group">
              <label>Código da sala</label>
              <div class="room-row">
                <input
                  [(ngModel)]="roomCode"
                  placeholder="ex: linha-307"
                  class="eco-input"
                  maxlength="20"
                />
                <button class="btn btn-ghost btn-sm" (click)="randomRoom()">🎲</button>
              </div>
            </div>
          </div>

          <!-- WS URL -->
          <details class="adv-details">
            <summary>Configurações avançadas</summary>
            <div class="lf-group" style="margin-top:10px">
              <label>WebSocket URL</label>
              <input [(ngModel)]="wsUrl" class="eco-input" placeholder="ws://localhost:8080" />
            </div>
          </details>

          @if (wsStatus() === 'error' || wsStatus() === 'disconnected') {
            <div class="lobby-warn">
              ⚠️ Servidor WebSocket não encontrado em <strong>{{ wsUrl }}</strong
              >. Certifique-se que o servidor está rodando (<code>cd server && npm start</code>).
            </div>
          }

          <button class="btn btn-primary btn-lg join-btn" [disabled]="!canJoin()" (click)="join()">
            @if (wsStatus() === 'connecting') {
              Conectando…
            } @else {
              Entrar na Sala →
            }
          </button>

          <div class="status-row">
            <div class="status-dot" [class]="'dot-' + wsStatus()"></div>
            <span>{{ statusLabel() }}</span>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════ TRACKING VIEW ════════════════════════════════ -->
    @if (joined()) {
      <div class="tracking-layout anim-fade">
        <!-- Top bar -->
        <div class="track-topbar">
          <div class="tb-room">
            <div class="room-badge">
              <span class="room-icon">{{ myRole() === 'driver' ? '🚌' : '🧍' }}</span>
              <span>{{ myRole() === 'driver' ? 'Motorista' : 'Passageiro' }}</span>
              <span class="room-sep">·</span>
              <span class="room-name">{{ currentRoom() }}</span>
            </div>
          </div>

          <div class="tb-stats">
            <div class="tbs-item">
              <span class="tbs-val">{{ peers().length }}</span>
              <span class="tbs-lbl">Peers</span>
            </div>
            <div class="tbs-item">
              <span class="tbs-val tbs-green">{{ roomInfo().drivers }}</span>
              <span class="tbs-lbl">Motoristas</span>
            </div>
            <div class="tbs-item">
              <span class="tbs-val tbs-teal">{{ roomInfo().passengers }}</span>
              <span class="tbs-lbl">Passageiros</span>
            </div>
            <div class="tbs-item">
              <span class="tbs-val">{{ latency() }}ms</span>
              <span class="tbs-lbl">Latência</span>
            </div>
          </div>

          <div class="tb-actions">
            @if (!tracking()) {
              <button class="btn btn-primary btn-sm" (click)="startTracking()">
                📍 Iniciar GPS
              </button>
            } @else {
              <button class="btn btn-danger btn-sm" (click)="stopTracking()">⏹ Parar GPS</button>
            }
            @if (myRole() === 'passenger') {
              <button class="btn btn-outline btn-sm" (click)="showSignalModal.set(true)">
                🚨 Emitir Sinal
              </button>
            }
            <button class="btn btn-ghost btn-sm" (click)="leave()">Sair</button>
          </div>
        </div>

        <!-- GPS banner -->
        @if (gpsError()) {
          <div class="gps-error-bar">⚠️ {{ gpsError() }}</div>
        }

        <div class="tracking-body">
          <!-- Sidebar -->
          <div class="track-sidebar">
            <!-- My position -->
            <div class="card ts-card">
              <div class="ts-header">
                <span>Minha Posição</span>
                <div class="pulse-dot" [style.display]="tracking() ? 'block' : 'none'"></div>
              </div>
              @if (myPosition()) {
                <div class="my-pos">
                  <div class="pos-coord">📍 {{ myPosition()!.lat | number: '1.5-5' }}°</div>
                  <div class="pos-coord">📍 {{ myPosition()!.lng | number: '1.5-5' }}°</div>
                  <div class="pos-detail">
                    <span>⚡ {{ myPosition()!.speed * 3.6 | number: '1.0-0' }} km/h</span>
                    <span>🎯 ±{{ myPosition()!.accuracy | number: '1.0-0' }}m</span>
                  </div>
                </div>
              } @else {
                <div class="no-pos">
                  <span>GPS inativo</span>
                  <button
                    class="btn btn-primary btn-sm"
                    style="margin-top:8px"
                    (click)="startTracking()"
                  >
                    Ativar GPS
                  </button>
                </div>
              }
            </div>

            <!-- Peers list -->
            <div class="card ts-card">
              <div class="ts-header">
                <span>Usuários na Sala</span>
                <span class="badge badge-teal">{{ peers().length + 1 }}</span>
              </div>

              <!-- Myself -->
              <div class="peer-item me">
                <div class="peer-avatar" [class]="myRole() === 'driver' ? 'av-green' : 'av-teal'">
                  {{ myRole() === 'driver' ? '🚌' : '🧍' }}
                </div>
                <div class="peer-info">
                  <div class="peer-name">
                    {{ myName || 'Você' }} <span class="you-tag">você</span>
                  </div>
                  <div class="peer-role">
                    {{ myRole() === 'driver' ? 'Motorista' : 'Passageiro' }}
                  </div>
                </div>
                <div class="peer-status">
                  <div
                    class="status-dot"
                    [class]="'dot-' + (tracking() ? 'connected' : 'disconnected')"
                  ></div>
                </div>
              </div>

              @for (peer of peers(); track peer.clientId) {
                <div class="peer-item" (click)="focusPeer(peer.clientId)">
                  <div
                    class="peer-avatar"
                    [class]="peer.role === 'driver' ? 'av-green' : 'av-teal'"
                  >
                    {{ peer.role === 'driver' ? '🚌' : '🧍' }}
                  </div>
                  <div class="peer-info">
                    <div class="peer-name">{{ peer.name }}</div>
                    <div class="peer-role">
                      {{ peer.role === 'driver' ? 'Motorista' : 'Passageiro' }}
                    </div>
                  </div>
                  <div class="peer-speed">
                    @if ((trackedPeers[peer.clientId]?.speed ?? 0) > 0) {
                      {{ trackedPeers[peer.clientId].speed * 3.6 | number: '1.0-0' }} km/h
                    } @else {
                      Parado
                    }
                  </div>
                </div>
              }

              @if (peers().length === 0) {
                <div class="no-peers">
                  Nenhum outro usuário na sala.<br />Compartilhe o código:
                  <strong>{{ currentRoom() }}</strong>
                </div>
              }
            </div>

            <!-- Signal log -->
            <div class="card ts-card">
              <div class="ts-header">
                <span>Sinais Recebidos</span>
                @if (signalLog().length > 0) {
                  <span class="badge badge-red">{{ signalLog().length }}</span>
                }
              </div>
              @for (s of signalLog(); track s.id) {
                <div class="signal-log-item">
                  <div class="sli-top">
                    <span class="sli-name">{{ s.name }}</span>
                    <span class="sli-time">{{ s.time }}</span>
                  </div>
                  <div class="sli-stop">📍 {{ s.stop }}</div>
                  <div class="sli-count">{{ s.count }} passageiro(s)</div>
                </div>
              }
              @if (signalLog().length === 0) {
                <div class="no-peers">Nenhum sinal emitido ainda</div>
              }
            </div>
          </div>

          <!-- Map -->
          <div class="map-wrap">
            <div #mapContainer class="leaflet-map"></div>

            <!-- Map overlays -->
            <div class="map-overlay-tl">
              <button class="map-btn" title="Centralizar minha posição" (click)="centerOnMe()">
                ⊙
              </button>
              <button class="map-btn" title="Ver todos" (click)="fitAll()">⤢</button>
            </div>

            @if (!leafletLoaded()) {
              <div class="map-loading">
                <div class="ml-spinner"></div>
                <span>Carregando mapa…</span>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════ SIGNAL MODAL ════════════════════════════════ -->
    @if (showSignalModal()) {
      <div class="modal-overlay" (click)="showSignalModal.set(false)">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>🚨 Emitir Sinal de Embarque</h2>
            <button class="close-btn" (click)="showSignalModal.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div class="lf-group">
              <label>Nome do Ponto</label>
              <input
                [(ngModel)]="signalStop"
                placeholder="ex: Av. São Paulo, 450"
                class="eco-input"
              />
            </div>
            <div class="lf-group">
              <label>Número de passageiros</label>
              <input type="number" [(ngModel)]="signalCount" min="1" max="50" class="eco-input" />
            </div>
            <div class="signal-loc-info">
              @if (myPosition()) {
                <span class="badge badge-green">📍 Localização GPS será incluída</span>
              } @else {
                <span class="badge badge-gray">⚠️ GPS inativo — localização não incluída</span>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="showSignalModal.set(false)">Cancelar</button>
            <button class="btn btn-primary" (click)="emitSignal()">Enviar Sinal</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      /* ── LOBBY ─────────────────────────────────────────────────────── */
      .lobby-wrap {
        min-height: calc(100vh - var(--navbar-h));
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        background: radial-gradient(
          ellipse at 50% 40%,
          rgba(0, 230, 118, 0.05) 0%,
          transparent 70%
        );
      }
      .lobby-card {
        background: var(--bg-card);
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-xl);
        padding: 40px;
        width: 100%;
        max-width: 540px;
        box-shadow: var(--shadow-card);
        text-align: center;
      }
      .lobby-icon {
        font-size: 48px;
        margin-bottom: 16px;
        display: block;
      }
      .lobby-card h1 {
        font-size: 26px;
        font-weight: 800;
        margin-bottom: 10px;
      }
      .lobby-card > p {
        color: var(--text-secondary);
        font-size: 14px;
        margin-bottom: 28px;
        line-height: 1.6;
      }

      .role-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 24px;
      }
      .role-btn {
        background: var(--bg-surface);
        border: 2px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 16px 12px;
        text-align: center;
        cursor: pointer;
        position: relative;
        transition: all var(--transition);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        &:hover {
          border-color: rgba(0, 230, 118, 0.4);
          background: var(--bg-elevated);
        }
        &.selected {
          border-color: var(--primary);
          background: var(--primary-soft);
        }
      }
      .rb-icon {
        font-size: 28px;
      }
      .rb-label {
        font-family: 'Exo 2', sans-serif;
        font-size: 14px;
        font-weight: 700;
        color: var(--text-primary);
      }
      .rb-desc {
        font-size: 11px;
        color: var(--text-muted);
        line-height: 1.4;
      }
      .rb-check {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--primary);
        color: var(--text-inverse);
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .lobby-form {
        text-align: left;
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
        color: var(--text-muted);
      }
      .eco-input {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        color: var(--text-primary);
        padding: 10px 14px;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-family: inherit;
        transition: border-color var(--transition);
        width: 100%;
        &:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-soft);
        }
      }
      .room-row {
        display: flex;
        gap: 8px;
      }
      .room-row .eco-input {
        flex: 1;
      }

      .adv-details {
        text-align: left;
        margin-bottom: 16px;
        summary {
          font-size: 12px;
          color: var(--text-muted);
          cursor: pointer;
        }
      }

      .lobby-warn {
        background: rgba(255, 214, 0, 0.08);
        border: 1px solid rgba(255, 214, 0, 0.2);
        border-radius: var(--radius-md);
        padding: 12px 16px;
        font-size: 12px;
        color: var(--amber);
        text-align: left;
        margin-bottom: 16px;
        code {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
      }

      .join-btn {
        width: 100%;
        justify-content: center;
        margin-bottom: 14px;
      }
      .join-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .status-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        &.dot-connected {
          background: var(--primary);
        }
        &.dot-connecting {
          background: var(--amber);
          animation: pulse 1s infinite;
        }
        &.dot-disconnected {
          background: var(--text-muted);
        }
        &.dot-error {
          background: var(--red);
        }
      }

      /* ── TRACKING VIEW ─────────────────────────────────────────────── */
      .tracking-layout {
        display: flex;
        flex-direction: column;
        height: calc(100vh - var(--navbar-h));
        overflow: hidden;
      }

      .track-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        background: var(--bg-surface);
        border-bottom: 1px solid var(--border);
        padding: 12px 24px;
        flex-shrink: 0;
      }
      .room-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'Exo 2', sans-serif;
        font-size: 14px;
        font-weight: 700;
        background: var(--bg-card);
        border: 1px solid var(--border);
        padding: 6px 14px;
        border-radius: 20px;
        color: var(--text-primary);
      }
      .room-icon {
        font-size: 16px;
      }
      .room-sep {
        color: var(--text-muted);
      }
      .room-name {
        color: var(--primary);
      }
      .tb-stats {
        display: flex;
        gap: 20px;
      }
      .tbs-item {
        text-align: center;
      }
      .tbs-val {
        display: block;
        font-family: 'Exo 2', sans-serif;
        font-size: 18px;
        font-weight: 800;
        color: var(--text-primary);
      }
      .tbs-green {
        color: var(--primary) !important;
      }
      .tbs-teal {
        color: var(--teal) !important;
      }
      .tbs-lbl {
        font-size: 10px;
        color: var(--text-muted);
        text-transform: uppercase;
      }
      .tb-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .gps-error-bar {
        background: rgba(255, 82, 82, 0.1);
        border-bottom: 1px solid rgba(255, 82, 82, 0.2);
        color: var(--red);
        font-size: 13px;
        padding: 8px 24px;
        flex-shrink: 0;
      }

      .tracking-body {
        display: grid;
        grid-template-columns: 300px 1fr;
        flex: 1;
        overflow: hidden;
      }

      /* Sidebar */
      .track-sidebar {
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: var(--bg-surface);
        border-right: 1px solid var(--border);
      }
      .ts-card {
        padding: 14px !important;
      }
      .ts-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-muted);
      }

      .my-pos .pos-coord {
        font-family: 'Exo 2', sans-serif;
        font-size: 13px;
        color: var(--text-primary);
        font-weight: 600;
      }
      .my-pos .pos-detail {
        display: flex;
        gap: 12px;
        margin-top: 6px;
        font-size: 11px;
        color: var(--text-secondary);
      }
      .no-pos {
        text-align: center;
        font-size: 12px;
        color: var(--text-muted);
        padding: 8px 0;
      }

      .peer-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: var(--radius-md);
        border: 1px solid transparent;
        transition: all var(--transition);
        cursor: pointer;
        &:hover:not(.me) {
          background: var(--bg-elevated);
          border-color: var(--border);
        }
        &.me {
          background: var(--primary-soft);
          border-color: rgba(0, 230, 118, 0.15);
          cursor: default;
        }
      }
      .peer-avatar {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        flex-shrink: 0;
        &.av-green {
          background: rgba(0, 230, 118, 0.15);
        }
        &.av-teal {
          background: rgba(0, 180, 216, 0.15);
        }
      }
      .peer-info {
        flex: 1;
        min-width: 0;
      }
      .peer-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .peer-role {
        font-size: 10px;
        color: var(--text-muted);
      }
      .you-tag {
        font-size: 9px;
        background: var(--primary-soft);
        color: var(--primary);
        padding: 1px 5px;
        border-radius: 4px;
        margin-left: 4px;
      }
      .peer-speed {
        font-size: 11px;
        color: var(--text-secondary);
        white-space: nowrap;
      }
      .no-peers {
        font-size: 12px;
        color: var(--text-muted);
        padding: 8px 0;
        line-height: 1.5;
      }

      .signal-log-item {
        padding: 8px;
        border-radius: var(--radius-md);
        background: var(--bg-surface);
        border: 1px solid var(--border);
        margin-bottom: 6px;
      }
      .sli-top {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
      }
      .sli-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .sli-time {
        font-size: 10px;
        color: var(--text-muted);
      }
      .sli-stop {
        font-size: 11px;
        color: var(--text-secondary);
      }
      .sli-count {
        font-size: 11px;
        color: var(--primary);
        font-weight: 600;
      }

      /* Map */
      .map-wrap {
        position: relative;
        overflow: hidden;
      }
      .leaflet-map {
        width: 100%;
        height: 100%;
      }
      .map-overlay-tl {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .map-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        color: var(--text-secondary);
        font-size: 15px;
        cursor: pointer;
        transition: all var(--transition);
        display: flex;
        align-items: center;
        justify-content: center;
        &:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }
      }
      .map-loading {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--bg-card);
        gap: 12px;
        font-size: 14px;
        color: var(--text-muted);
        z-index: 2000;
      }
      .ml-spinner {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid var(--border);
        border-top-color: var(--primary);
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Modal (reuse) */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 2000;
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
        max-width: 440px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
        animation: fadeInUp 0.3s ease;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 20px 0;
        h2 {
          font-size: 17px;
        }
      }
      .close-btn {
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: var(--text-muted);
        width: 28px;
        height: 28px;
        border-radius: 7px;
        cursor: pointer;
        font-size: 13px;
        transition: all var(--transition);
        &:hover {
          background: rgba(255, 255, 255, 0.15);
          color: var(--text-primary);
        }
      }
      .modal-body {
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 14px 20px;
        border-top: 1px solid var(--border);
      }
      .signal-loc-info {
        padding-top: 4px;
      }

      @media (max-width: 900px) {
        .tracking-body {
          grid-template-columns: 1fr;
          grid-template-rows: 320px 1fr;
        }
        .track-sidebar {
          overflow-y: visible;
          flex-direction: row;
          flex-wrap: nowrap;
          overflow-x: auto;
          height: auto;
        }
        .ts-card {
          min-width: 240px;
        }
      }
    `,
  ],
})
export class TrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;

  // ── Lobby state ────────────────────────────────────────────────────────────
  chosenRole = signal<WsRole>('passenger');
  myName = '';
  roomCode = '';
  wsUrl = 'ws://localhost:8080';

  // ── Session state ──────────────────────────────────────────────────────────
  joined = signal(false);
  myRole = signal<WsRole | null>(null);
  currentRoom = signal<string | null>(null);
  clientId = signal<string | null>(null);

  // ── Realtime state ─────────────────────────────────────────────────────────
  wsStatus = signal<string>('disconnected');
  peers = signal<PeerInfo[]>([]);
  roomInfo = signal<{ drivers: number; passengers: number }>({ drivers: 0, passengers: 0 });
  latency = signal(0);
  tracking = signal(false);
  myPosition = signal<GpsPosition | null>(null);
  gpsError = signal<string | null>(null);
  signalLog = signal<SignalEvent[]>([]);
  leafletLoaded = signal(false);

  showSignalModal = signal(false);
  signalStop = '';
  signalCount = 1;

  trackedPeers: Record<string, TrackedPeer> = {};

  canJoin = computed(
    () => !!this.chosenRole() && !!this.roomCode.trim() && this.wsStatus() === 'connected',
  );
  statusLabel = computed(
    () =>
      ({
        connected: 'Servidor conectado',
        connecting: 'Conectando ao servidor…',
        disconnected: 'Servidor desconectado',
        error: 'Erro de conexão',
      })[this.wsStatus()] ?? '',
  );

  // ── Leaflet ────────────────────────────────────────────────────────────────
  private map: any = null;
  private myMarker: any = null;
  private peerMarkers: Record<string, any> = {};
  private signalMarkers: any[] = [];

  private subs: Subscription[] = [];

  constructor(
    private ws: WebSocketService,
    private loc: LocationService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadLeaflet();

    // Subscribe to WS streams
    this.subs.push(
      this.ws.status$.subscribe((s) => this.zone.run(() => this.wsStatus.set(s))),
      this.ws.peers$.subscribe((p) => this.zone.run(() => this.peers.set(p))),
      this.ws.roomInfo$.subscribe((r) => this.zone.run(() => this.roomInfo.set(r))),
      this.ws.latency$.subscribe((l) => this.zone.run(() => this.latency.set(l))),
      this.ws.clientId$.subscribe((id) => this.zone.run(() => this.clientId.set(id))),

      this.ws.messages$.subscribe((msg) => {
        if (msg['type'] === 'joined') {
          this.zone.run(() => {
            this.myRole.set(msg['role']);
            this.currentRoom.set(msg['room']);
            this.joined.set(true);
          });
          setTimeout(() => this.initMap(), 200);
        }
      }),

      this.ws.locations$.subscribe((loc) => this.zone.run(() => this.onPeerLocation(loc as any))),

      this.ws.signals$.subscribe((sig) => this.zone.run(() => this.onSignalReceived(sig as any))),

      this.ws.peerLeft$.subscribe((msg) => {
        const id = msg['clientId'];
        if (this.peerMarkers[id]) {
          this.peerMarkers[id].remove();
          delete this.peerMarkers[id];
        }
        delete this.trackedPeers[id];
      }),

      // GPS → WS
      this.loc.position$.subscribe((pos) => {
        if (!pos) return;
        this.zone.run(() => this.myPosition.set(pos));
        if (this.joined()) {
          this.ws.sendLocation(pos.lat, pos.lng, pos.speed, pos.heading, pos.accuracy);
          this.updateMyMarker(pos.lat, pos.lng);
        }
      }),

      this.loc.error$.subscribe((err) => this.zone.run(() => this.gpsError.set(err))),
      this.loc.tracking$.subscribe((t) => this.zone.run(() => this.tracking.set(t))),
    );

    this.ws.connect(this.wsUrl);
  }

  ngAfterViewInit(): void {}

  // ── Lobby actions ──────────────────────────────────────────────────────────
  join(): void {
    if (!this.canJoin()) return;
    const name =
      this.myName.trim() || (this.chosenRole() === 'driver' ? 'Motorista' : 'Passageiro');
    this.ws.joinRoom(this.roomCode.trim(), this.chosenRole(), name);
  }

  leave(): void {
    this.stopTracking();
    this.ws.disconnect();
    this.joined.set(false);
    this.peers.set([]);
    Object.values(this.peerMarkers).forEach((m) => m?.remove());
    this.peerMarkers = {};
    this.trackedPeers = {};
    this.myMarker?.remove();
    this.myMarker = null;
    this.map?.remove();
    this.map = null;
    this.leafletLoaded.set(false);
    this.ws.connect(this.wsUrl);
  }

  randomRoom(): void {
    const prefixes = ['linha', 'rota', 'bus', 'turno', 'corrida'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    this.roomCode = `${prefix}-${Math.floor(Math.random() * 900) + 100}`;
  }

  // ── GPS ────────────────────────────────────────────────────────────────────
  startTracking(): void {
    this.loc.startTracking(2000);
  }
  stopTracking(): void {
    this.loc.stopTracking();
  }

  // ── Signal ─────────────────────────────────────────────────────────────────
  emitSignal(): void {
    if (!this.signalStop.trim()) return;
    const pos = this.myPosition();
    this.ws.sendSignal(this.signalStop, this.signalCount, pos?.lat, pos?.lng);
    this.showSignalModal.set(false);
    this.signalStop = '';
    this.signalCount = 1;
  }

  // ── Map ────────────────────────────────────────────────────────────────────
  private loadLeaflet(): void {
    if ((window as any).L) {
      this.leafletLoaded.set(true);
      return;
    }

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => this.zone.run(() => this.leafletLoaded.set(true));
    document.head.appendChild(script);
  }

  private initMap(): void {
    const el = this.mapContainerRef?.nativeElement;
    if (!el || !(window as any).L || this.map) return;

    const L = (window as any).L;

    // Dark-style tile
    this.map = L.map(el, { zoomControl: false }).setView([-23.5015, -47.4526], 13); // Sorocaba

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19,
    }).addTo(this.map);

    // Add zoom control (bottom right)
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.leafletLoaded.set(true);
  }

  private makeIcon(emoji: string, color: string): any {
    const L = (window as any).L;
    return L.divIcon({
      html: `<div style="
        background:${color}22;
        border:2px solid ${color};
        border-radius:50%;
        width:36px;height:36px;
        display:flex;align-items:center;justify-content:center;
        font-size:18px;
        box-shadow:0 0 12px ${color}66;
      ">${emoji}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: '',
    });
  }

  private updateMyMarker(lat: number, lng: number): void {
    if (!this.map) return;
    const L = (window as any).L;
    const emoji = this.myRole() === 'driver' ? '🚌' : '🧍';
    const color = this.myRole() === 'driver' ? '#00e676' : '#00b4d8';

    if (!this.myMarker) {
      this.myMarker = L.marker([lat, lng], { icon: this.makeIcon(emoji, color) })
        .addTo(this.map)
        .bindPopup(
          `<b>${this.myName || 'Você'}</b><br>${this.myRole() === 'driver' ? 'Motorista' : 'Passageiro'}`,
        );
    } else {
      this.myMarker.setLatLng([lat, lng]);
    }
  }

  private onPeerLocation(loc: LocationPayload): void {
    const { clientId, role, name, lat, lng, speed } = loc;

    this.trackedPeers[clientId] = {
      clientId,
      role,
      name,
      lat,
      lng,
      speed,
      heading: loc.heading,
      lastSeen: Date.now(),
    };

    if (!this.map) return;
    const L = (window as any).L;
    const emoji = role === 'driver' ? '🚌' : '🧍';
    const color = role === 'driver' ? '#00e676' : '#00b4d8';

    if (!this.peerMarkers[clientId]) {
      this.peerMarkers[clientId] = L.marker([lat, lng], { icon: this.makeIcon(emoji, color) })
        .addTo(this.map)
        .bindPopup(
          `<b>${name}</b><br>${role === 'driver' ? 'Motorista' : 'Passageiro'}<br>${(speed * 3.6).toFixed(0)} km/h`,
        );
    } else {
      this.peerMarkers[clientId].setLatLng([lat, lng]);
      this.peerMarkers[clientId]
        .getPopup()
        ?.setContent(
          `<b>${name}</b><br>${role === 'driver' ? 'Motorista' : 'Passageiro'}<br>${(speed * 3.6).toFixed(0)} km/h`,
        );
    }
  }

  private onSignalReceived(sig: SignalPayload): void {
    const event: SignalEvent = {
      id: Date.now(),
      name: sig.name,
      stop: sig.stop,
      count: sig.count,
      lat: sig.lat,
      lng: sig.lng,
      time: new Date(sig.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    this.signalLog.update((log) => [event, ...log].slice(0, 20));

    // Pin on map
    if (this.map && sig.lat && sig.lng) {
      const L = (window as any).L;
      const icon = L.divIcon({
        html: `<div style="background:rgba(255,82,82,0.2);border:2px solid #ff5252;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;animation:pulse 1.5s infinite">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: '',
      });
      const m = L.marker([sig.lat, sig.lng], { icon })
        .addTo(this.map)
        .bindPopup(`<b>Sinal: ${sig.stop}</b><br>${sig.count} passageiro(s)<br>por ${sig.name}`)
        .openPopup();
      this.signalMarkers.push(m);
      setTimeout(() => m.closePopup(), 5000);
    }
  }

  centerOnMe(): void {
    const pos = this.myPosition();
    if (this.map && pos) this.map.setView([pos.lat, pos.lng], 16);
  }

  fitAll(): void {
    if (!this.map) return;
    const L = (window as any).L;
    const bounds: [number, number][] = [];
    const pos = this.myPosition();
    if (pos) bounds.push([pos.lat, pos.lng]);
    for (const p of Object.values(this.trackedPeers)) bounds.push([p.lat, p.lng]);
    if (bounds.length > 0) this.map.fitBounds(bounds, { padding: [40, 40] });
  }

  focusPeer(clientId: string): void {
    const peer = this.trackedPeers[clientId];
    if (this.map && peer) this.map.setView([peer.lat, peer.lng], 16);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.stopTracking();
    this.map?.remove();
  }
}
