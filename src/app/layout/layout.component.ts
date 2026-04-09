import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../pages/sidebar.component/sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>

      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .layout {
        display: flex;
      }

      .content {
        margin-left: 260px; /* largura da sidebar */
        padding: 20px;
        width: 100%;
      }
    `,
  ],
})
export class LayoutComponent {}
