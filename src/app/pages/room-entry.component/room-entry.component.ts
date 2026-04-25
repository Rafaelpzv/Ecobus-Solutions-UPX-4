import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RoomService, RoomMeta } from '../../services/room.service';

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

  normalizedCode = computed(() => this.roomService.normalizeCode(this.codeInput()));

  canEnter = computed(() => {
    const validation = this.roomService.validateCode(this.codeInput());
    return validation.valid && !this.loading();
  });

  recentRooms = computed(() => this.roomService.recentRooms());

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private roomService: RoomService,
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('codigo');
    if (code) {
      this.codeInput.set(code);
    }
  }

  onCodeChange(value: string): void {
    const result = this.roomService.validateCode(value);
    this.validationError.set(result.valid || !value ? null : (result.error ?? null));
  }

  generateCode(): void {
    this.codeInput.set(this.roomService.generateCode());
    this.validationError.set(null);
  }

  enter(): void {
    if (!this.canEnter()) return;

    const validation = this.roomService.validateCode(this.codeInput());
    if (!validation.valid) {
      this.validationError.set(validation.error ?? 'Código inválido');
      return;
    }

    this.loading.set(true);
    const normalized = this.roomService.normalizeCode(this.codeInput());
    const name =
      this.nameInput.trim() || (this.chosenRole() === 'driver' ? 'Motorista' : 'Passageiro');

    this.roomService.enterRoom(normalized, this.chosenRole(), name);

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
