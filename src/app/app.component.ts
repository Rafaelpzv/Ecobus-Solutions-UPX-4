import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './pages/sidebar.component/sidebar.component';
import { NavbarComponent } from './pages/navbar.component/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, NavbarComponent],
  template: `
    @if (isHome()) {
      <router-outlet />
    } @else {
      <div class="app-shell">
        <app-sidebar [collapsed]="sidebarCollapsed()" (toggleCollapse)="toggleSidebar()" />
        <div class="main-area" [class.collapsed]="sidebarCollapsed()">
          <app-navbar [sidebarCollapsed]="sidebarCollapsed()" (toggleSidebar)="toggleSidebar()" />
          <main class="content-area">
            <router-outlet />
          </main>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .app-shell {
        display: flex;
        height: 100vh;
        overflow: hidden;
        background: var(--bg-base);
      }
      .main-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        margin-left: var(--sidebar-w);
        transition: margin-left 250ms cubic-bezier(0.4, 0, 0.2, 1);
        &.collapsed {
          margin-left: 72px;
        }
      }
      .content-area {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
      }
      @media (max-width: 768px) {
        .main-area {
          margin-left: 0 !important;
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  sidebarCollapsed = signal(false);
  isHome = signal(false);

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.isHome.set(e.urlAfterRedirects === '/');
    });
    this.isHome.set(this.router.url === '/');
  }

  toggleSidebar() {
    this.sidebarCollapsed.update((v) => !v);
  }
}
