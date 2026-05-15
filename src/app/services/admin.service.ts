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

  // ── Rooms CRUD ─────────────────────────────────────────

  async getRooms(): Promise<RoomRecord[]> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('*')
      .order('last_active', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async checkRoomPassword(code: string, password: string): Promise<boolean> {
    const room = await this.getRoom(code);
    if (!room || !room.is_private) {
      // Se a sala não existe ou não é privada, não há senha a verificar (acesso livre)
      return true;
    }
    // Se a sala é privada e tem senha definida, compara
    // Se não tem senha definida, nega o acesso (exige que o admin defina uma)
    if (!room.private_password) {
      return false;
    }
    return room.private_password === password;
  }
  async deleteAllRooms(): Promise<void> {
    const { error } = await this.supabase.from('rooms').delete().neq('code', ''); // deleta todas (qualquer condição, ex.: código não vazio)
    if (error) throw error;
  }

  /** Busca uma única sala pelo código */
  async getRoom(code: string): Promise<RoomRecord | null> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async upsertRoom(code: string, extra: Partial<RoomRecord> = {}): Promise<void> {
    const { error } = await this.supabase
      .from('rooms')
      .upsert({ code, last_active: new Date().toISOString(), ...extra }, { onConflict: 'code' });
    if (error) console.warn('[AdminService] upsertRoom:', error.message);
  }

  async renameRoom(code: string, newName: string) {
    await this.broadcast(code, 'admin', { type: 'rename_room', roomCode: code, name: newName });
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

  // ── Presence ──────────────────────────────────────────

  async getRoomUsers(code: string): Promise<any[]> {
    return new Promise((resolve) => {
      const ch = this.supabase.channel(`room:${code}`);
      const timeout = setTimeout(() => {
        this.supabase.removeChannel(ch);
        resolve([]);
      }, 5000); // timeout de segurança

      ch.on('presence', { event: 'sync' }, () => {
        clearTimeout(timeout);
        const state = ch.presenceState();
        const usersMap = new Map<string, any>();

        for (const key in state) {
          const presences = state[key] as any[];
          for (const p of presences) {
            // Filtra entradas inválidas
            if (p.name && p.clientId && p.role) {
              // Usa clientId como chave única para evitar duplicatas
              if (!usersMap.has(p.clientId)) {
                usersMap.set(p.clientId, p);
              }
            }
          }
        }

        const users = Array.from(usersMap.values());
        this.supabase.removeChannel(ch);
        resolve(users);
      });

      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Força uma sincronização inicial após 1s (fallback)
          setTimeout(() => {
            clearTimeout(timeout);
            const state = ch.presenceState();
            const usersMap = new Map<string, any>();
            for (const key in state) {
              const presences = state[key] as any[];
              for (const p of presences) {
                if (p.name && p.clientId && p.role) {
                  if (!usersMap.has(p.clientId)) {
                    usersMap.set(p.clientId, p);
                  }
                }
              }
            }
            this.supabase.removeChannel(ch);
            resolve(Array.from(usersMap.values()));
          }, 1500);
        }
      });
    });
  }

  // ── Broadcasts ─────────────────────────────────────────

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
    await new Promise((r) => setTimeout(r, 300));
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

  // ── Realtime ───────────────────────────────────────────

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
