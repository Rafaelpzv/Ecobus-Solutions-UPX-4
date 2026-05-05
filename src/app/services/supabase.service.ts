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
  private adminChannel: any; // 👈 NOVO
  private updatePresence() {
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
  }

  status$ = new BehaviorSubject<string>('disconnected');
  peers$ = new BehaviorSubject<any[]>([]);
  location$ = new BehaviorSubject<any>(null);
  signals$ = new BehaviorSubject<any>(null);

  // ✅ CLIENT ID FIXO (ESSENCIAL PRO KICK FUNCIONAR)
  clientId = localStorage.getItem('clientId') ?? crypto.randomUUID();

  room: string = '';
  role: WsRole = 'passenger';
  name: string = '';

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    // garante persistência
    localStorage.setItem('clientId', this.clientId);

    // 👇 cria canal global admin
    this.adminChannel = this.supabase.channel('admin');
    this.adminChannel.subscribe();
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

    this.channel.on('broadcast', { event: 'admin' }, (payload: any) => {
      const data = payload.payload;

      if (data.roomCode !== this.room) return;

      if (data.type === 'kick') {
        if (data.targetClientId === this.clientId) {
          this.status$.next('kicked');
        }
      }
      if (data.type === 'room_closed') {
        this.status$.next('closed');
      }
    });

    // 🧍 PRESENCE
    this.channel.on('presence', { event: 'sync' }, () => {
      this.updatePresence();
    });

    this.channel.on('presence', { event: 'leave' }, () => {
      this.updatePresence();
    });

    this.channel.on('presence', { event: 'join' }, () => {
      this.updatePresence();
    });

    this.channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        this.status$.next('connected');

        setTimeout(() => {
          this.channel.track({
            clientId: this.clientId,
            name: this.name,
            role: this.role,
          });
        }, 200);
      }

      if (status === 'CHANNEL_ERROR') {
        this.status$.next('error');
      }

      if (status === 'TIMED_OUT') {
        this.status$.next('disconnected');
      }
    });
  }

  // 📡 ESCUTAR COMANDOS DO ADMIN (KICK / CLOSE)
  subscribeToAdminCommands(callback: (payload: any) => void) {
    const adminChannel = this.supabase.channel('admin', {
      config: {
        broadcast: { self: false },
      },
    });

    adminChannel.on('broadcast', { event: 'admin' }, (payload: any) => {
      console.log('ADMIN RECEBIDO:', payload);
      callback(payload);
    });

    adminChannel.subscribe((status: string) => {
      console.log('ADMIN CHANNEL STATUS:', status);
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

  sendAdminCommand(type: string, payload: any) {
    this.channel.send({
      type: 'broadcast',
      event: 'admin',
      payload: {
        type,
        ...payload,
      },
    });
  }
  renameRoom(newName: string) {
    this.sendAdminCommand('rename_room', {
      name: newName,
    });
  }

  togglePrivate(isPrivate: boolean) {
    this.sendAdminCommand('toggle_private', {
      private: isPrivate,
    });
  }

  closeRoom() {
    this.sendAdminCommand('close_room', {});
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
    if (this.channel) {
      this.channel.untrack(); // 👈 ESSENCIAL
      this.supabase.removeChannel(this.channel);
    }

    this.status$.next('disconnected');
  }
}
