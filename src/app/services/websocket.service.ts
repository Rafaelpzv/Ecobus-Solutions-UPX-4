import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable, timer } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export type WsRole = 'driver' | 'passenger';

export interface WsMessage {
  type: string;
  [key: string]: any;
}

export interface PeerInfo {
  clientId: string;
  role: WsRole;
  name: string;
  lastLocation?: LocationPayload | null;
}

export interface LocationPayload {
  clientId: string;
  role: WsRole;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: number;
}

export interface SignalPayload {
  clientId: string;
  name: string;
  stop: string;
  count: number;
  lat?: number;
  lng?: number;
  timestamp: number;
}

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private reconnectTimer: any;
  private pingTimer: any;
  private serverUrl = 'ws://localhost:8080';

  // ── Public streams ────────────────────────────────────────────────────────
  readonly status$ = new BehaviorSubject<WsStatus>('disconnected');
  readonly messages$ = new Subject<WsMessage>();
  readonly clientId$ = new BehaviorSubject<string | null>(null);
  readonly room$ = new BehaviorSubject<string | null>(null);
  readonly role$ = new BehaviorSubject<WsRole | null>(null);
  readonly peers$ = new BehaviorSubject<PeerInfo[]>([]);
  readonly roomInfo$ = new BehaviorSubject<{ drivers: number; passengers: number }>({
    drivers: 0,
    passengers: 0,
  });
  readonly latency$ = new BehaviorSubject<number>(0);

  // Filtered convenience streams
  readonly locations$ = this.messages$.pipe(filter((m) => m['type'] === 'location')) as Observable<
    LocationPayload & { type: string }
  >;
  readonly signals$ = this.messages$.pipe(filter((m) => m['type'] === 'signal')) as Observable<
    SignalPayload & { type: string }
  >;
  readonly peerJoined$ = this.messages$.pipe(filter((m) => m['type'] === 'peer_joined'));
  readonly peerLeft$ = this.messages$.pipe(filter((m) => m['type'] === 'peer_left'));

  // ── Connect ───────────────────────────────────────────────────────────────
  connect(url = this.serverUrl): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.status$.next('connecting');
    this.serverUrl = url;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WS] conectado');
        this.status$.next('connected');
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          /* ignore */
        }
      };

      this.ws.onerror = () => {
        this.status$.next('error');
      };

      this.ws.onclose = () => {
        this.status$.next('disconnected');
        this.stopPing();
        this.scheduleReconnect();
      };
    } catch (err) {
      this.status$.next('error');
    }
  }

  disconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.stopPing();
    this.ws?.close();
    this.ws = null;
    this.clientId$.next(null);
    this.room$.next(null);
    this.role$.next(null);
    this.peers$.next([]);
  }

  // ── Send helpers ──────────────────────────────────────────────────────────
  send(msg: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  joinRoom(room: string, role: WsRole, name?: string): void {
    this.send({ type: 'join', room, role, name });
  }

  sendLocation(lat: number, lng: number, speed = 0, heading = 0, accuracy = 0): void {
    this.send({ type: 'location', lat, lng, speed, heading, accuracy });
  }

  sendSignal(stop: string, count: number, lat?: number, lng?: number): void {
    this.send({ type: 'signal', stop, count, lat, lng });
  }

  // ── Internal ──────────────────────────────────────────────────────────────
  private handleMessage(msg: WsMessage): void {
    this.messages$.next(msg);

    switch (msg['type']) {
      case 'joined':
        this.clientId$.next(msg['clientId']);
        this.room$.next(msg['room']);
        this.role$.next(msg['role']);
        this.peers$.next(msg['peers'] ?? []);
        break;

      case 'peer_joined': {
        const peer: PeerInfo = {
          clientId: msg['clientId'],
          role: msg['role'],
          name: msg['name'],
          lastLocation: null,
        };

        const current = this.peers$.getValue();

        this.peers$.next([...current.filter((p) => p.clientId !== peer.clientId), peer]);

        break;
      }

      case 'peer_left':
        this.peers$.next(this.peers$.getValue().filter((p) => p.clientId !== msg['clientId']));
        break;

      case 'location': {
        // Update peer's last location
        const updated = this.peers$
          .getValue()
          .map((p) => (p.clientId === msg['clientId'] ? { ...p, lastLocation: msg as any } : p));
        this.peers$.next(updated);
        break;
      }

      case 'room_info':
        this.roomInfo$.next({ drivers: msg['drivers'], passengers: msg['passengers'] });
        break;

      case 'pong': {
        const now = Date.now();
        this.latency$.next(now - (this._pingSentAt ?? now));
        break;
      }
    }
  }

  private _pingSentAt = 0;

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      this._pingSentAt = Date.now();
      this.send({ type: 'ping' });
    }, 10_000);
  }

  private stopPing(): void {
    clearInterval(this.pingTimer);
  }

  private scheduleReconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.status$.getValue() === 'disconnected') {
        console.log('[WS] tentando reconectar...');
        this.connect(this.serverUrl);
      }
    }, 3000);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
