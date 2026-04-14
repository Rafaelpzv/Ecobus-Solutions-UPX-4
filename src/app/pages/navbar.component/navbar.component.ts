import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="navbar">
      <div class="navbar-left">
        <button class="toggle-btn" (click)="toggleSidebar.emit()">
          <span></span><span></span><span></span>
        </button>
        <div class="breadcrumb">
          <span class="page-title">{{ currentPage() }}</span>
        </div>
      </div>

      <div class="navbar-right">
        <div class="live-indicator">
          <div class="pulse-dot"></div>
          <span>Sistema Ativo</span>
        </div>
        <div class="time-display">{{ currentTime() }}</div>
      </div>
    </header>
  `,
  styles: [
    `
      .navbar {
        color:white;
        height: var(--navbar-h);
        background: black;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        gap: 16px;
        flex-shrink: 0;
        position: sticky;
        top: 0;
        z-index: 50;
      }
      .navbar-left {
        display: flex;
        align-items: center;
        margin-top: 10px;
        gap: 16px;
      }
      .toggle-btn {
        display: flex;
        flex-direction: column;
        gap: 5px;
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        border-radius: 8px;
        transition: background var(--transition);
        &:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        span {
          display: block;
          width: 20px;
          height: 2px;
          background: var(--text-secondary);
          border-radius: 2px;
          transition: all var(--transition);
        }
      }
      .page-title {
        font-family: 'Exo 2', sans-serif;
        font-weight: 700;
        font-size: 17px;
        color: var(--text-primary);
      }
      .navbar-right {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .live-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--primary);
        background: var(--primary-soft);
        border: 1px solid rgba(0, 230, 118, 0.2);
        padding: 6px 12px;
        border-radius: 20px;
      }
      .icon-btn {
        position: relative;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--border);
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all var(--transition);
        &:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }
      }
      .notif-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--red);
        color: white;
        font-size: 9px;
        font-weight: 700;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .time-display {
        font-family: 'Exo 2', sans-serif;
        font-size: 13px;
        color: var(--text-muted);
        font-weight: 500;
        background: var(--bg-card);
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid var(--border);
      }
      @media (max-width: 600px) {
        .live-indicator {
          display: none;
        }
        .time-display {
          display: none;
        }
      }
    `,
  ],
})
export class NavbarComponent implements OnInit {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  currentPage = signal('Dashboard');
  currentTime = signal('');

  private pageMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/rastreamento': '📡 Rastreamento ao Vivo',
    '/sinais': 'Sinais de Embarque',
    '/painel-motorista': 'Painel do Motorista',
    '/mapa': 'Mapa ao Vivo',
    '/historico': 'Histórico de Embarques',
    '/rotas': 'Gestão de Rotas',
  };

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);

    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentPage.set(this.pageMap[e.urlAfterRedirects] ?? 'EcoBus');
    });
    this.currentPage.set(this.pageMap[this.router.url] ?? 'EcoBus');
  }

  updateTime() {
    this.currentTime.set(
      new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }
}
