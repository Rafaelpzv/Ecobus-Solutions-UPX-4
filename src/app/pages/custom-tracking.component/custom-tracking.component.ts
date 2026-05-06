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
  message?: string;
}

type PageState = 'loading' | 'connected' | 'error';

@Component({
  selector: 'app-custom-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-tracking.component.html',
  styleUrl: './custom-tracking.component.css',
})
export class CustomTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;
  showRenameModal = signal(false);
  showDeleteModal = signal(false);
  showPrivateModal = signal(false);

  newRoomName = '';

  pageState = signal<PageState>('loading');
  errorMessage = signal<string | null>(null);
  roomCode = signal<string>('');
  myRole = signal<WsRole>('passenger');
  myDisplayName = signal<string>('');

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
  signalMessage = '';
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
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        console.log('Permissão:', permission);
      });
    }

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

    this.supabase.subscribeToAdminCommands((payload) => {
      const data = payload.payload;

      // 🔥 RENAME
      if (data.type === 'rename_room') {
        alert(`Sala renomeada para: ${data.name}`);
      }

      // 🔒 PRIVAR
      if (data.type === 'toggle_private') {
        alert('Sala agora é privada');
      }

      // ❌ FECHAR SALA
      if (data.type === 'close_room') {
        alert('Sala encerrada pelo admin');
        this.leave();
      }
    });

    this.subs.push(
      this.supabase.location$.subscribe((loc) => {
        if (!loc) return;
        this.zone.run(() => this.onPeerLocation(loc));
      }),

      this.supabase.signals$.subscribe((sig: any) => {
        if (!sig) return;

        this.zone.run(() => {
          // 🔥 ADMIN COMMANDS
          if (sig.type === 'admin') {
            const data = sig.data;

            if (data.roomCode !== this.roomCode()) return;

            if (data.type === 'kick' && data.clientId === this.supabase.clientId) {
              alert('Você foi expulso');
              this.leave();
              return;
            }

            if (data.type === 'room_closed') {
              alert('Sala encerrada');
              this.leave();
              return;
            }

            return; // importante pra não cair no signal normal
          }

          // 🚨 sinais normais
          this.onSignalReceived(sig);
        });
      }),

      this.supabase.status$.subscribe((status) => {
        this.zone.run(() => {
          if (status === 'kicked') {
            alert('Você foi expulso da sala');
            this.leave();
            return;
          }

          if (status === 'connected') {
            setTimeout(() => {
              this.pageState.set('connected');
              setTimeout(() => {
                if (this.mapReady()) this.initMap();
              }, 100);
            }, 400);
          }

          if (status === 'error') {
            this.pageState.set('error');
            this.errorMessage.set('Não foi possível conectar ao servidor.');
          }
          if (status === 'closed') {
            alert('Sala encerrada');
            this.leave();
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

    // 👇 ADICIONA ISSO AQUI
    this.supabase.subscribeToAdminCommands((payload) => {
      const data = payload.payload;

      if (data.roomCode !== this.roomCode()) return;

      if (data.type === 'kick' && data.clientId === this.supabase.clientId) {
        alert('Você foi expulso');
        this.leave();
      }

      if (data.type === 'room_closed') {
        alert('Sala encerrada');
        this.leave();
      }
    });
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

    this.supabase.sendSignal(
      this.signalStop,
      this.signalCount,
      pos?.lat,
      pos?.lng,
      this.signalMessage, // 👈 novo campo
    );

    this.showSignalModal.set(false);

    // reset
    this.signalStop = '';
    this.signalCount = 1;
    this.signalMessage = '';
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
      message: sig.message,
      time: new Date(sig.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    this.signalLog.update((log) => [event, ...log.slice(0, 19)]);
    if (this.map && sig.lat && sig.lng) {
      const L = (window as any).L;
      L.marker([sig.lat, sig.lng])
        .addTo(this.map)
        .bindPopup(
          sig.message ? `🚨 ${sig.stop}<br/><small>${sig.message}</small>` : `🚨 ${sig.stop}`,
        );
    }
    if (Notification.permission === 'granted') {
      new Notification('🚨 Novo sinal', {
        body: sig.message
          ? `${sig.stop} (${sig.count}) - ${sig.message}`
          : `${sig.stop} (${sig.count})`,
        icon: '/assets/icon.png', // opcional
      });
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.stopTracking();
    this.map?.remove();
    clearInterval(this.pingInterval);
  }
}
