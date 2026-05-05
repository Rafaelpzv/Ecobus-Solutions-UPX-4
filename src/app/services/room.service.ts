import { Injectable, signal, computed } from '@angular/core';

export interface RoomMeta {
  code: string;
  createdAt: number;
  lastUsed: number;
  role: 'driver' | 'passenger';
  name: string;
}

const STORAGE_KEY = 'ecobus_rooms';
const MAX_RECENT = 5;

@Injectable({ providedIn: 'root' })
export class RoomService {
  private _recentRooms = signal<RoomMeta[]>(this.loadFromStorage());
  private _currentRoom = signal<RoomMeta | null>(null);

  readonly recentRooms = computed(() => this._recentRooms());
  readonly currentRoom = computed(() => this._currentRoom());

  // ── Validation ────────────────────────────────────────────────────────────

  validateCode(code: string): { valid: boolean; error?: string } {
    const trimmed = code.trim();
    if (!trimmed) return { valid: false, error: 'Código não pode ser vazio' };
    if (trimmed.length < 3)
      return { valid: false, error: 'Código muito curto (mínimo 3 caracteres)' };
    if (trimmed.length > 40)
      return { valid: false, error: 'Código muito longo (máximo 40 caracteres)' };
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      return { valid: false, error: 'Use apenas letras, números, - e _' };
    }
    return { valid: true };
  }

  normalizeCode(code: string): string {
    return code.trim().toLowerCase();
  }

  // ── Room lifecycle ────────────────────────────────────────────────────────

  enterRoom(code: string, role: 'driver' | 'passenger', name: string): void {
    const normalized = this.normalizeCode(code);
    const meta: RoomMeta = {
      code: normalized,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      role,
      name,
    };

    this._currentRoom.set(meta);
    this.addToRecent(meta);
  }

  leaveRoom(): void {
    this._currentRoom.set(null);
  }

  // ── Recent rooms ──────────────────────────────────────────────────────────

  private addToRecent(meta: RoomMeta): void {
    const current = this._recentRooms();
    const filtered = current.filter((r) => r.code !== meta.code);
    const updated = [{ ...meta, lastUsed: Date.now() }, ...filtered].slice(0, MAX_RECENT);
    this._recentRooms.set(updated);
    this.saveToStorage(updated);
  }

  removeRecent(code: string): void {
    const updated = this._recentRooms().filter((r) => r.code !== code);
    this._recentRooms.set(updated);
    this.saveToStorage(updated);
  }

  clearRecent(): void {
    this._recentRooms.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  // ── Code generation ───────────────────────────────────────────────────────

  generateCode(): string {
    const adjectives = ['rapido', 'verde', 'urbano', 'linha', 'rota', 'expresso', 'direto'];
    const nouns = ['norte', 'sul', 'central', 'facens', 'terminal', 'shopping', 'parque'];
    const num = Math.floor(Math.random() * 900) + 100;
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}-${noun}-${num}`;
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  private loadFromStorage(): RoomMeta[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as RoomMeta[]) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(rooms: RoomMeta[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    } catch {
      /* ignore */
    }
  }
}
