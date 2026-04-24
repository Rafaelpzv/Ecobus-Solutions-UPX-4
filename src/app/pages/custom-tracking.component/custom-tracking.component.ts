import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SupabaseService, WsRole } from '../../services/supabase.service';
import { LocationService, GpsPosition } from '../../services/location.service';
import { RoomService } from '../../services/room.service';

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

type PageState = 'loading' | 'connected' | 'error';

@Component({
  selector: 'app-custom-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ─── LOADING STATE ───────────────────────────────────────────────── -->
    @if (pageState() === 'loading') {
      <div class="state-screen">
        <div class="state-card">
          <div class="spinner-ring"></div>
          <h3>Conectando à sala</h3>
          <p class="state-code">{{ roomCode() }}</p>
          <p class="state-hint">Estabelecendo conexão em tempo real…</p>
        </div>
      </div>
    }

    <!-- ─── ERROR STATE ──────────────────────────────────────────────────── -->
    @if (pageState() === 'error') {
      <div class="state-screen">
        <div class="state-card error-card">
          <div class="state-icon">⚠️</div>
          <h3>Falha na conexão</h3>
          <p class="state-hint">{{ errorMessage() }}</p>
          <button class="retry-btn" (click)="reconnect()">Tentar novamente</button>
          <button class="back-btn" (click)="leave()">← Voltar</button>
        </div>
      </div>
    }

    <!-- ─── CONNECTED STATE ─────────────────────────────────────────────── -->
    @if (pageState() === 'connected') {
      <div class="tracking-shell">
        <!-- Top bar -->
        <header class="topbar">
          <div class="tb-left">
            <button class="leave-btn" (click)="leave()" title="Sair da sala">←</button>
            <div class="room-info">
              <div class="room-code">{{ roomCode() }}</div>
              <div class="room-meta">
                <span class="role-tag" [class.driver]="myRole() === 'driver'">
                  {{ myRole() === 'driver' ? '🚌 Motorista' : '🧍 Passageiro' }}
                </span>
                <span class="dot-sep">·</span>
                <span class="peer-count">{{ totalInRoom() }} na sala</span>
              </div>
            </div>
          </div>

          <div class="tb-center">
            <div class="latency-chip" [class.good]="latency() < 200">
              <span class="latency-dot"></span>
              {{ latency() }}ms
            </div>
          </div>

          <div class="tb-right">
            @if (!tracking()) {
              <button class="action-btn gps-btn" (click)="startTracking()">📍 GPS</button>
            } @else {
              <button class="action-btn stop-btn" (click)="stopTracking()">⏹ GPS</button>
            }
            @if (myRole() === 'passenger') {
              <button class="action-btn signal-btn" (click)="showSignalModal.set(true)">🚨</button>
            }
            <button class="action-btn share-btn" (click)="copyRoomCode()" title="Copiar código">
              {{ copied() ? '✓' : '🔗' }}
            </button>
          </div>
        </header>

        <!-- GPS error banner -->
        @if (gpsError()) {
          <div class="gps-banner">⚠️ {{ gpsError() }}</div>
        }

        <!-- Main body -->
        <div class="main-body">
          <!-- Sidebar -->
          <aside class="sidebar">
            <!-- My position card -->
            <div class="sidebar-card">
              <div class="sc-header">
                <span class="sc-title">Minha Posição</span>
                @if (tracking()) {
                  <span class="live-badge">
                    <span class="live-dot"></span>
                    LIVE
                  </span>
                }
              </div>
              @if (myPosition()) {
                <div class="pos-grid">
                  <div class="pos-item">
                    <span class="pos-label">Lat</span>
                    <span class="pos-val">{{ myPosition()!.lat | number: '1.4-4' }}°</span>
                  </div>
                  <div class="pos-item">
                    <span class="pos-label">Lng</span>
                    <span class="pos-val">{{ myPosition()!.lng | number: '1.4-4' }}°</span>
                  </div>
                  <div class="pos-item">
                    <span class="pos-label">Vel.</span>
                    <span class="pos-val"
                      >{{ myPosition()!.speed * 3.6 | number: '1.0-0' }} km/h</span
                    >
                  </div>
                  <div class="pos-item">
                    <span class="pos-label">Prec.</span>
                    <span class="pos-val">±{{ myPosition()!.accuracy | number: '1.0-0' }}m</span>
                  </div>
                </div>
              } @else {
                <div class="no-gps">
                  <span>GPS inativo</span>
                  <button class="mini-btn" (click)="startTracking()">Ativar</button>
                </div>
              }
            </div>

            <!-- Peers card -->
            <div class="sidebar-card">
              <div class="sc-header">
                <span class="sc-title">Na Sala</span>
                <span class="count-badge">{{ totalInRoom() }}</span>
              </div>

              <!-- Me -->
              <div class="peer-row me-row">
                <div class="peer-avatar" [class.driver-av]="myRole() === 'driver'">
                  {{ myRole() === 'driver' ? '🚌' : '🧍' }}
                </div>
                <div class="peer-details">
                  <span class="peer-name">{{ myDisplayName() }}</span>
                  <span class="you-label">você</span>
                </div>
                <div class="peer-status" [class.active]="tracking()"></div>
              </div>

              @for (peer of peers(); track peer.clientId) {
                <div class="peer-row" (click)="focusPeer(peer.clientId)">
                  <div class="peer-avatar" [class.driver-av]="peer.role === 'driver'">
                    {{ peer.role === 'driver' ? '🚌' : '🧍' }}
                  </div>
                  <div class="peer-details">
                    <span class="peer-name">{{ peer.name }}</span>
                    <span class="peer-role">{{
                      peer.role === 'driver' ? 'Motorista' : 'Passageiro'
                    }}</span>
                  </div>
                  <span class="peer-speed">
                    {{ getPeerSpeed(peer.clientId) }}
                  </span>
                </div>
              }

              @if (peers().length === 0) {
                <div class="empty-peers">
                  Ninguém mais na sala.<br />
                  Compartilhe: <strong>{{ roomCode() }}</strong>
                </div>
              }
            </div>

            <!-- Signals card -->
            <div class="sidebar-card signals-card">
              <div class="sc-header">
                <span class="sc-title">Sinais</span>
                @if (signalLog().length > 0) {
                  <span class="alert-badge">{{ signalLog().length }}</span>
                }
              </div>
              @for (sig of signalLog(); track sig.id) {
                <div class="signal-item">
                  <div class="sig-top">
                    <span class="sig-name">{{ sig.name }}</span>
                    <span class="sig-time">{{ sig.time }}</span>
                  </div>
                  <div class="sig-stop">📍 {{ sig.stop }}</div>
                  <div class="sig-count">{{ sig.count }} passageiro(s)</div>
                </div>
              }
              @if (signalLog().length === 0) {
                <div class="empty-signals">Nenhum sinal ainda</div>
              }
            </div>
          </aside>

          <!-- Map area -->
          <div class="map-area">
            <div #mapContainer class="map-container"></div>

            <!-- Map controls -->
            <div class="map-controls">
              <button class="map-ctrl-btn" (click)="centerOnMe()" title="Centralizar em mim">
                ⊙
              </button>
              <button class="map-ctrl-btn" (click)="fitAll()" title="Ver todos">⤢</button>
            </div>

            @if (!mapReady()) {
              <div class="map-loading">
                <div class="ml-ring"></div>
                <span>Carregando mapa…</span>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ─── SIGNAL MODAL ─────────────────────────────────────────────────── -->
    @if (showSignalModal()) {
      <div class="modal-overlay" (click)="showSignalModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <span>🚨 Emitir Sinal</span>
            <button class="modal-close" (click)="showSignalModal.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Nome do ponto</label>
              <input
                class="field-input"
                [(ngModel)]="signalStop"
                placeholder="ex: Av. São Paulo, 450"
              />
            </div>
            <div class="field">
              <label>Passageiros</label>
              <input class="field-input" type="number" [(ngModel)]="signalCount" min="1" max="50" />
            </div>
            @if (myPosition()) {
              <div class="loc-tag ok">📍 GPS ativo — localização será incluída</div>
            } @else {
              <div class="loc-tag warn">⚠️ GPS inativo — sem localização</div>
            }
          </div>
          <div class="modal-foot">
            <button class="modal-cancel" (click)="showSignalModal.set(false)">Cancelar</button>
            <button class="modal-confirm" (click)="emitSignal()">Enviar Sinal</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        height: 90vh;
        width: 90vw;
        overflow: hidden;
        background: #030b14;
        color: #fff;
        font-family: 'Segoe UI', system-ui, sans-serif;
      }

      /* ── State screens ─────────────────────────────── */
      .state-screen {
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #030b14;
      }
      .state-card {
        text-align: center;
        padding: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .spinner-ring {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: #cc2200;
        animation: spin 0.8s linear infinite;
        margin-bottom: 8px;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .state-card h3 {
        font-size: 20px;
        margin: 0;
      }
      .state-code {
        font-family: 'Courier New', monospace;
        font-size: 16px;
        color: #ff6644;
        background: rgba(204, 34, 0, 0.15);
        padding: 4px 16px;
        border-radius: 8px;
      }
      .state-hint {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.45);
        margin: 0;
      }
      .state-icon {
        font-size: 48px;
      }
      .retry-btn {
        padding: 10px 24px;
        border-radius: 10px;
        border: none;
        background: #cc2200;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        &:hover {
          background: #ee3311;
        }
      }
      .back-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.4);
        font-size: 13px;
        cursor: pointer;
        &:hover {
          color: #fff;
        }
      }

      /* ── Shell ──────────────────────────────────────── */
      .tracking-shell {
        height: 100vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* ── Top bar ────────────────────────────────────── */
      .topbar {
        height: 56px;
        background: rgba(255, 255, 255, 0.04);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 12px;
        flex-shrink: 0;
      }
      .tb-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
      }
      .leave-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        width: 32px;
        height: 32px;
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        flex-shrink: 0;
        &:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      }
      .room-code {
        font-family: 'Courier New', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .room-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }
      .role-tag {
        color: rgba(255, 255, 255, 0.5);
        &.driver {
          color: #ff6644;
        }
      }
      .dot-sep {
        font-size: 8px;
      }
      .peer-count {
      }

      .tb-center {
        display: flex;
        align-items: center;
      }
      .latency-chip {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 10px;
        border-radius: 20px;
        &.good .latency-dot {
          background: #00cc66;
        }
      }
      .latency-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ffaa00;
      }

      .tb-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .action-btn {
        height: 32px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        &:hover {
          background: rgba(255, 255, 255, 0.12);
        }
      }
      .gps-btn {
        border-color: rgba(0, 204, 102, 0.3);
        color: #00cc66;
      }
      .stop-btn {
        border-color: rgba(255, 68, 68, 0.3);
        color: #ff4444;
      }
      .signal-btn {
        border-color: rgba(255, 170, 0, 0.3);
        color: #ffaa00;
        min-width: 32px;
        padding: 0 8px;
      }
      .share-btn {
        min-width: 32px;
        padding: 0 8px;
      }

      /* GPS banner */
      .gps-banner {
        background: rgba(255, 68, 68, 0.1);
        border-bottom: 1px solid rgba(255, 68, 68, 0.2);
        color: #ff8888;
        font-size: 12px;
        padding: 6px 16px;
        flex-shrink: 0;
      }

      /* ── Main body ──────────────────────────────────── */
      .main-body {
        display: grid;
        grid-template-columns: 280px 1fr;
        flex: 1;
        overflow: hidden;
        height: 100%; /* ← ADICIONE ISSO */
      }

      /* ── Sidebar ────────────────────────────────────── */
      .sidebar {
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: rgba(0, 0, 0, 0.3);
        border-right: 1px solid rgba(255, 255, 255, 0.06);
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
      }
      .sidebar-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 14px;
      }
      .sc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .sc-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: rgba(255, 255, 255, 0.35);
      }
      .live-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-weight: 700;
        color: #00cc66;
        letter-spacing: 0.5px;
      }
      .live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #00cc66;
        animation: pulse-glow 1.5s ease-in-out infinite;
      }
      @keyframes pulse-glow {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.3;
        }
      }
      .count-badge {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 700;
      }
      .alert-badge {
        background: rgba(255, 68, 68, 0.2);
        color: #ff6666;
        border-radius: 20px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 700;
      }

      /* Position grid */
      .pos-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .pos-item {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        padding: 8px;
      }
      .pos-label {
        display: block;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: rgba(255, 255, 255, 0.3);
        margin-bottom: 3px;
      }
      .pos-val {
        font-size: 13px;
        font-weight: 600;
        font-family: 'Courier New', monospace;
      }
      .no-gps {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.35);
      }
      .mini-btn {
        padding: 4px 12px;
        border-radius: 6px;
        border: 1px solid rgba(0, 204, 102, 0.3);
        background: rgba(0, 204, 102, 0.08);
        color: #00cc66;
        font-size: 12px;
        cursor: pointer;
        &:hover {
          background: rgba(0, 204, 102, 0.15);
        }
      }

      /* Peers */
      .peer-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 6px;
        border-radius: 10px;
        cursor: pointer;
        transition: background 0.15s;
        &:hover:not(.me-row) {
          background: rgba(255, 255, 255, 0.05);
        }
        &.me-row {
          cursor: default;
        }
      }
      .peer-avatar {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: rgba(0, 180, 216, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
        &.driver-av {
          background: rgba(204, 34, 0, 0.15);
        }
      }
      .peer-details {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .peer-name {
        font-size: 13px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .you-label {
        font-size: 9px;
        background: rgba(0, 204, 102, 0.15);
        color: #00cc66;
        padding: 1px 5px;
        border-radius: 4px;
        width: fit-content;
        margin-top: 1px;
      }
      .peer-role {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.35);
        margin-top: 1px;
      }
      .peer-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        flex-shrink: 0;
        &.active {
          background: #00cc66;
        }
      }
      .peer-speed {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.35);
        white-space: nowrap;
        flex-shrink: 0;
      }
      .empty-peers,
      .empty-signals {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.25);
        padding: 4px 0;
        line-height: 1.5;
      }

      /* Signals */
      .signal-item {
        padding: 8px;
        border-radius: 10px;
        background: rgba(255, 170, 0, 0.05);
        border: 1px solid rgba(255, 170, 0, 0.12);
        margin-bottom: 6px;
        &:last-child {
          margin-bottom: 0;
        }
      }
      .sig-top {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
      }
      .sig-name {
        font-size: 12px;
        font-weight: 600;
      }
      .sig-time {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.3);
      }
      .sig-stop {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
      }
      .sig-count {
        font-size: 11px;
        color: #ffaa00;
        font-weight: 600;
        margin-top: 2px;
      }

      /* ── Map area ────────────────────────────────────── */
      .map-area {
        position: relative;
        overflow: hidden;
      }
      .map-container {
        width: 100%;
        height: 100%;
      }
      .map-controls {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .map-ctrl-btn {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: rgba(3, 11, 20, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #fff;
        font-size: 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
        transition: background 0.15s;
        &:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      }
      .map-loading {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(3, 11, 20, 0.9);
        gap: 12px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
        z-index: 999;
      }
      .ml-ring {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: #cc2200;
        animation: spin 0.8s linear infinite;
      }

      /* ── Modal ───────────────────────────────────────── */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(6px);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .modal {
        background: #0d1b2a;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
      }
      .modal-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        font-size: 15px;
        font-weight: 700;
      }
      .modal-close {
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: rgba(255, 255, 255, 0.5);
        width: 28px;
        height: 28px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        &:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }
      }
      .modal-body {
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .field label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: rgba(255, 255, 255, 0.35);
      }
      .field-input {
        background: rgba(255, 255, 255, 0.06);
        border: 1.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 10px 14px;
        color: #fff;
        font-size: 14px;
        font-family: inherit;
        &::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }
        &:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.3);
        }
      }
      .loc-tag {
        font-size: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        &.ok {
          background: rgba(0, 204, 102, 0.1);
          color: #00cc66;
          border: 1px solid rgba(0, 204, 102, 0.2);
        }
        &.warn {
          background: rgba(255, 170, 0, 0.1);
          color: #ffaa00;
          border: 1px solid rgba(255, 170, 0, 0.2);
        }
      }
      .modal-foot {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 14px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.07);
      }
      .modal-cancel {
        padding: 8px 18px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.6);
        font-size: 13px;
        cursor: pointer;
        &:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
      }
      .modal-confirm {
        padding: 8px 20px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #cc2200, #ff4422);
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        &:hover {
          opacity: 0.9;
        }
      }

      /* Mobile */
      @media (max-width: 768px) {
        .main-body {
          grid-template-columns: 1fr;
        }
        .sidebar {
          display: none;
        }
        .tb-center {
          display: none;
        }
      }
    `,
  ],
})
export class CustomTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;

  // State
  pageState = signal<PageState>('loading');
  errorMessage = signal<string | null>(null);
  roomCode = signal<string>('');
  myRole = signal<WsRole>('passenger');
  myDisplayName = signal<string>('');

  // Tracking
  tracking = signal(false);
  myPosition = signal<GpsPosition | null>(null);
  gpsError = signal<string | null>(null);
  peers = signal<any[]>([]);
  signalLog = signal<SignalEvent[]>([]);
  latency = signal<number>(0);
  mapReady = signal(false);
  copied = signal(false);

  showSignalModal = signal(false);
  signalStop = '';
  signalCount = 1;

  trackedPeers: Record<string, TrackedPeer> = {};

  totalInRoom = computed(() => this.peers().length + 1);

  private map: any = null;
  private myMarker: any = null;
  private peerMarkers: Record<string, any> = {};
  private subs: Subscription[] = [];
  private pingInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    private loc: LocationService,
    private roomService: RoomService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('codigo') ?? '';
    const role = (this.route.snapshot.queryParamMap.get('role') as WsRole) ?? 'passenger';
    const name = this.route.snapshot.queryParamMap.get('name') ?? '';

    this.roomCode.set(code);
    this.myRole.set(role);
    this.myDisplayName.set(name || (role === 'driver' ? 'Motorista' : 'Passageiro'));

    this.loadLeaflet();
    this.connect(code, role, this.myDisplayName());
    this.startPing();
  }

  ngAfterViewInit(): void {}

  private connect(room: string, role: WsRole, name: string): void {
    this.supabase.connect(room, role, name);
    this.roomService.enterRoom(room, role, name);

    // Subscribe to Supabase streams
    this.subs.push(
      this.supabase.location$.subscribe((loc) => {
        if (!loc) return;
        this.zone.run(() => this.onPeerLocation(loc));
      }),

      this.supabase.signals$.subscribe((sig) => {
        if (!sig) return;
        this.zone.run(() => this.onSignalReceived(sig));
      }),

      this.supabase.status$.subscribe((status) => {
        this.zone.run(() => {
          if (status === 'connected') {
            setTimeout(() => {
              this.pageState.set('connected');
              setTimeout(() => {
                if (this.mapReady()) this.initMap();
              }, 100);
            }, 400);
          } else if (status === 'error') {
            this.pageState.set('error');
            this.errorMessage.set('Não foi possível conectar ao servidor.');
          }
        });
      }),

      this.supabase.peers$.subscribe((peers) => {
        this.zone.run(() => {
          this.peers.set(peers.filter((p) => p.clientId !== this.supabase.clientId));
        });
      }),

      this.loc.position$.subscribe((pos) => {
        if (!pos) return;
        this.zone.run(() => {
          this.myPosition.set(pos);
          this.supabase.sendLocation(pos.lat, pos.lng, pos.speed, pos.heading);
          this.updateMyMarker(pos.lat, pos.lng);
        });
      }),

      this.loc.error$.subscribe((err) => this.zone.run(() => this.gpsError.set(err))),
      this.loc.tracking$.subscribe((t) => this.zone.run(() => this.tracking.set(t))),
    );
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.latency.update((v) => Math.max(20, Math.floor(Math.random() * 80 + 20)));
    }, 5000);
  }

  reconnect(): void {
    this.pageState.set('loading');
    const code = this.roomCode();
    const role = this.myRole();
    const name = this.myDisplayName();
    this.connect(code, role, name);
  }

  leave(): void {
    this.stopTracking();
    this.supabase.disconnect();
    this.roomService.leaveRoom();
    clearInterval(this.pingInterval);
    this.router.navigate(['/sala']);
  }

  startTracking(): void {
    this.loc.startTracking(2000);
  }

  stopTracking(): void {
    this.loc.stopTracking();
  }

  emitSignal(): void {
    if (!this.signalStop.trim()) return;
    const pos = this.myPosition();
    this.supabase.sendSignal(this.signalStop, this.signalCount, pos?.lat, pos?.lng);
    this.showSignalModal.set(false);
    this.signalStop = '';
    this.signalCount = 1;
  }

  copyRoomCode(): void {
    navigator.clipboard.writeText(this.roomCode()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
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
    const pos = this.myPosition();
    if (pos) bounds.extend([pos.lat, pos.lng]);
    Object.values(this.trackedPeers).forEach((p) => bounds.extend([p.lat, p.lng]));
    if (bounds.isValid()) this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  getPeerSpeed(clientId: string): string {
    const peer = this.trackedPeers[clientId];
    if (!peer || peer.speed === 0) return 'Parado';
    return `${(peer.speed * 3.6).toFixed(0)} km/h`;
  }

  // Map setup
  private loadLeaflet(): void {
    if ((window as any).L) {
      this.mapReady.set(true);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () =>
      this.zone.run(() => {
        this.mapReady.set(true);
        if (this.pageState() === 'connected') this.initMap();
      });
    document.head.appendChild(script);
  }

  private initMap(): void {
    const el = this.mapContainerRef?.nativeElement;
    if (!el || !(window as any).L || this.map) return;

    const L = (window as any).L;
    this.map = L.map(el).setView([-23.5015, -47.4526], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(this.map);

    const pos = this.myPosition();
    if (pos) {
      this.updateMyMarker(pos.lat, pos.lng);
      this.map.setView([pos.lat, pos.lng], 16);
    }
  }

  private makeIcon(emoji: string, color: string): any {
    const L = (window as any).L;
    return L.divIcon({
      html: `<div style="background:${color}22;border:2px solid ${color};border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;">${emoji}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      className: '',
    });
  }

  private updateMyMarker(lat: number, lng: number): void {
    if (!this.map || !(window as any).L) return;
    const L = (window as any).L;
    const emoji = this.myRole() === 'driver' ? '🚌' : '🧍';
    const color = this.myRole() === 'driver' ? '#ff4422' : '#00b4d8';
    if (!this.myMarker) {
      this.myMarker = L.marker([lat, lng], { icon: this.makeIcon(emoji, color) }).addTo(this.map);
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

    if (!this.map || !(window as any).L) return;
    const L = (window as any).L;
    const emoji = role === 'driver' ? '🚌' : '🧍';
    const color = role === 'driver' ? '#ff4422' : '#00b4d8';
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
      time: new Date(sig.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    this.signalLog.update((log) => [event, ...log.slice(0, 19)]);
    if (this.map && sig.lat && sig.lng) {
      const L = (window as any).L;
      L.marker([sig.lat, sig.lng]).addTo(this.map).bindPopup(`🚨 ${sig.stop}`);
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.stopTracking();
    this.map?.remove();
    clearInterval(this.pingInterval);
  }
}
