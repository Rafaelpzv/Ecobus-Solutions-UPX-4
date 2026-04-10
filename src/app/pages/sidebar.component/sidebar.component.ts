import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed">
      <div class="sidebar-logo">
        <div class="logo-icon">🚌</div>
        @if (!collapsed) {
          <div class="logo-text">
            <span class="brand">EcoBus</span>
            <span class="tagline">Solutions</span>
          </div>
        }
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.path === 'dashboard' }"
            class="nav-item"
            [title]="collapsed ? item.label : ''"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            @if (!collapsed) {
              <span class="nav-label">{{ item.label }}</span>
              @if (item.badge) {
                <span class="nav-badge">{{ item.badge }}</span>
              }
            }
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        @if (!collapsed) {
          <div class="user-info">
            <div class="avatar">RV</div>
            <div class="user-details">
              <span class="user-name">Rafael Viana</span>
              <span class="user-role">Administrador</span>
            </div>
          </div>
        } @else {
          <div class="avatar small">RV</div>
        }
      </div>
    </aside>
  `,
  styles: [
    `
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        width: var(--sidebar-w);
        background: var(--bg-surface);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        z-index: 100;
        transition: width 250ms cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
        &.collapsed {
          width: 72px;
        }
      }
      .sidebar-logo {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 18px;
        border-bottom: 1px solid var(--border);
        min-height: 72px;
      }
      .logo-icon {
        width: 36px;
        height: 36px;
        background: var(--primary-soft);
        border: 1px solid rgba(0, 230, 118, 0.3);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
      }
      .logo-text {
        overflow: hidden;
        white-space: nowrap;
      }
      .brand {
        display: block;
        font-family: 'Exo 2', sans-serif;
        font-weight: 800;
        font-size: 17px;
        color: var(--primary);
      }
      .tagline {
        display: block;
        font-size: 11px;
        color: var(--text-muted);
        font-weight: 500;
        letter-spacing: 0.5px;
      }
      .sidebar-nav {
        flex: 1;
        padding: 12px 10px;
        overflow-y: auto;
        overflow-x: hidden;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 11px 12px;
        border-radius: var(--radius-md);
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        margin-bottom: 2px;
        transition: all var(--transition);
        position: relative;
        &:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-primary);
        }
        &.active {
          background: var(--primary-soft);
          color: var(--primary);
          border: 1px solid rgba(0, 230, 118, 0.15);
          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 20%;
            bottom: 20%;
            width: 3px;
            border-radius: 2px;
            background: var(--primary);
          }
        }
      }
      .nav-icon {
        font-size: 18px;
        flex-shrink: 0;
        width: 24px;
        text-align: center;
      }
      .nav-label {
        flex: 1;
      }
      .nav-badge {
        background: var(--primary);
        color: var(--text-inverse);
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 10px;
        min-width: 20px;
        text-align: center;
      }
      .sidebar-footer {
        padding: 16px 14px;
        border-top: 1px solid var(--border);
      }
      .user-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--primary), var(--teal));
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Exo 2', sans-serif;
        font-weight: 700;
        font-size: 13px;
        color: var(--text-inverse);
        flex-shrink: 0;
        &.small {
          width: 36px;
          height: 36px;
        }
      }
      .user-details {
        overflow: hidden;
      }
      .user-name {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .user-role {
        display: block;
        font-size: 11px;
        color: var(--text-muted);
      }
      @media (max-width: 768px) {
        .sidebar {
          transform: translateX(-100%);
          &.collapsed {
            transform: translateX(-100%);
          }
        }
      }
    `,
  ],
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  navItems: NavItem[] = [
    { path: 'dashboard', icon: '📊', label: 'Dashboard' },
    { path: 'rastreamento', icon: '📡', label: 'Rastreamento', badge: 'LIVE' },
    { path: 'sinais', icon: '📍', label: 'Sinais', badge: '3' },
    { path: 'painel-motorista', icon: '🚌', label: 'Painel Motorista' },
    { path: 'mapa', icon: '🗺️', label: 'Mapa ao Vivo' },
    { path: 'historico', icon: '📋', label: 'Histórico' },
    { path: 'rotas', icon: '🛣️', label: 'Rotas' },
  ];
}
