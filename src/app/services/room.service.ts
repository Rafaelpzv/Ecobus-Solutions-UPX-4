import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environment/environment';

export interface RoomMeta {
  code: string;
  role: 'driver' | 'passenger';
  name: string;
  lastUsed: number;
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  private supabase: SupabaseClient;
  private currentChannel: any = null; // 👈 guarda o canal da sala atual

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // ── Validação & normalização ──────────────────────

  validateCode(value: string): { valid: boolean; error?: string } {
    if (!value || value.trim().length === 0) {
      return { valid: false, error: 'Código obrigatório' };
    }
    const normalized = this.normalizeCode(value);
    if (normalized.length < 3) {
      return { valid: false, error: 'Mínimo 3 caracteres' };
    }
    if (!/^[a-z0-9\-_]+$/.test(normalized)) {
      return { valid: false, error: 'Apenas letras, números, hífens e underlines' };
    }
    return { valid: true };
  }

  normalizeCode(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '');
  }

  generateCode(): string {
    const adjectives = ['azul', 'verde', 'rapido', 'direto', 'expresso'];
    const nouns = ['linha', 'rota', 'corredor', 'terminal', 'shopping'];
    const num = Math.floor(Math.random() * 900 + 100);
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}-${noun}-${num}`;
  }

  // ── Entrar na sala ─────────────────────────────────
  async enterRoom(
    code: string,
    role: 'driver' | 'passenger',
    name: string,
    clientId?: string,
    password?: string,
  ): Promise<void> {
    this.leaveRoom();

    const id = clientId || crypto.randomUUID();

    this.currentChannel = this.supabase.channel(`room:${code}`, {
      config: { broadcast: { self: true } },
    });

    await this.currentChannel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await this.currentChannel.track({
          name, // era "user", corrigir para "name" se for o esperado
          role,
          clientId,
          online_at: new Date().toISOString(),
          password: password || null,
        });
      }
    });
  }

  // ── Sair da sala ───────────────────────────────────
  leaveRoom(): void {
    if (this.currentChannel) {
      this.supabase.removeChannel(this.currentChannel);
      this.currentChannel = null;
    }
  }

  // ── Salas recentes (localStorage) ─────────────────
  private recentKey = 'ecobus_recent_rooms';

  recentRooms(): RoomMeta[] {
    const raw = localStorage.getItem(this.recentKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as RoomMeta[];
    } catch {
      return [];
    }
  }

  private saveRecentRoom(code: string, role: 'driver' | 'passenger', name: string): void {
    const rooms = this.recentRooms().filter((r) => r.code !== code);
    rooms.unshift({ code, role, name, lastUsed: Date.now() });
    const trimmed = rooms.slice(0, 5);
    localStorage.setItem(this.recentKey, JSON.stringify(trimmed));
  }

  clearRecent(): void {
    localStorage.removeItem(this.recentKey);
  }
}
