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
import { SupabaseService, WsRole } from '../../services/supabase.service';
import { LocationService, GpsPosition } from '../../services/location.service';

declare const L: any;

interface TrackedPeer {
  clientId: string;
  role: WsRole;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  lastSeen: number;
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
              class="role-btn input-transparent"
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
              class="role-btn input-transparent"
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
              <div class="input-group input-group-sm">
                <span class="input-group-text input-transparent">Nome</span>

                <input
                  type="text"
                  class="form-control input-transparent"
                  placeholder="ex: Carlos Silva"
                  [ngModel]="myName()"
                  (ngModelChange)="myName.set($event)"
                />
              </div>
            </div>
            <div class="lf-group">
              <label>Código da sala</label>

              <div class="input-group">
                <span class="input-group-text input-transparent">🏷️</span>

                <input
                  type="text"
                  class="form-control input-transparent"
                  placeholder="ex: linha-307"
                  [ngModel]="roomCode()"
                  (ngModelChange)="roomCode.set($event)"
                />

                <button class="btn btn-transparent" type="button" (click)="randomRoom()">🎲</button>
              </div>
            </div>
          </div>

          <button
            class="btn btn-primary btn-lg join-btn btn-transparent"
            [disabled]="!canJoin()"
            (click)="join()"
          >
            Entrar na Sala →
          </button>
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
            <div class="card bg-dark ts-card">
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
            <div class="card bg-dark ts-card">
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
                    {{ myName() || 'Você' }} <span class="you-tag">você</span>
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
            <div class="card bg-dark ts-card" id="nosignal">
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
          <div class="map-bottom-sheet" [class.expanded]="mapExpanded">
            <div class="sheet-handle" (click)="toggleMap()"></div>
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
      :host {
        color: #fff;
      }
      :host * {
        color: #fff !important;
      }

      .btn-transparent {
        background: transparent !important;
        color: #fff !important;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      .btn-transparent:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.08);
        border-color: #fff;
      }
      .btn-transparent:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        border-color: rgba(255, 255, 255, 0.2);
      }
      .btn-transparent:focus {
        box-shadow: none;
      }

      .role-btn.input-transparent {
        background: transparent !important;
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
      }
      .role-btn.input-transparent:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.4);
      }
      .role-btn.input-transparent.selected {
        background: rgba(255, 255, 255, 0.1);
        border-color: #fff;
      }

      .input-transparent {
        background-color: transparent !important;
        color: #fff !important;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
      }
      .input-transparent::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }
      .input-transparent:focus {
        background-color: transparent !important;
        color: #fff !important;
        border-color: #fff;
        box-shadow: none;
      }

      .lobby-wrap {
        min-height: calc(100vh - var(--navbar-h));
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
      }
      .lobby-card {
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
        font-size: 14px;
        font-weight: 700;
      }
      .rb-desc {
        font-size: 11px;
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

      .join-btn {
        width: 100%;
        justify-content: center;
        margin-bottom: 14px;
      }
      .join-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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

      /* ── TRACKING ───────────────────────────────────────────── */
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
        font-size: 14px;
        font-weight: 700;
        background: var(--bg-card);
        border: 1px solid var(--border);
        padding: 6px 14px;
        border-radius: 20px;
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
        font-size: 13px;
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
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .peer-role {
        font-size: 10px;
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
        font-size: 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        &:hover {
          background: var(--bg-elevated);
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
        width: 28px;
        height: 28px;
        border-radius: 7px;
        cursor: pointer;
        font-size: 13px;
        &:hover {
          background: rgba(255, 255, 255, 0.15);
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

      .map-bottom-sheet {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        height: 100%; /* ← ocupa a célula do grid */
      }

      .map-bottom-sheet .map-wrap {
        flex: 1;
        position: relative;
        overflow: hidden;
      }

      /* handle só faz sentido no mobile */
      .sheet-handle {
        display: none;
      }

      @media (max-width: 900px) {
        .sheet-handle {
          display: block;
        }
        .track-topbar {
          display: none;
        }
        /* vira bottom sheet */
        .map-bottom-sheet {
          position: fixed;
          left: 0;
          bottom: 0;
          width: 100%;

          height: 35vh;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          border-radius: 16px 16px 0 0;

          z-index: 1500;
          transition: height 0.3s ease;

          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .map-bottom-sheet.expanded {
          height: 100dvh;
        }

        /* barrinha */
        .sheet-handle {
          width: 40px;
          height: 5px;
          background: var(--text-muted);
          border-radius: 10px;
          margin: 8px auto;
          cursor: pointer;
          flex-shrink: 0;
        }

        /* mapa ocupa tudo */
        .map-bottom-sheet .map-wrap {
          flex: 1;
          position: relative;
        }

        .map-bottom-sheet .leaflet-map {
          width: 100%;
          height: 100%;
        }

        /* IMPORTANTÍSSIMO: não deixar o mapa duplicado */
        .tracking-body .map-wrap {
          display: none;
        }

        .map-bottom-sheet .map-wrap {
          display: block;
        }

        /* espaço pro sheet não cobrir conteúdo */
        .tracking-body {
          padding-bottom: 35vh;
        }
      }
    `,
  ],
})
export class TrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  // ── Room info
  roomInfo = computed(() => {
    const drivers = this.peers().filter((p) => p.role === 'driver').length;
    const passengers = this.peers().filter((p) => p.role === 'passenger').length;

    return { drivers, passengers };
  });

  // ── Latência fake (depois dá pra melhorar)
  latency = signal<number>(0);

  // ── Ações UI
  randomRoom(): void {
    this.roomCode.set('linha-' + Math.floor(Math.random() * 1000));
  }
  focusPeer(clientId: string): void {
    const peer = this.trackedPeers[clientId];
    if (!peer || !this.map) return;

    this.map.setView([peer.lat, peer.lng], 16);
  }

  centerOnMe(): void {
    const pos = this.myPosition();
    if (!pos || !this.map) return;

    this.map.setView([pos.lat, pos.lng], 16);
  }

  fitAll(): void {
    if (!this.map) return;

    const L = (window as any).L;
    const bounds = L.latLngBounds([]);

    if (this.myPosition()) {
      bounds.extend([this.myPosition()!.lat, this.myPosition()!.lng]);
    }

    Object.values(this.trackedPeers).forEach((p) => {
      bounds.extend([p.lat, p.lng]);
    });

    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;

  // ── Lobby
  chosenRole = signal<WsRole>('passenger');
  myName = signal('');
  roomCode = signal('');

  // ── Sessão
  joined = signal(false);
  myRole = signal<WsRole | null>(null);
  currentRoom = signal<string | null>(null);

  // ── Estado realtime
  peers = signal<any[]>([]);
  tracking = signal(false);
  myPosition = signal<GpsPosition | null>(null);
  gpsError = signal<string | null>(null);
  signalLog = signal<SignalEvent[]>([]);
  leafletLoaded = signal(false);

  showSignalModal = signal(false);
  signalStop = '';
  signalCount = 1;

  trackedPeers: Record<string, TrackedPeer> = {};

  canJoin = computed(() => {
    return this.roomCode().trim().length > 0;
  });

  // ── Leaflet
  private map: any = null;
  private myMarker: any = null;
  private peerMarkers: Record<string, any> = {};

  private subs: Subscription[] = [];

  constructor(
    private supabase: SupabaseService,
    private loc: LocationService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadLeaflet();

    // 🔥 Receber localização
    this.subs.push(
      this.supabase.location$.subscribe((loc) => {
        if (!loc) return;
        this.zone.run(() => this.onPeerLocation(loc));
      }),

      // 🔥 Receber sinais
      this.supabase.signals$.subscribe((sig) => {
        if (!sig) return;
        this.zone.run(() => this.onSignalReceived(sig));
      }),

      // GPS
      this.loc.position$.subscribe((pos) => {
        if (!pos) return;

        this.zone.run(() => this.myPosition.set(pos));

        if (this.joined()) {
          this.supabase.sendLocation(pos.lat, pos.lng, pos.speed, pos.heading);

          this.updateMyMarker(pos.lat, pos.lng);
        }
      }),

      this.loc.error$.subscribe((err) => this.zone.run(() => this.gpsError.set(err))),

      this.loc.tracking$.subscribe((t) => this.zone.run(() => this.tracking.set(t))),
    );
  }

  ngAfterViewInit(): void {}

  join(): void {
    if (!this.canJoin()) return;

    const name =
      this.myName().trim() || (this.chosenRole() === 'driver' ? 'Motorista' : 'Passageiro');

    const room = this.roomCode().trim();

    this.supabase.connect(room, this.chosenRole(), name);

    this.myRole.set(this.chosenRole());
    this.currentRoom.set(room);
    this.joined.set(true);

    setTimeout(() => this.initMap(), 200);
  }

  leave(): void {
    this.stopTracking();
    this.supabase.disconnect();

    this.joined.set(false);
    this.peers.set([]);

    Object.values(this.peerMarkers).forEach((m) => m?.remove());
    this.peerMarkers = {};
    this.trackedPeers = {};

    this.myMarker?.remove();
    this.map?.remove();
  }

  // ── GPS
  startTracking(): void {
    this.loc.startTracking(2000);
  }

  stopTracking(): void {
    this.loc.stopTracking();
  }

  // ── SIGNAL
  emitSignal(): void {
    if (!this.signalStop.trim()) return;

    const pos = this.myPosition();

    this.supabase.sendSignal(this.signalStop, this.signalCount, pos?.lat, pos?.lng);

    this.showSignalModal.set(false);
    this.signalStop = '';
    this.signalCount = 1;
  }

  mapExpanded = false;

  toggleMap() {
    this.mapExpanded = !this.mapExpanded;
  }
  // ── MAP
  private loadLeaflet(): void {
    if ((window as any).L) {
      this.leafletLoaded.set(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => this.zone.run(() => this.leafletLoaded.set(true));
    document.head.appendChild(script);
  }

  private initMap(): void {
    const el = this.mapContainerRef?.nativeElement;
    if (!el || !(window as any).L || this.map) return;

    const L = (window as any).L;

    this.map = L.map(el).setView([-23.5015, -47.4526], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(this.map);

    // 🔥 ADICIONA ISSO
    const pos = this.myPosition();
    if (pos) {
      this.updateMyMarker(pos.lat, pos.lng);
      this.map.setView([pos.lat, pos.lng], 16);
    }
  }

  private makeIcon(emoji: string, color: string): any {
    const L = (window as any).L;
    return L.divIcon({
      html: `<div style="background:${color}22;border:2px solid ${color};border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;">${emoji}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: '', // ← remove o fundo branco padrão do Leaflet
    });
  }

  private updateMyMarker(lat: number, lng: number): void {
    if (!this.map || !(window as any).L) return;

    const L = (window as any).L;

    const emoji = this.myRole() === 'driver' ? '🚌' : '🧍';
    const color = this.myRole() === 'driver' ? '#00e676' : '#00b4d8';

    if (!this.myMarker) {
      this.myMarker = L.marker([lat, lng], {
        icon: this.makeIcon(emoji, color),
      }).addTo(this.map);

      console.log('🟢 Criou marker próprio');
    } else {
      this.myMarker.setLatLng([lat, lng]);
    }
  }

  private onPeerLocation(loc: any): void {
    const { clientId, role, name, lat, lng, speed, heading } = loc;

    this.trackedPeers[clientId] = {
      clientId,
      role,
      name,
      lat,
      lng,
      speed,
      heading,
      lastSeen: Date.now(),
    };

    // ✅ ATUALIZA LISTA DE PEERS
    this.peers.update((list) => {
      const exists = list.find((p) => p.clientId === clientId);

      if (exists) {
        return list.map((p) => (p.clientId === clientId ? { ...p, role, name } : p));
      }

      return [...list, { clientId, role, name }];
    });

    if (!this.map) return;
    const L = (window as any).L;

    const emoji = role === 'driver' ? '🚌' : '🧍';
    const color = role === 'driver' ? '#00e676' : '#00b4d8';

    if (!this.peerMarkers[clientId]) {
      this.peerMarkers[clientId] = L.marker([lat, lng], {
        icon: this.makeIcon(emoji, color),
      }).addTo(this.map);
    } else {
      this.peerMarkers[clientId].setLatLng([lat, lng]);
    }
  }

  private onSignalReceived(sig: any): void {
    const event: SignalEvent = {
      id: Date.now(),
      name: sig.name,
      stop: sig.stop,
      count: sig.count,
      lat: sig.lat,
      lng: sig.lng,
      time: new Date(sig.timestamp).toLocaleTimeString(),
    };

    this.signalLog.update((log) => [event, ...log]);

    if (this.map && sig.lat && sig.lng) {
      const L = (window as any).L;

      L.marker([sig.lat, sig.lng]).addTo(this.map).bindPopup(`🚨 ${sig.stop}`);
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.stopTracking();
    this.map?.remove();
  }
}
