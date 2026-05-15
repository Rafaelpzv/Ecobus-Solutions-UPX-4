import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RoomService, RoomMeta } from '../../services/room.service';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-room-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './room-entry.component.html',
  styleUrl: './room-entry.component.css',
})
export class RoomEntryComponent implements OnInit {
  chosenRole = signal<'driver' | 'passenger'>('passenger');
  codeInput = signal('');
  nameInput = '';
  loading = signal(false);

  validationError = signal<string | null>(null);

  // 🔑 Sala privada
  roomPassword = signal('');
  needsPassword = signal(false);
  passwordError = signal<string | null>(null);
  privateCheckLoading = signal(false);

  normalizedCode = computed(() => this.roomService.normalizeCode(this.codeInput()));

  canEnter = computed(() => {
    const validation = this.roomService.validateCode(this.codeInput());
    if (!validation.valid) return false;
    if (this.needsPassword() && !this.roomPassword().trim()) return false;
    return !this.loading();
  });

  recentRooms = computed(() => this.roomService.recentRooms());

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private roomService: RoomService,
    private adminService: AdminService,
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('codigo');
    if (code) {
      this.codeInput.set(code);
      this.onCodeChange(code); // força verificação inicial
    }
  }

  onCodeChange(value: string): void {
    const result = this.roomService.validateCode(value);
    this.validationError.set(result.valid || !value ? null : (result.error ?? null));

    // Se código válido, verifica privacidade
    if (value.length >= 3 && !result.error) {
      this.checkPrivacy(value);
    } else {
      this.needsPassword.set(false);
      this.roomPassword.set('');
      this.passwordError.set(null);
    }
  }

  private async checkPrivacy(code: string) {
    this.privateCheckLoading.set(true);
    try {
      const normalized = this.roomService.normalizeCode(code);
      console.log('[checkPrivacy] verificando código:', normalized);
      const room = await this.adminService.getRoom(normalized);
      console.log('[checkPrivacy] resposta do servidor:', room);
      const isPrivate = room?.is_private ?? false;
      this.needsPassword.set(isPrivate);
      if (!isPrivate) {
        this.roomPassword.set('');
        this.passwordError.set(null);
      }
    } catch (err) {
      console.error('[checkPrivacy] erro:', err);
      this.needsPassword.set(false);
    } finally {
      this.privateCheckLoading.set(false);
    }
  }

  generateCode(): void {
    this.codeInput.set(this.roomService.generateCode());
    this.validationError.set(null);
  }

  async enter(): Promise<void> {
    if (!this.canEnter()) return;

    const validation = this.roomService.validateCode(this.codeInput());
    if (!validation.valid) {
      this.validationError.set(validation.error ?? 'Código inválido');
      return;
    }

    const normalized = this.roomService.normalizeCode(this.codeInput());

    // Se precisa de senha, valida com o backend
    if (this.needsPassword()) {
      const senha = this.roomPassword().trim();
      if (!senha) {
        this.passwordError.set('Senha obrigatória para sala privada');
        return;
      }

      // 👇 verificação real
      const valida = await this.adminService.checkRoomPassword(normalized, senha);
      if (!valida) {
        this.passwordError.set('Senha incorreta');
        return;
      }
    }

    this.loading.set(true);

    await this.adminService.upsertRoom(normalized, {
      display_name: normalized,
      is_private: false, // ou mantenha o estado, depende da regra
    });

    const name =
      this.nameInput.trim() || (this.chosenRole() === 'driver' ? 'Motorista' : 'Passageiro');

    this.roomService.enterRoom(normalized, this.chosenRole(), name, this.roomPassword());

    setTimeout(() => {
      this.router.navigate(['/rastreamento', normalized], {
        queryParams: { role: this.chosenRole(), name },
      });
    }, 600);
  }

  useRecent(room: RoomMeta): void {
    this.codeInput.set(room.code);
    this.chosenRole.set(room.role);
    this.nameInput = room.name;
    this.validationError.set(null);
    this.onCodeChange(room.code);
  }

  clearRecent(): void {
    this.roomService.clearRecent();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  formatTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 2) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  }
}
