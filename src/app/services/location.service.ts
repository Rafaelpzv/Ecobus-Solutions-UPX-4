import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number; // m/s  (0 se null)
  heading: number; // graus (0 se null)
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class LocationService implements OnDestroy {
  readonly position$ = new BehaviorSubject<GpsPosition | null>(null);
  readonly error$ = new BehaviorSubject<string | null>(null);
  readonly tracking$ = new BehaviorSubject<boolean>(false);

  private watchId: number | null = null;

  readonly isSupported = 'geolocation' in navigator;

  // ── Start watching ────────────────────────────────────────────────────────
  startTracking(intervalMs = 3000): void {
    if (!this.isSupported) {
      this.error$.next('Geolocalização não suportada neste navegador.');
      return;
    }

    this.tracking$.next(true);
    this.error$.next(null);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: intervalMs,
      timeout: 10_000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const gps: GpsPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ?? 0,
          heading: pos.coords.heading ?? 0,
          timestamp: pos.timestamp,
        };
        this.position$.next(gps);
        this.error$.next(null);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Permissão de localização negada.',
          2: 'Localização indisponível. Verifique o GPS.',
          3: 'Tempo limite para obter localização esgotado.',
        };
        this.error$.next(messages[err.code] ?? err.message);
      },
      options,
    );
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.tracking$.next(false);
  }

  // Leitura única
  getCurrentPosition(): Promise<GpsPosition> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) return reject('Geolocalização não suportada');
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed ?? 0,
            heading: pos.coords.heading ?? 0,
            timestamp: pos.timestamp,
          }),
        (err) => reject(err.message),
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    });
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }
}
