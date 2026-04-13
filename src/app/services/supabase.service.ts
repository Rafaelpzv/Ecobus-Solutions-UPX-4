import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environment/environment';
import { BehaviorSubject } from 'rxjs';

export type WsRole = 'driver' | 'passenger';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private channel: any;

  status$ = new BehaviorSubject<string>('disconnected');
  peers$ = new BehaviorSubject<any[]>([]);
  location$ = new BehaviorSubject<any>(null);
  signals$ = new BehaviorSubject<any>(null);

  clientId = crypto.randomUUID();
  room: string = '';
  role: WsRole = 'passenger';
  name: string = '';

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  connect(room: string, role: WsRole, name: string) {
    this.room = room;
    this.role = role;
    this.name = name;

    this.status$.next('connecting');

    this.channel = this.supabase.channel(`room:${room}`, {
      config: {
        broadcast: { self: false },
        presence: { key: this.clientId },
      },
    });

    // 📍 localização
    this.channel.on('broadcast', { event: 'location' }, (payload: any) => {
      this.location$.next(payload.payload);
    });

    // 🚨 sinais
    this.channel.on('broadcast', { event: 'signal' }, (payload: any) => {
      this.signals$.next(payload.payload);
    });

    // 🧍 PRESENCE
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel.presenceState();

      const users: any[] = [];

      for (const key in state) {
        const presences = state[key];

        presences.forEach((p: any) => {
          users.push({
            clientId: p.clientId,
            name: p.name,
            role: p.role,
          });
        });
      }

      console.log('PEERS ATUALIZADOS:', users);

      this.peers$.next(users);
    });

    this.channel.subscribe((status: string) => {
      console.log('SUPABASE STATUS:', status);

      if (status === 'SUBSCRIBED') {
        this.status$.next('connected');

        setTimeout(() => {
          this.channel.track({
            clientId: this.clientId,
            name: this.name,
            role: this.role,
          });
        }, 200); // ⬅️ aumentei (isso resolve MUITO bug)
      }

      if (status === 'CHANNEL_ERROR') {
        this.status$.next('error');
      }

      if (status === 'TIMED_OUT') {
        this.status$.next('disconnected');
      }
    });
  }
  sendLocation(lat: number, lng: number, speed: number, heading: number) {
    this.channel.send({
      type: 'broadcast',
      event: 'location',
      payload: {
        clientId: this.clientId,
        name: this.name,
        role: this.role,
        lat,
        lng,
        speed,
        heading,
      },
    });
  }

  sendSignal(stop: string, count: number, lat?: number, lng?: number) {
    this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        name: this.name,
        stop,
        count,
        lat,
        lng,
        timestamp: Date.now(),
      },
    });
  }

  disconnect() {
    this.supabase.removeChannel(this.channel);
    this.status$.next('disconnected');
  }
}
