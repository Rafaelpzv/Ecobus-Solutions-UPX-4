import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <div class="home-page">
      <!-- NAV -->
      <nav class="top-nav">
        <div class="nav-brand">
          <span class="brand-icon">🚌</span>
          <span class="brand-name">EcoBus <strong>Solutions</strong></span>
        </div>
        <div class="nav-links">
          <a href="#sobre">Sobre</a>
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#ods">ODS</a>
          <a routerLink="/dashboard" class="btn btn-primary btn-sm">Acessar Plataforma</a>
        </div>
      </nav>

      <!-- HERO -->
      <section class="hero">
        <div class="hero-bg">
          <div class="grid-lines"></div>
          <div class="glow-orb g1"></div>
          <div class="glow-orb g2"></div>
        </div>
        <div class="hero-content">
          <div class="hero-badge">
            <div class="pulse-dot"></div>
            Mobilidade Urbana Sustentável
          </div>
          <h1 class="hero-title">
            Transporte público<br />
            <span class="gradient-text">inteligente e conectado</span>
          </h1>
          <p class="hero-desc">
            EcoBus Solutions permite que passageiros sinalizem sua presença nos pontos de ônibus em
            tempo real, conectando motoristas e passageiros para uma mobilidade mais eficiente e
            sustentável em Sorocaba.
          </p>
          <div class="hero-actions">
            <a routerLink="/dashboard" class="btn btn-primary btn-lg">
              <span>Acessar Dashboard</span> →
            </a>
            <a routerLink="/sinais" class="btn btn-outline btn-lg"> Emitir Sinal </a>
          </div>
          <div class="hero-stats">
            <div class="hero-stat" *ngFor="let stat of heroStats">
              <span class="hs-value">{{ stat.value }}</span>
              <span class="hs-label">{{ stat.label }}</span>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="bus-card">
            <div class="bc-header">
              <div class="pulse-dot"></div>
              <span>Linha 307 · Ao Vivo</span>
              <span class="badge badge-green">Em rota</span>
            </div>
            <div class="bc-route">Centro → Vila Hortência</div>
            <div class="bc-passengers">
              <div class="pass-row" *ngFor="let p of passengers">
                <div class="pass-dot" [class.active]="p.active"></div>
                <span>{{ p.stop }}</span>
                <span class="pass-count">{{ p.count }} sinal(is)</span>
              </div>
            </div>
            <div class="bc-driver">🚌 Motorista: Carlos Silva · ETA 4 min</div>
          </div>
          <div class="mini-map">
            <div class="map-route"></div>
            @for (dot of mapDots; track dot.label) {
              <div
                class="map-dot"
                [style.left.%]="dot.x"
                [style.top.%]="dot.y"
                [class.active]="dot.active"
              >
                <span class="dot-label">{{ dot.label }}</span>
              </div>
            }
            <div class="bus-icon" style="left: 55%; top: 42%">🚌</div>
          </div>
        </div>
      </section>

      <!-- SOBRE -->
      <section class="section" id="sobre">
        <div class="section-inner">
          <div class="section-tag">O Projeto</div>
          <h2 class="section-title">O que é o EcoBus Solutions?</h2>
          <div class="about-grid">
            <div class="about-text">
              <p>
                O EcoBus Solutions é uma aplicação web voltada à melhoria da comunicação no
                transporte público e fretado, permitindo a interação direta entre passageiros nos
                pontos de embarque e os responsáveis pela operação dos veículos.
              </p>
              <p>
                Desenvolvido como projeto de extensão em Mobilidade e Urbanização Sustentável no
                Centro Universitário FACENS — Sorocaba, SP — 2026.
              </p>
              <div class="team-grid">
                @for (member of team; track member.name) {
                  <div class="team-card">
                    <div class="team-avatar">{{ member.initials }}</div>
                    <div>
                      <div class="team-name">{{ member.name }}</div>
                      <div class="team-role">{{ member.role }}</div>
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="problem-cards">
              @for (p of problems; track p.title) {
                <div class="problem-card">
                  <span class="pc-icon">{{ p.icon }}</span>
                  <div>
                    <div class="pc-title">{{ p.title }}</div>
                    <div class="pc-desc">{{ p.desc }}</div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- FUNCIONALIDADES -->
      <section class="section alt" id="funcionalidades">
        <div class="section-inner">
          <div class="section-tag">Plataforma</div>
          <h2 class="section-title">Funcionalidades Principais</h2>
          <div class="feat-grid">
            @for (feat of features; track feat.title) {
              <div class="feat-card">
                <div class="feat-icon">{{ feat.icon }}</div>
                <h3>{{ feat.title }}</h3>
                <p>{{ feat.desc }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ODS -->
      <section class="section" id="ods">
        <div class="section-inner">
          <div class="section-tag">Impacto Global</div>
          <h2 class="section-title">Alinhamento com as ODS</h2>
          <div class="ods-grid">
            @for (ods of odsItems; track ods.number) {
              <div class="ods-card">
                <div class="ods-number" [style.color]="ods.color">ODS {{ ods.number }}</div>
                <div class="ods-title">{{ ods.title }}</div>
                <div class="ods-desc">{{ ods.desc }}</div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="cta-section">
        <div class="cta-inner">
          <h2>Pronto para transformar a mobilidade urbana?</h2>
          <p>Acesse a plataforma e explore todas as funcionalidades do EcoBus Solutions</p>
          <a routerLink="/dashboard" class="btn btn-primary btn-lg">Acessar a Plataforma →</a>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="footer">
        <div class="footer-inner">
          <div class="footer-brand"><span>🚌</span> <strong>EcoBus Solutions</strong></div>
          <p>Projeto de Extensão — UPX 4 · FACENS · Sorocaba, SP · 2026</p>
          <p class="footer-members">
            Daniel H. da Silva · Erik W. de Mattos · Iago A. M. Monaco · Kelvin H. Garrido · Rafael
            P. Viana
          </p>
        </div>
      </footer>
    </div>
  `,
  styles: [
    `
      .home-page {
        min-height: 100vh;
        background: var(--bg-base);
        overflow-x: hidden;
      }

      /* ── NAV ── */
      .top-nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 40px;
        background: rgba(4, 16, 30, 0.85);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border);
      }
      .nav-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: 'Exo 2', sans-serif;
        font-size: 18px;
        strong {
          color: white;
        }
      }
      .brand-icon {
        font-size: 22px;
      }
      .brand-name {
        color: var(--text-primary);
      }
      .nav-links {
        display: flex;
        align-items: center;
        gap: 28px;
        a:not(.btn) {
          color: white;
          font-size: 14px;
          font-weight: 500;
          transition: color var(--transition);
          &:hover {
            color: var(--primary);
          }
        }
      }

      /* ── HERO ── */
      .hero {
        min-height: 100vh;
        display: flex;
        align-items: center;
        padding: 120px 40px 80px;
        gap: 60px;
        position: relative;
        overflow: hidden;
      }
      .hero-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .grid-lines {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(0, 180, 216, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 180, 216, 0.05) 1px, transparent 1px);
        background-size: 40px 40px;
      }
      .glow-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        &.g1 {
          width: 500px;
          height: 500px;
          background: rgba(0, 230, 118, 0.08);
          top: -100px;
          right: 5%;
        }
        &.g2 {
          width: 400px;
          height: 400px;
          background: rgba(0, 180, 216, 0.08);
          bottom: 0;
          left: 30%;
        }
      }
      .hero-content {
        flex: 1;
        max-width: 600px;
        z-index: 1;
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--primary-soft);
        border: 1px solid rgba(0, 230, 118, 0.2);
        color: var(--primary);
        font-size: 12px;
        font-weight: 600;
        padding: 6px 14px;
        border-radius: 20px;
        margin-bottom: 24px;
      }
      .hero-title {
        font-size: clamp(36px, 5vw, 60px);
        font-weight: 900;
        line-height: 1.1;
        margin-bottom: 20px;
      }
      .gradient-text {
        background: linear-gradient(135deg, var(--primary), var(--teal));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .hero-desc {
        font-size: 16px;
        color: var(--text-secondary);
        line-height: 1.7;
        margin-bottom: 36px;
        max-width: 480px;
      }
      .hero-actions {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 48px;
      }
      .hero-stats {
        display: flex;
        gap: 40px;
      }
      .hero-stat {
        .hs-value {
          display: block;
          font-family: 'Exo 2', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: var(--primary);
        }
        .hs-label {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }
      }

      /* Hero Visual */
      .hero-visual {
        flex: 1;
        max-width: 480px;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .bus-card {
        background: var(--bg-card);
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-lg);
        padding: 20px;
        box-shadow:
          var(--shadow-card),
          0 0 40px rgba(0, 230, 118, 0.06);
      }
      .bc-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 12px;
        span:first-of-type {
          flex: 1;
        }
      }
      .bc-route {
        font-family: 'Exo 2', sans-serif;
        font-size: 16px;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 16px;
      }
      .bc-passengers {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 14px;
      }
      .pass-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--text-secondary);
      }
      .pass-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--text-muted);
        &.active {
          background: var(--primary);
          box-shadow: 0 0 8px var(--primary);
        }
      }
      .pass-count {
        margin-left: auto;
        color: var(--primary);
        font-weight: 600;
        font-size: 12px;
      }
      .bc-driver {
        font-size: 12px;
        color: var(--text-muted);
        padding-top: 12px;
        border-top: 1px solid var(--border);
      }
      .mini-map {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 20px;
        height: 180px;
        position: relative;
        overflow: hidden;
      }
      .map-route {
        position: absolute;
        top: 50%;
        left: 10%;
        right: 10%;
        height: 2px;
        background: linear-gradient(90deg, var(--primary), var(--teal));
        border-radius: 2px;
      }
      .map-dot {
        position: absolute;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--bg-elevated);
        border: 2px solid var(--text-muted);
        transform: translate(-50%, -50%);
        &.active {
          border-color: var(--primary);
          background: var(--primary-glow);
        }
        .dot-label {
          position: absolute;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          color: var(--text-muted);
          white-space: nowrap;
        }
      }
      .bus-icon {
        position: absolute;
        transform: translate(-50%, -50%);
        font-size: 20px;
      }

      /* ── SECTIONS ── */
      .section {
        padding: 80px 40px;
      }
      .section.alt {
        background: var(--bg-surface);
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
      }
      .section-inner {
        max-width: 1200px;
        margin: 0 auto;
      }
      .section-tag {
        display: inline-block;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: var(--primary);
        background: var(--primary-soft);
        border: 1px solid rgba(0, 230, 118, 0.2);
        padding: 4px 12px;
        border-radius: 20px;
        margin-bottom: 16px;
      }
      .section-title {
        font-size: clamp(24px, 4vw, 38px);
        font-weight: 800;
        margin-bottom: 40px;
      }

      /* About */
      .about-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 48px;
        align-items: start;
      }
      .about-text p {
        color: var(--text-secondary);
        line-height: 1.8;
        margin-bottom: 16px;
      }
      .team-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 24px;
      }
      .team-card {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        padding: 10px 14px;
        border-radius: var(--radius-md);
      }
      .team-avatar {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: linear-gradient(135deg, var(--primary), var(--teal));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        color: var(--text-inverse);
        flex-shrink: 0;
      }
      .team-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .team-role {
        font-size: 11px;
        color: var(--text-muted);
      }
      .problem-cards {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .problem-card {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        padding: 16px;
        border-radius: var(--radius-md);
      }
      .pc-icon {
        font-size: 22px;
        flex-shrink: 0;
      }
      .pc-title {
        font-weight: 600;
        font-size: 14px;
        color: var(--text-primary);
        margin-bottom: 4px;
      }
      .pc-desc {
        font-size: 13px;
        color: var(--text-secondary);
      }

      /* Features */
      .feat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }
      .feat-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 24px;
        transition: all var(--transition);
        &:hover {
          border-color: rgba(0, 230, 118, 0.3);
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
      }
      .feat-icon {
        font-size: 28px;
        margin-bottom: 14px;
      }
      .feat-card h3 {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .feat-card p {
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      /* ODS */
      .ods-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }
      .ods-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 24px;
      }
      .ods-number {
        font-family: 'Exo 2', sans-serif;
        font-size: 22px;
        font-weight: 800;
        margin-bottom: 6px;
      }
      .ods-title {
        font-weight: 700;
        font-size: 14px;
        margin-bottom: 8px;
        color: var(--text-primary);
      }
      .ods-desc {
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      /* CTA */
      .cta-section {
        padding: 80px 40px;
        text-align: center;
        background: radial-gradient(ellipse at center, rgba(0, 230, 118, 0.06) 0%, transparent 70%);
      }
      .cta-inner h2 {
        font-size: 36px;
        margin-bottom: 12px;
      }
      .cta-inner p {
        color: var(--text-secondary);
        margin-bottom: 32px;
        font-size: 16px;
      }

      /* Footer */
      .footer {
        padding: 32px 40px;
        border-top: 1px solid var(--border);
        background: var(--bg-surface);
        text-align: center;
      }
      .footer-brand {
        font-size: 18px;
        color: var(--text-primary);
        margin-bottom: 8px;
        strong {
          color: var(--primary);
        }
      }
      .footer p {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .footer-members {
        font-size: 11px;
      }

      @media (max-width: 900px) {
        .hero {
          flex-direction: column;
          padding: 100px 20px 60px;
        }
        .hero-visual {
          max-width: 100%;
        }
        .about-grid {
          grid-template-columns: 1fr;
        }
        .ods-grid {
          grid-template-columns: 1fr;
        }
        .top-nav {
          padding: 14px 20px;
        }
        .nav-links a:not(.btn) {
          display: none;
        }
      }
    `,
  ],
})
export class HomeComponent {
  heroStats = [
    { value: '1.2K', label: 'Sinais emitidos' },
    { value: '98%', label: 'Embarques bem-sucedidos' },
    { value: '5', label: 'Rotas ativas' },
  ];

  passengers = [
    { stop: 'Ponto Central', count: 3, active: true },
    { stop: 'Terminal Norte', count: 1, active: true },
    { stop: 'Av. Paulista', count: 0, active: false },
  ];

  mapDots = [
    { x: 15, y: 50, label: 'Central', active: true },
    { x: 35, y: 50, label: 'Norte', active: true },
    { x: 55, y: 50, label: '(Bus)', active: false },
    { x: 72, y: 50, label: 'Sul', active: false },
    { x: 88, y: 50, label: 'Terminal', active: false },
  ];

  team = [
    { name: 'Rafael Perez Viana', role: 'Desenvolvimento Web', initials: 'RV' },
    { name: 'Daniel Henrique da Silva', role: 'Viabilidade Econômica', initials: 'DH' },
    { name: 'Iago A. M. Monaco', role: 'Business Model Canvas', initials: 'IM' },
    { name: 'Kelvin Henrique Garrido', role: 'Documentação', initials: 'KH' },
    { name: 'Erik William de Mattos', role: 'Validação da Solução', initials: 'EW' },
  ];

  problems = [
    {
      icon: '⚠️',
      title: 'Perda de viagens',
      desc: 'Passageiros perdem o ônibus por falta de sinalização nos pontos',
    },
    {
      icon: '🚌',
      title: 'Ônibus passam direto',
      desc: 'Motoristas pulam paradas por baixa demanda aparente',
    },
    {
      icon: '📵',
      title: 'Sem comunicação',
      desc: 'Nenhuma interação direta entre passageiros e operação',
    },
  ];

  features = [
    {
      icon: '📍',
      title: 'Sinal de Presença',
      desc: 'Passageiros emitem sinal digital informando que aguardam no ponto em tempo real.',
    },
    {
      icon: '🗺️',
      title: 'Rastreamento ao Vivo',
      desc: 'Visualize a localização dos veículos no mapa em tempo real com ETA preciso.',
    },
    {
      icon: '🚌',
      title: 'Painel do Motorista',
      desc: 'Interface dedicada para condutores com alertas de passageiros aguardando.',
    },
    {
      icon: '📊',
      title: 'Dashboard Administrativo',
      desc: 'Dados operacionais completos: rotas mais usadas, horários de pico e desempenho.',
    },
    {
      icon: '🔔',
      title: 'Notificações em Tempo Real',
      desc: 'Alertas instantâneos para passageiros e motoristas sobre chegadas e partidas.',
    },
    {
      icon: '📈',
      title: 'Priorização por Demanda',
      desc: 'Sistema analisa sinais para priorizar paradas com maior número de passageiros.',
    },
    {
      icon: '🛣️',
      title: 'Gestão de Rotas',
      desc: 'Cadastre e gerencie rotas e pontos de embarque com facilidade.',
    },
    {
      icon: '📋',
      title: 'Histórico de Embarques',
      desc: 'Registros completos para análise de padrões e horários de pico.',
    },
  ];

  odsItems = [
    {
      number: 11,
      color: '#f99d26',
      title: 'Cidades e Comunidades Sustentáveis',
      desc: 'Melhora a eficiência do transporte urbano, tornando as cidades mais conectadas e sustentáveis.',
    },
    {
      number: 9,
      color: '#f36e24',
      title: 'Indústria, Inovação e Infraestrutura',
      desc: 'Aplica tecnologia para modernizar e otimizar sistemas de mobilidade urbana.',
    },
    {
      number: 13,
      color: '#3f7e44',
      title: 'Ação Contra a Mudança do Clima',
      desc: 'Reduz circulação desnecessária de veículos, diminuindo emissões de carbono.',
    },
  ];
}
