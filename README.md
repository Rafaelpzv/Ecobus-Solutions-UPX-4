# 🚌 EcoBus Solutions

> Sistema web de mobilidade urbana que conecta passageiros e motoristas em tempo real através de sinais digitais nos pontos de ônibus.

---

## 📌 Sobre o Projeto

O **EcoBus Solutions** é uma aplicação desenvolvida com foco em tornar o transporte público mais eficiente e sustentável.

A plataforma permite que passageiros sinalizem sua presença em pontos de ônibus e que motoristas visualizem a demanda em tempo real — possibilitando decisões mais inteligentes durante a rota e evitando que ônibus passem direto em pontos com passageiros aguardando.

---

## 🎯 Objetivos

- Reduzir a perda de viagens por falta de comunicação
- Evitar que ônibus ignorem pontos com passageiros
- Melhorar a comunicação entre passageiros e operação
- Otimizar rotas com base em demanda real

---

## ⚙️ Funcionalidades

### 🏠 Página Inicial
Apresentação do sistema com chamada para ação (CTA) direcionando o usuário ao rastreamento.

### 📡 Entrada em Sala (`/sala`)
Página de entrada para sessões de rastreamento. O usuário:
- Escolhe seu papel: **Motorista** ou **Passageiro**
- Informa seu nome (opcional)
- Digita ou gera um **código de sala** único
- Acessa salas recentes com um clique

### 🗺️ Rastreamento Personalizado (`/rastreamento/:codigo`)
Rastreamento em tempo real vinculado a uma sala específica:
- Conexão ao canal da sala via **Supabase Realtime**
- Mapa interativo com **Leaflet** mostrando posições de todos os participantes
- Sidebar com posição GPS própria, lista de peers e log de sinais
- GPS ativo com envio contínuo de localização
- **Emissão de sinal de embarque** (passageiros): informa ponto, número de passageiros e localização
- Indicador de latência e estado da conexão (conectando / conectado / erro)
- Copiar código da sala para compartilhamento

### 🚌 Rastreamento Legado (`/rastreamento`)
Versão anterior do rastreamento com lobby integrado — mantida para compatibilidade.

---

## 🏗️ Estrutura do Projeto

```
src/
└── app/
    ├── pages/
    │   ├── home.component/          # Página inicial
    │   ├── room-entry.component/    # Entrada por código de sala (/sala)
    │   ├── custom-tracking.component/ # Rastreamento por sala (/rastreamento/:codigo)
    │   └── tracking.component/      # Rastreamento legado (/rastreamento)
    │
    ├── services/
    │   ├── supabase.service.ts      # Conexão Realtime, Presence, Broadcast
    │   ├── location.service.ts      # GPS via Geolocation API
    │   └── room.service.ts          # Lógica de sala: validação, normalização, histórico
    │
    ├── environment/
    │   ├── environment.ts           # Variáveis de ambiente (dev)
    │   └── environment.prod.ts      # Variáveis de ambiente (prod)
    │
    ├── app.routes.ts                # Definição de rotas
    ├── app.component.ts             # Componente raiz
    └── app.config.ts                # Configuração do Angular
```

### Fluxo de navegação

```
Home
 └──[Emitir Sinal]──→ /sala
                        └──[Entrar na Sala]──→ /rastreamento/:codigo
                                                ├── Loading (conectando Supabase)
                                                ├── Connected (mapa + sidebar)
                                                └── Error (retry / voltar)
```

### Serviços principais

| Serviço | Responsabilidade |
|---|---|
| `SupabaseService` | Canal Realtime, Presence (peers), Broadcast (localização e sinais) |
| `LocationService` | Geolocalização via browser, emite posição continuamente |
| `RoomService` | Validação e normalização de código, histórico no localStorage, ciclo de vida da sala |

---

## 🌍 Impacto (ODS)

Alinhado com os Objetivos de Desenvolvimento Sustentável da ONU:

| ODS | Descrição |
|---|---|
| **ODS 11** | Cidades e Comunidades Sustentáveis |
| **ODS 9** | Indústria, Inovação e Infraestrutura |
| **ODS 13** | Ação Contra a Mudança do Clima |

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| Angular 21 | Framework principal (standalone components, signals) |
| TypeScript | Tipagem e lógica |
| Supabase | Backend Realtime (Presence + Broadcast) |
| Leaflet | Mapa interativo |
| HTML5 / CSS3 | Interface e responsividade |

---

## 🚀 Como rodar o projeto

```bash
# Clonar o repositório
git clone https://github.com/Rafaelpzv/Ecobus-Solutions-UPX-4.git

# Entrar na pasta
cd Ecobus-Solutions-UPX-4

# Instalar dependências
npm install

# Rodar em desenvolvimento
ng serve -o
```

Acesse em: `http://localhost:4200`

---

## 👨‍💻 Equipe

| Nome |
|---|
| Rafael Perez Viana |
| Daniel Henrique da Silva |
| Iago A. M. Monaco |
| Kelvin Henrique Garrido |
| Erik William de Mattos |

Projeto desenvolvido no **Centro Universitário FACENS** — Sorocaba, SP — 2026

---

## 📄 Licença

Projeto acadêmico, sem fins lucrativos.