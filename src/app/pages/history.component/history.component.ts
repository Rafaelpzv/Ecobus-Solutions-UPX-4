import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container anim-fade-up">
      <div class="page-header">
        <h1>Histórico de Embarques</h1>
        <p>Registro completo de sinais emitidos e embarques realizados</p>
      </div>

      <!-- FILTROS -->
      <div class="card filters-card">
        <div class="filters-row">
          <div class="filter-group">
            <label>Buscar</label>
            <input
              [(ngModel)]="searchInput"
              placeholder="Ponto, linha ou motorista..."
              class="eco-input"
            />
          </div>

          <div class="filter-group">
            <label>Status</label>
            <select [(ngModel)]="filterStatus" class="eco-select">
              <option value="">Todos</option>
              <option value="embarque_ok">Embarque OK</option>
              <option value="cancelado">Cancelado</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          <!-- BOTÕES -->
          <div style="display:flex; gap:8px; align-items:flex-end">
            <button class="btn btn-primary btn-sm" (click)="applyFilters()">🔍 Pesquisar</button>

            <button class="btn btn-outline-secondary btn-sm" (click)="clearFilters()">
              Limpar
            </button>
          </div>
        </div>
      </div>

      <!-- TABELA -->
      <div class="card table-card">
        <div class="table-header">
          <span>{{ filteredRecords().length }} registros</span>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ponto</th>
              <th>Linha</th>
              <th>Motorista</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            @for (r of paginatedRecords(); track r.id) {
              <tr>
                <td>#{{ r.id }}</td>
                <td>{{ r.stop }}</td>
                <td>{{ r.line }}</td>
                <td>{{ r.driver }}</td>
                <td>
                  <span class="badge" [class]="getStatusBadge(r.status)">
                    {{ r.statusLabel }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>

        <!-- PAGINAÇÃO -->
        <nav>
          <ul class="pagination justify-content-center">
            <li class="page-item" [class.disabled]="currentPage() === 1">
              <button class="page-link" (click)="prevPage()">←</button>
            </li>

            @for (p of pages(); track p) {
              <li class="page-item" [class.active]="p === currentPage()">
                <button class="page-link" (click)="goToPage(p)">
                  {{ p }}
                </button>
              </li>
            }

            <li class="page-item" [class.disabled]="currentPage() === totalPages()">
              <button class="page-link" (click)="nextPage()">→</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  `,
})
export class HistoryComponent {
  // 🔹 filtros
  searchTerm = signal('');
  searchInput = '';
  filterStatus = '';

  // 🔹 paginação
  pageSize = 5;
  currentPage = signal(1);

  // 🔹 ação pesquisar
  applyFilters() {
    this.searchTerm.set(this.searchInput.toLowerCase());
    this.currentPage.set(1);
  }

  // 🔹 dados
  records = [
    {
      id: 127,
      stop: 'Ponto Central',
      line: '307',
      driver: 'Carlos',
      status: 'embarque_ok',
      statusLabel: 'OK',
    },
    {
      id: 126,
      stop: 'Terminal Norte',
      line: '412',
      driver: 'Maria',
      status: 'embarque_ok',
      statusLabel: 'OK',
    },
    {
      id: 125,
      stop: 'Av. SP',
      line: '215',
      driver: 'João',
      status: 'cancelado',
      statusLabel: 'Cancelado',
    },
    {
      id: 124,
      stop: 'Shopping',
      line: '550',
      driver: 'Ana',
      status: 'embarque_ok',
      statusLabel: 'OK',
    },
    {
      id: 123,
      stop: 'FACENS',
      line: '307',
      driver: 'Carlos',
      status: 'embarque_ok',
      statusLabel: 'OK',
    },
    {
      id: 122,
      stop: 'Parque',
      line: '412',
      driver: 'Maria',
      status: 'pendente',
      statusLabel: 'Pendente',
    },
    {
      id: 121,
      stop: 'Centro',
      line: '215',
      driver: 'João',
      status: 'cancelado',
      statusLabel: 'Cancelado',
    },
    {
      id: 120,
      stop: 'Terminal',
      line: '307',
      driver: 'Carlos',
      status: 'embarque_ok',
      statusLabel: 'OK',
    },
  ];

  // 🔹 filtro funcionando
  filteredRecords = computed(() => {
    return this.records.filter((r) => {
      const term = this.searchTerm();

      if (
        term &&
        !r.stop.toLowerCase().includes(term) &&
        !r.driver.toLowerCase().includes(term) &&
        !r.line.includes(term)
      ) {
        return false;
      }

      if (this.filterStatus && r.status !== this.filterStatus) {
        return false;
      }

      return true;
    });
  });

  // 🔹 paginação
  totalPages = computed(() => Math.ceil(this.filteredRecords().length / this.pageSize));

  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  paginatedRecords = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRecords().slice(start, start + this.pageSize);
  });

  // 🔹 ações
  goToPage(page: number) {
    this.currentPage.set(page);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  clearFilters() {
    this.searchInput = '';
    this.searchTerm.set('');
    this.filterStatus = '';
    this.currentPage.set(1);
  }

  getStatusBadge(status: string) {
    if (status === 'embarque_ok') return 'bg-success';
    if (status === 'cancelado') return 'bg-danger';
    return 'bg-warning';
  }
}
