const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // rooms with no activity for 4h are dropped
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion

const rooms = new Map(); // code -> room

function makeRoomCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function publicPlayers(room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
  }));
}

function scoreboard(room) {
  return Array.from(room.players.values())
    .map((p) => ({ id: p.id, name: p.name, score: p.score, points: p.points, connected: p.connected }))
    .sort((a, b) => b.points - a.points);
}

function send(ws, payload) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(payload));
}

function broadcast(room, payload) {
  const data = JSON.stringify(payload);
  room.players.forEach((p) => {
    if (p.ws && p.ws.readyState === 1) p.ws.send(data);
  });
}

function broadcastPlayers(room) {
  broadcast(room, { type: 'players', players: publicPlayers(room), hostId: room.hostId });
}

function broadcastScoreboard(room) {
  broadcast(room, { type: 'scoreboard', players: scoreboard(room) });
}

function startServerRound(room) {
  clearTimeout(room.roundTimeoutId);
  room.players.forEach((p) => { p.answered = false; });
  room.roundStartTime = Date.now();

  broadcast(room, {
    type: 'round',
    index: room.currentIndex,
    total: room.tracks.length,
    startTime: room.roundStartTime,
    durationMs: room.settings.durationMs || 15000,
  });
  broadcastScoreboard(room);

  const revealDelay = (room.settings.durationMs || 15000) + 400;
  room.roundTimeoutId = setTimeout(() => revealRound(room), revealDelay);
}

function everyConnectedPlayerAnswered(room) {
  const connected = Array.from(room.players.values()).filter((p) => p.connected);
  if (connected.length === 0) return false;
  return connected.every((p) => p.answered);
}

function allPlayersConnected(room) {
  const players = Array.from(room.players.values());
  return players.length > 0 && players.every((p) => p.connected);
}

function revealRound(room) {
  clearTimeout(room.roundTimeoutId);
  broadcast(room, { type: 'reveal', index: room.currentIndex });
  room.roundTimeoutId = setTimeout(() => advanceRound(room), room.settings.revealPauseMs || 2500);
}

/* ---------- Pause (manual, host-controlled, or automatic via sync mode) ----------
   Pausing just clears the pending timers and remembers when the pause began;
   resuming shifts roundStartTime forward by however long the pause lasted and
   re-broadcasts the round so every client's timer/audio restarts in sync,
   without touching who has already answered this round. */

function pauseRoom(room, reason) {
  if (!room.started || room.paused) return;
  clearTimeout(room.roundTimeoutId);
  room.paused = true;
  room.pauseReason = reason;
  room.pausedAt = Date.now();
  broadcast(room, { type: 'paused', reason });
}

function resumeRoom(room) {
  if (!room.paused) return;
  const pauseDurationMs = Date.now() - room.pausedAt;
  room.roundStartTime += pauseDurationMs;
  room.paused = false;
  room.pauseReason = null;
  room.pausedAt = null;

  const durationMs = room.settings.durationMs || 15000;
  broadcast(room, {
    type: 'round',
    index: room.currentIndex,
    total: room.tracks.length,
    startTime: room.roundStartTime,
    durationMs,
    resumed: true,
  });

  const elapsed = Math.max(0, Date.now() - room.roundStartTime);
  const remaining = Math.max(0, durationMs - elapsed) + 400;
  room.roundTimeoutId = setTimeout(() => revealRound(room), remaining);
}

function advanceRound(room) {
  room.currentIndex += 1;
  if (room.currentIndex >= room.tracks.length) {
    room.started = false;
    broadcast(room, { type: 'gameOver', players: scoreboard(room) });
    return;
  }
  startServerRound(room);
}

function removePlayerFromRoom(room, player) {
  room.players.delete(player.id);
  if (room.players.size === 0) {
    clearTimeout(room.roundTimeoutId);
    rooms.delete(room.code);
    return;
  }
  if (player.id === room.hostId) {
    room.hostId = room.players.keys().next().value;
  }
  broadcastPlayers(room);
  broadcastScoreboard(room);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('ostquiz multiplayer server is running\n');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let room = null;
  let player = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }

    if (msg.type === 'create') {
      const code = makeRoomCode();
      const id = String(msg.clientId || '').slice(0, 64) || Math.random().toString(36).slice(2);
      room = {
        code,
        hostId: id,
        players: new Map(),
        started: false,
        tracks: [],
        settings: {},
        selectedGames: [],
        currentIndex: -1,
        roundStartTime: 0,
        roundTimeoutId: null,
        lastActivity: Date.now(),
        paused: false,
        pauseReason: null,
        pausedAt: null,
        syncMode: false,
      };
      player = { id, name: String(msg.name || 'Player').slice(0, 20) || 'Player', score: 0, points: 0, answered: false, ws, connected: true };
      room.players.set(id, player);
      rooms.set(code, room);

      send(ws, { type: 'created', code, clientId: id, hostId: room.hostId });
      broadcastPlayers(room);
      broadcastScoreboard(room);
      return;
    }

    if (msg.type === 'join') {
      const code = String(msg.code || '').toUpperCase().trim();
      const target = rooms.get(code);
      if (!target) {
        send(ws, { type: 'error', message: 'room_not_found' });
        return;
      }
      room = target;
      room.lastActivity = Date.now();
      const id = String(msg.clientId || '').slice(0, 64) || Math.random().toString(36).slice(2);
      const existing = room.players.get(id);
      if (existing) {
        existing.ws = ws;
        existing.connected = true;
        player = existing;
      } else {
        player = { id, name: String(msg.name || 'Player').slice(0, 20) || 'Player', score: 0, points: 0, answered: false, ws, connected: true };
        room.players.set(id, player);
      }

      send(ws, {
        type: 'joined',
        code: room.code,
        clientId: id,
        hostId: room.hostId,
        started: room.started,
        selectedGames: room.selectedGames,
        settings: room.settings,
        trackIds: room.tracks,
        syncMode: room.syncMode,
      });
      const willAutoResume = room.paused && room.pauseReason === 'sync' && allPlayersConnected(room);
      if (room.started && room.currentIndex >= 0 && room.currentIndex < room.tracks.length && !willAutoResume) {
        if (room.paused) {
          send(ws, { type: 'paused', reason: room.pauseReason });
        } else {
          send(ws, {
            type: 'round',
            index: room.currentIndex,
            total: room.tracks.length,
            startTime: room.roundStartTime,
            durationMs: room.settings.durationMs || 15000,
          });
        }
      }
      broadcastPlayers(room);
      broadcastScoreboard(room);
      if (willAutoResume) {
        resumeRoom(room);
      }
      return;
    }

    if (!room || !player) return;
    room.lastActivity = Date.now();

    if (msg.type === 'startGame' && player.id === room.hostId) {
      room.tracks = Array.isArray(msg.trackIds) ? msg.trackIds.slice(0, 500).map(String) : [];
      room.settings = msg.settings && typeof msg.settings === 'object' ? msg.settings : {};
      room.selectedGames = Array.isArray(msg.selectedGames) ? msg.selectedGames.slice(0, 50).map(String) : [];
      if (room.tracks.length === 0) return;
      room.started = true;
      room.currentIndex = -1;
      room.paused = false;
      room.pauseReason = null;
      room.pausedAt = null;
      room.players.forEach((p) => { p.score = 0; p.points = 0; p.answered = false; });
      broadcast(room, {
        type: 'gameStarting',
        trackIds: room.tracks,
        selectedGames: room.selectedGames,
        settings: room.settings,
        total: room.tracks.length,
      });
      advanceRound(room);
      return;
    }

    if (msg.type === 'pause' && player.id === room.hostId) {
      pauseRoom(room, 'manual');
      return;
    }

    if (msg.type === 'resume' && player.id === room.hostId) {
      if (room.pauseReason === 'manual') resumeRoom(room);
      return;
    }

    if (msg.type === 'setSyncMode' && player.id === room.hostId) {
      room.syncMode = !!msg.enabled;
      broadcast(room, { type: 'syncMode', enabled: room.syncMode });
      return;
    }

    if (msg.type === 'lobbySettings' && player.id === room.hostId && !room.started) {
      broadcast(room, {
        type: 'lobbySettings',
        selectedGames: Array.isArray(msg.selectedGames) ? msg.selectedGames.slice(0, 50).map(String) : [],
        selectedMode: msg.selectedMode,
        customCount: msg.customCount,
        answerMode: msg.answerMode,
        settings: msg.settings && typeof msg.settings === 'object' ? msg.settings : {},
      });
      return;
    }

    if (msg.type === 'answer') {
      if (!room.started || msg.index !== room.currentIndex || player.answered) return;
      player.answered = true;
      if (msg.correct) {
        player.score += 1;
        player.points += Math.max(0, Math.round(Number(msg.points)) || 0);
      }
      broadcastScoreboard(room);
      if (everyConnectedPlayerAnswered(room)) {
        revealRound(room);
      }
      return;
    }

    if (msg.type === 'leave') {
      removePlayerFromRoom(room, player);
      room = null;
      player = null;
      return;
    }
  });

  ws.on('close', () => {
    if (room && player) {
      player.connected = false;
      broadcastPlayers(room);
      broadcastScoreboard(room);
      if (room.started) {
        if (room.syncMode) {
          pauseRoom(room, 'sync');
        } else if (everyConnectedPlayerAnswered(room)) {
          revealRound(room);
        }
      }
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_TTL_MS) {
      clearTimeout(room.roundTimeoutId);
      rooms.delete(code);
    }
  }
}, 15 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`ostquiz multiplayer server listening on ${PORT}`);
});
