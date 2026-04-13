import { Component, OnInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../services/websocket.service';
import { LocationService, GpsPosition } from '../../services/location.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Mapa em Tempo Real</h1>

      <div class="controls">
        <button (click)="setRole('driver')">Sou Motorista</button>
        <button (click)="setRole('passenger')">Sou Passageiro</button>
      </div>

      <div #mapContainer class="map"></div>
    </div>
  `,
  styles: [
    `
      .map {
        height: 500px;
        width: 100%;
        border-radius: 12px;
        margin-top: 10px;
      }

      .controls {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
      }

      button {
        padding: 8px 12px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
      }
    `,
  ],
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;

  private map: any;
  private myMarker: any;
  private peerMarkers: Record<string, any> = {};

  private role: 'driver' | 'passenger' = 'passenger';

  constructor(
    private ws: WebSocketService,
    private loc: LocationService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadLeaflet();

    setTimeout(() => {
      this.initMap();
      this.connectSocket();
      this.startTracking();
    }, 500);
  }

  ngOnDestroy(): void {
    this.loc.stopTracking();
  }

  // =============================
  // 🗺️ MAPA
  // =============================
  private loadLeaflet(): void {
    if ((window as any).L) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    document.body.appendChild(script);
  }

  private initMap(): void {
    const L = (window as any).L;

    this.map = L.map(this.mapContainerRef.nativeElement).setView(
      [-23.5015, -47.4526], // Sorocaba
      13,
    );

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(this.map);
  }

  // =============================
  // 📡 WEBSOCKET
  // =============================
  private connectSocket(): void {
    this.ws.connect('ws://localhost:8080');

    this.ws.locations$.subscribe((loc: any) => {
      this.zone.run(() => this.updatePeer(loc));
    });
  }

  private updatePeer(loc: any): void {
    const L = (window as any).L;

    if (!loc?.clientId) return;

    if (!this.peerMarkers[loc.clientId]) {
      this.peerMarkers[loc.clientId] = L.marker([loc.lat, loc.lng])
        .addTo(this.map)
        .bindPopup(`${loc.name || 'Usuário'} (${loc.role})`);
    } else {
      this.peerMarkers[loc.clientId].setLatLng([loc.lat, loc.lng]);
    }
  }

  // =============================
  // 📍 LOCALIZAÇÃO
  // =============================
  private startTracking(): void {
    this.loc.startTracking();

    this.loc.position$.subscribe((pos: GpsPosition | null) => {
      if (!pos) return;

      this.zone.run(() => {
        this.updateMyLocation(pos);
        this.ws.sendLocation(pos.lat, pos.lng);
      });
    });
  }

  private updateMyLocation(pos: GpsPosition): void {
    const L = (window as any).L;

    if (!this.myMarker) {
      this.myMarker = L.marker([pos.lat, pos.lng]).addTo(this.map).bindPopup('Você');
    } else {
      this.myMarker.setLatLng([pos.lat, pos.lng]);
    }

    this.map.setView([pos.lat, pos.lng], 15);
  }

  // =============================
  // 🎭 ROLE
  // =============================
  setRole(role: 'driver' | 'passenger'): void {
    this.role = role;

    this.ws.joinRoom('sala-1', this.role, this.role === 'driver' ? 'Motorista' : 'Passageiro');
  }
}
