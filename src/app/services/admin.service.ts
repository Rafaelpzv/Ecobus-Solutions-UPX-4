import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environment/environment';

export interface RoomRecord {
  code: string;
  display_name: string | null;
  is_private: boolean;
  private_password: string | null;
  created_at: string;
  last_active: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // ── Rooms CRUD ────────────────────────────────────────────────────────────

  async getRooms(): Promise<RoomRecord[]> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('*')
      .order('last_active', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async upsertRoom(code: string, extra: Partial<RoomRecord> = {}): Promise<void> {
    const { error } = await this.supabase
      .from('rooms')
      .upsert({ code, last_active: new Date().toISOString(), ...extra }, { onConflict: 'code' });
    if (error) console.warn('[AdminService] upsertRoom:', error.message);
  }

  async renameRoom(code: string, newName: string) {
    await this.broadcast(code, 'admin', {
      type: 'rename_room',
      roomCode: code,
      name: newName,
    });
  }

  async setPrivate(
    code: string,
    isPrivate: boolean,
    password: string | null = null,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('rooms')
      .update({ is_private: isPrivate, private_password: isPrivate ? password : null })
      .eq('code', code);
    if (error) throw error;
  }

  async deleteRoom(code: string): Promise<void> {
    const { error } = await this.supabase.from('rooms').delete().eq('code', code);
    if (error) throw error;
  }

  // ── Room presence (get active users) ─────────────────────────────────────

  async getRoomUsers(code: string): Promise<any[]> {
    return new Promise((resolve) => {
      const done = (users: any[]) => {
        this.supabase.removeChannel(ch);
        resolve(users);
      };

      const ch = this.supabase.channel(`room:${code}`);

      const timeout = setTimeout(() => done([]), 4000);

      ch.on('presence', { event: 'sync' }, () => {
        clearTimeout(timeout);
        const state = ch.presenceState();
        const users: any[] = [];
        for (const key in state) {
          (state[key] as any[]).forEach((p) => users.push(p));
        }
        done(users);
      });

      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Fallback: if no presence event fires within 1s, read whatever is there
          setTimeout(() => {
            clearTimeout(timeout);
            const state = ch.presenceState();
            const users: any[] = [];
            for (const key in state) {
              (state[key] as any[]).forEach((p) => users.push(p));
            }
            done(users);
          }, 1500);
        }
      });
    });
  }

  // ── Admin broadcast commands ──────────────────────────────────────────────

  private async broadcast(code: string, event: string, payload: object): Promise<void> {
    const ch = this.supabase.channel(`room:${code}`, {
      config: { broadcast: { self: true } },
    });

    await new Promise<void>((resolve) => {
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });

    await ch.send({ type: 'broadcast', event, payload });
    await new Promise((r) => setTimeout(r, 300)); // let Supabase flush
    this.supabase.removeChannel(ch);
  }

  broadcastCommand(command: any) {
    return this.supabase.channel('admin').send({
      type: 'broadcast',
      event: 'admin-command',
      payload: command,
    });
  }

  async kickUser(code: string, clientId: string): Promise<void> {
    await this.broadcast(code, 'admin', {
      type: 'kick',
      roomCode: code,
      targetClientId: clientId,
    });
  }
  async closeRoom(code: string): Promise<void> {
    await this.broadcast(code, 'admin', {
      type: 'room_closed',
      roomCode: code,
    });
    await this.deleteRoom(code);
  }

  // ── Realtime subscription for room table changes ──────────────────────────

  subscribeToRoomChanges(callback: () => void): any {
    return this.supabase
      .channel('admin_rooms_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, callback)
      .subscribe();
  }

  removeChannel(channel: any): void {
    this.supabase.removeChannel(channel);
  }
}
