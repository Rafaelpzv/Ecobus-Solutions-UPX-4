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
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.css',
})
export class TrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  roomInfo = computed(() => {
    const drivers = this.peers().filter((p) => p.role === 'driver').length;
    const passengers = this.peers().filter((p) => p.role === 'passenger').length;

    return { drivers, passengers };
  });

  latency = signal<number>(0);

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

  chosenRole = signal<WsRole>('passenger');
  myName = signal('');
  roomCode = signal('');

  joined = signal(false);
  myRole = signal<WsRole | null>(null);
  currentRoom = signal<string | null>(null);

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

    this.subs.push(
      this.supabase.location$.subscribe((loc) => {
        if (!loc) return;
        this.zone.run(() => this.onPeerLocation(loc));
      }),

      this.supabase.signals$.subscribe((sig) => {
        if (!sig) return;
        this.zone.run(() => this.onSignalReceived(sig));
      }),

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

  mapExpanded = false;

  toggleMap() {
    this.mapExpanded = !this.mapExpanded;
  }
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
      className: '',
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
