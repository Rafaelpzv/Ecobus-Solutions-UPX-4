import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, RoomRecord } from '../../services/admin.service';
import { RoomService } from '../../services/room.service';

const ADMIN_USER = 'adm';
const ADMIN_PASS = '123';

interface RoomView extends RoomRecord {
  users: any[];
  usersLoaded: boolean;
  expanded: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit, OnDestroy {
  // ── Auth
  loggedIn = signal(false);
  loginUser = '';
  loginPass = '';
  loginError = signal('');

  // ── Rooms
  rooms = signal<RoomView[]>([]);
  loading = signal(false);
  searchTerm = '';

  // ── Computed stats
  activeRooms = computed(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    return this.rooms().filter((r) => new Date(r.last_active).getTime() > cutoff).length;
  });
  privateRooms = computed(() => this.rooms().filter((r) => r.is_private).length);
  filteredRooms = computed(() => {
    const term = this.searchTerm.toLowerCase();
    if (!term) return this.rooms();
    return this.rooms().filter(
      (r) => r.code.includes(term) || (r.display_name ?? '').toLowerCase().includes(term),
    );
  });

  // ── Modals
  renameModal = signal<RoomView | null>(null);
  renameValue = '';
  privacyModal = signal<RoomView | null>(null);
  privacyIsPrivate = false;
  privacyPassword = '';
  closeModal = signal<RoomView | null>(null);
  saving = signal(false);
  kicking = signal(false);
  showRenameModal = signal(false);
  showPrivateModal = signal(false);
  showDeleteModal = signal(false);

  // ── Toast
  toast = signal<string | null>(null);
  toastError = signal(false);
  private toastTimeout: any;

  private realtimeSub: any;

  constructor(
    public router: Router,
    private adminService: AdminService,
    private roomService: RoomService,
  ) {}

  ngOnInit(): void {}

  // ── Auth ─────────────────────────────────────────────────────────────────

  login(): void {
    if (this.loginUser.trim() === ADMIN_USER && this.loginPass === ADMIN_PASS) {
      this.loggedIn.set(true);
      this.loginError.set('');
      this.loadRooms();
      this.subscribeRealtime();
    } else {
      this.loginError.set('Usuário ou senha incorretos.');
      this.loginPass = '';
    }
  }

  logout(): void {
    this.loggedIn.set(false);
    this.rooms.set([]);
    if (this.realtimeSub) this.adminService.removeChannel(this.realtimeSub);
  }

  // ── Rooms ─────────────────────────────────────────────────────────────────

  async loadRooms(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.adminService.getRooms();
      // Preserve expanded state for already-loaded rooms
      const current = this.rooms();
      this.rooms.set(
        data.map((r) => {
          const existing = current.find((c) => c.code === r.code);
          return {
            ...r,
            users: existing?.users ?? [],
            usersLoaded: existing?.usersLoaded ?? false,
            expanded: existing?.expanded ?? false,
          };
        }),
      );
    } catch (e) {
      this.showToast('Erro ao carregar salas', true);
    } finally {
      this.loading.set(false);
    }
  }

  private subscribeRealtime(): void {
    this.realtimeSub = this.adminService.subscribeToRoomChanges(() => this.loadRooms());
  }

  async toggleExpand(room: RoomView): Promise<void> {
    const isOpening = !room.expanded;

    this.rooms.update((list) =>
      list.map((r) => (r.code === room.code ? { ...r, expanded: isOpening } : r)),
    );

    if (isOpening && !room.usersLoaded) {
      const users = await this.adminService.getRoomUsers(room.code);

      this.rooms.update((list) =>
        list.map((r) => (r.code === room.code ? { ...r, users, usersLoaded: true } : r)),
      );
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async kick(code: string, clientId: string): Promise<void> {
    if (this.kicking()) return;
    this.kicking.set(true);
    try {
      await this.adminService.kickUser(code, clientId);
      // Update users list
      const room = this.rooms().find((r) => r.code === code);
      if (room) {
        this.rooms.update((list) =>
          list.map((r) =>
            r.code === code
              ? {
                  ...r,
                  users: r.users.filter((u) => u.clientId !== clientId),
                }
              : r,
          ),
        );
      }
      this.showToast('Usuário expulso com sucesso');
    } catch {
      this.showToast('Erro ao expulsar usuário', true);
    } finally {
      this.kicking.set(false);
    }
  }

  openRename(room: RoomView): void {
    this.renameValue = room.display_name ?? '';
    this.renameModal.set({ ...room });
    this.showRenameModal.set(true);
  }

  async doRename(): Promise<void> {
    const room = this.renameModal();
    if (!room) return;

    this.saving.set(true);
    try {
      await this.adminService.renameRoom(room.code, this.renameValue.trim());

      // Atualiza UI
      this.rooms.update((list) =>
        list.map((r) =>
          r.code === room.code ? { ...r, display_name: this.renameValue.trim() || null } : r,
        ),
      );

      this.renameModal.set(null);
      this.showRenameModal.set(false); // 👈 IMPORTANTE
      this.showToast('Sala renomeada');
    } catch {
      this.showToast('Erro ao renomear', true);
    } finally {
      this.saving.set(false);
    }
  }

  openPrivacy(room: RoomView): void {
    this.privacyIsPrivate = room.is_private;
    this.privacyPassword = room.private_password ?? '';
    this.privacyModal.set({ ...room }); // 👈
    this.showPrivateModal.set(true); // 👈
  }

  async doSetPrivacy(): Promise<void> {
    const room = this.privacyModal();
    if (!room) return;

    this.saving.set(true);
    try {
      await this.adminService.setPrivate(
        room.code,
        this.privacyIsPrivate,
        this.privacyIsPrivate ? this.privacyPassword : null,
      );

      this.rooms.update((list) =>
        list.map((r) =>
          r.code === room.code
            ? {
                ...r,
                is_private: this.privacyIsPrivate,
                private_password: this.privacyIsPrivate ? this.privacyPassword : null,
              }
            : r,
        ),
      );

      this.privacyModal.set(null);
      this.showPrivateModal.set(false); // 👈
      this.showToast('Privacidade atualizada');
    } catch {
      this.showToast('Erro ao atualizar privacidade', true);
    } finally {
      this.saving.set(false);
    }
  }

  confirmClose(room: RoomView): void {
    this.closeModal.set({ ...room }); // 👈
    this.showDeleteModal.set(true); // 👈
  }

  async doClose(): Promise<void> {
    const room = this.closeModal();
    if (!room) return;

    this.saving.set(true);
    try {
      await this.adminService.closeRoom(room.code);

      this.rooms.update((list) => list.filter((r) => r.code !== room.code));

      this.closeModal.set(null);
      this.showDeleteModal.set(false); // 👈
      this.showToast('Sala fechada e usuários desconectados');
    } catch {
      this.showToast('Erro ao fechar sala', true);
    } finally {
      this.saving.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatTime(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 2) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  }

  private showToast(msg: string, error = false): void {
    clearTimeout(this.toastTimeout);
    this.toast.set(msg);
    this.toastError.set(error);
    this.toastTimeout = setTimeout(() => this.toast.set(null), 3000);
  }

  ngOnDestroy(): void {
    if (this.realtimeSub) this.adminService.removeChannel(this.realtimeSub);
    clearTimeout(this.toastTimeout);
  }
}
