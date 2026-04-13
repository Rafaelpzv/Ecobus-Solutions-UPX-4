/**
 * EcoBus Solutions — WebSocket Server
 * Gerencia salas de rastreamento em tempo real entre motoristas e passageiros
 *
 * Protocolo de mensagens (JSON):
 *
 * Cliente → Servidor:
 *   { type: 'join',     role: 'driver'|'passenger', room: string, name?: string }
 *   { type: 'location', lat: number, lng: number, speed?: number, heading?: number }
 *   { type: 'signal',   stop: string, count: number }   (passageiro emite sinal de embarque)
 *   { type: 'ping' }
 *
 * Servidor → Cliente:
 *   { type: 'joined',       role, room, clientId, peers: [...] }
 *   { type: 'peer_joined',  clientId, role, name }
 *   { type: 'peer_left',    clientId, role, name }
 *   { type: 'location',     clientId, role, name, lat, lng, speed, heading, timestamp }
 *   { type: 'signal',       clientId, name, stop, count, timestamp }
 *   { type: 'room_info',    room, drivers: N, passengers: N }
 *   { type: 'error',        message }
 *   { type: 'pong' }
 */

const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

// rooms: Map<roomId, Map<clientId, { ws, role, name, lastLocation, joinedAt }>>
const rooms = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(room, data, excludeId = null) {
  const clients = rooms.get(room);
  if (!clients) return;
  for (const [id, client] of clients) {
    if (id !== excludeId) send(client.ws, data);
  }
}

function broadcastRoomInfo(room) {
  const clients = rooms.get(room);
  if (!clients) return;
  let drivers = 0,
    passengers = 0;
  for (const c of clients.values()) {
    if (c.role === 'driver') drivers++;
    else passengers++;
  }
  broadcast(room, { type: 'room_info', room, drivers, passengers });
}

function leaveRoom(clientId) {
  for (const [roomId, clients] of rooms) {
    if (clients.has(clientId)) {
      const client = clients.get(clientId);
      clients.delete(clientId);
      if (clients.size === 0) {
        rooms.delete(roomId);
        console.log(`[room] "${roomId}" fechada (vazia)`);
      } else {
        broadcast(roomId, { type: 'peer_left', clientId, role: client.role, name: client.name });
        broadcastRoomInfo(roomId);
        console.log(`[left] ${client.name} (${client.role}) saiu de "${roomId}"`);
      }
      return;
    }
  }
}

// ── Connection handler ────────────────────────────────────────────────────────

wss.on('connection', (ws, req) => {
  const clientId = uuidv4().slice(0, 8);
  const ip = req.socket.remoteAddress;
  console.log(`[conn] ${clientId} conectado de ${ip}`);

  ws.clientId = clientId;
  ws.currentRoom = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return send(ws, { type: 'error', message: 'JSON inválido' });
    }

    switch (msg.type) {
      // ── JOIN ──────────────────────────────────────────────────────────────
      case 'join': {
        const { role, room, name } = msg;

        if (!room || !role) {
          return send(ws, { type: 'error', message: '"room" e "role" são obrigatórios' });
        }
        if (role !== 'driver' && role !== 'passenger') {
          return send(ws, { type: 'error', message: 'role deve ser "driver" ou "passenger"' });
        }

        // Sair da sala anterior, se houver
        if (ws.currentRoom) leaveRoom(clientId);

        if (!rooms.has(room)) rooms.set(room, new Map());
        const clients = rooms.get(room);

        const displayName = (name || '').trim() || (role === 'driver' ? 'Motorista' : 'Passageiro');

        clients.set(clientId, {
          ws,
          role,
          name: displayName,
          lastLocation: null,
          joinedAt: Date.now(),
        });
        ws.currentRoom = room;

        // Lista de peers já na sala (sem o próprio)
        const peers = [];
        for (const [id, c] of clients) {
          if (id !== clientId) {
            peers.push({ clientId: id, role: c.role, name: c.name, lastLocation: c.lastLocation });
          }
        }

        send(ws, { type: 'joined', clientId, role, room, displayName, peers });

        // Notificar os outros
        broadcast(room, { type: 'peer_joined', clientId, role, name: displayName }, clientId);
        broadcastRoomInfo(room);

        console.log(`[join] ${displayName} (${role}) → sala "${room}" | total: ${clients.size}`);
        break;
      }

      // ── LOCATION ──────────────────────────────────────────────────────────
      case 'location': {
        const room = ws.currentRoom;
        if (!room) return send(ws, { type: 'error', message: 'Entre em uma sala primeiro' });

        const clients = rooms.get(room);
        const me = clients?.get(clientId);
        if (!me) break;

        const { lat, lng, speed, heading, accuracy } = msg;
        if (typeof lat !== 'number' || typeof lng !== 'number') break;

        const location = {
          lat,
          lng,
          speed: speed ?? 0,
          heading: heading ?? 0,
          accuracy: accuracy ?? 0,
        };
        me.lastLocation = { ...location, timestamp: Date.now() };

        broadcast(
          room,
          {
            type: 'location',
            clientId,
            role: me.role,
            name: me.name,
            lat,
            lng,
            speed: location.speed,
            heading: location.heading,
            accuracy: location.accuracy,
            timestamp: me.lastLocation.timestamp,
          },
          clientId,
        );
        break;
      }

      // ── SIGNAL (passageiro emite sinal no ponto) ──────────────────────────
      case 'signal': {
        const room = ws.currentRoom;
        if (!room) return send(ws, { type: 'error', message: 'Entre em uma sala primeiro' });

        const clients = rooms.get(room);
        const me = clients?.get(clientId);
        if (!me) break;

        broadcast(room, {
          type: 'signal',
          clientId,
          name: me.name,
          stop: msg.stop || 'Ponto desconhecido',
          count: msg.count || 1,
          lat: msg.lat,
          lng: msg.lng,
          timestamp: Date.now(),
        });

        console.log(`[signal] ${me.name} emitiu sinal em "${msg.stop}" (${msg.count ?? 1} pass.)`);
        break;
      }

      // ── PING ──────────────────────────────────────────────────────────────
      case 'ping':
        send(ws, { type: 'pong', timestamp: Date.now() });
        break;

      default:
        send(ws, { type: 'error', message: `Tipo desconhecido: ${msg.type}` });
    }
  });

  ws.on('close', () => {
    leaveRoom(clientId);
    console.log(`[disc] ${clientId} desconectado`);
  });

  ws.on('error', (err) => {
    console.error(`[err] ${clientId}:`, err.message);
  });
});

// ── Status log periódico ──────────────────────────────────────────────────────
setInterval(() => {
  let total = 0;
  for (const [roomId, clients] of rooms) {
    total += clients.size;
    console.log(`[status] sala "${roomId}": ${clients.size} cliente(s)`);
  }
  if (rooms.size === 0) console.log('[status] nenhuma sala ativa');
}, 30_000);

console.log(`\n🚌 EcoBus WebSocket Server rodando na porta ${PORT}`);
console.log(`   ws://localhost:${PORT}\n`);
