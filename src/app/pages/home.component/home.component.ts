import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: `./home.component.html`,
  styleUrl: './home.component.css',
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
