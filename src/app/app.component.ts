import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    @if (isHome()) {
      <router-outlet />
    } @else {
      <div class="app-shell">
        <div class="main-area" [class.collapsed]="sidebarCollapsed()">
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
        min-height: calc(100vh - var(--navbar-h));
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;

        background-image:
          radial-gradient(circle at 80% 30%, rgba(255, 0, 0, 0.6), transparent 40%),
          linear-gradient(135deg, #000000 20%, #2b0000 50%, #5a0000 80%, #ff0000 100%);

        background-blend-mode: screen;
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
