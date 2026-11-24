import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  advanceToNextRound,
  allConnectedPlayersAnswered,
  createRoomState,
  finalizeCurrentRound,
  generateRoomCode,
  joinPlayer,
  recordPlayerAnswer,
  setRoomCurriculumOverrides,
  setRoomCustomQuestions,
  startMatch,
  switchPlayerTeam,
  toPublicRoomState,
  updateRoomSettings,
  validatePlayerName,
  validateRoomCode,
} from './src/game/engine.ts';
import type { ClientMessage, InternalRoomState, ServerMessage } from './src/game/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ClientSession {
  ws: WebSocket;
  playerId: string;
  roomCode: string | null;
}

interface ManagedRoom {
  state: InternalRoomState;
  clients: Map<string, WebSocket>;
  roundTimer: ReturnType<typeof setTimeout> | null;
  finalizeDelayTimer: ReturnType<typeof setTimeout> | null;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, ManagedRoom>();

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastRoom(managed: ManagedRoom): void {
  const payload: ServerMessage = {
    type: 'room_state',
    room: toPublicRoomState(managed.state, Date.now()),
  };
  const serialized = JSON.stringify(payload);
  for (const ws of managed.clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(serialized);
    }
  }
}

function clearRoomTimers(managed: ManagedRoom): void {
  if (managed.roundTimer) {
    clearTimeout(managed.roundTimer);
    managed.roundTimer = null;
  }
  if (managed.finalizeDelayTimer) {
    clearTimeout(managed.finalizeDelayTimer);
    managed.finalizeDelayTimer = null;
  }
}

function scheduleRoundTimer(managed: ManagedRoom): void {
  clearRoomTimers(managed);
  if (managed.state.phase !== 'playing' || !managed.state.roundEndsAtMs) return;

  const remainingMs = Math.max(500, managed.state.roundEndsAtMs - Date.now());
  managed.roundTimer = setTimeout(() => {
    managed.roundTimer = null;
    if (managed.state.phase === 'playing') {
      finalizeCurrentRound(managed.state);
      broadcastRoom(managed);
    }
  }, remainingMs);
}

function createUniqueRoomCode(): string {
  for (let i = 0; i < 40; i++) {
    const code = generateRoomCode();
    if (!rooms.has(code)) return code;
  }
  return generateRoomCode();
}

function detachClientFromCurrentRoom(session: ClientSession): void {
  if (!session.roomCode) return;
  const managed = rooms.get(session.roomCode);
  session.roomCode = null;
  if (!managed) return;

  managed.clients.delete(session.playerId);
  const player = managed.state.players.find((p) => p.id === session.playerId);
  if (player) {
    player.connected = false;
  }

  // Promote a new host if the host disconnected
  if (managed.state.hostId === session.playerId) {
    const nextHost = managed.state.players.find((p) => p.connected);
    if (nextHost) {
      managed.state.players.forEach((p) => {
        p.isHost = p.id === nextHost.id;
      });
      managed.state.hostId = nextHost.id;
    }
  }

  // If everyone remaining has answered during playing phase, finalize
  if (managed.state.phase === 'playing' && allConnectedPlayersAnswered(managed.state)) {
    clearRoomTimers(managed);
    finalizeCurrentRound(managed.state);
  }

  broadcastRoom(managed);

  // Schedule cleanup if no connected clients remain
  if (managed.clients.size === 0) {
    if (managed.cleanupTimer) clearTimeout(managed.cleanupTimer);
    managed.cleanupTimer = setTimeout(() => {
      if (managed.clients.size === 0) {
        clearRoomTimers(managed);
        rooms.delete(managed.state.code);
      }
    }, 5 * 60 * 1000);
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const validation = validateRoomCode(req.params.code ?? '');
    if (!validation.ok) {
      res.status(400).json({ exists: false, error: validation.error });
      return;
    }
    const managed = rooms.get(validation.value);
    if (!managed) {
      res.status(404).json({ exists: false, error: 'ئەم کۆدی ژوورە نەدۆزرایەوە.' });
      return;
    }

    const activeStudents = managed.state.players.filter((p) => p.connected && !p.isSupervisor);
    res.json({
      exists: true,
      code: managed.state.code,
      phase: managed.state.phase,
      competitionMode: managed.state.settings.competitionMode,
      difficulty: managed.state.settings.difficulty,
      playerCount: activeStudents.length,
      teams: managed.state.teams.map((t) => ({
        id: t.id,
        name: t.name,
        subtitle: t.subtitle,
        crest: t.crest,
        accent: t.accent,
        playerCount: activeStudents.filter((p) => p.teamId === t.id).length,
      })),
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const session: ClientSession = {
      ws,
      playerId: crypto.randomUUID(),
      roomCode: null,
    };

    ws.on('message', (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(String(raw)) as ClientMessage;
      } catch {
        send(ws, { type: 'error', message: 'داواکاری نادرووستە.' });
        return;
      }

      if (msg.type === 'create_room') {
        const nameRes = validatePlayerName(msg.playerName ?? '');
        if (!nameRes.ok) {
          send(ws, { type: 'error', message: nameRes.error });
          return;
        }
        detachClientFromCurrentRoom(session);

        const code = createUniqueRoomCode();
        const state = createRoomState({
          code,
          hostId: session.playerId,
          hostName: nameRes.value,
          settings: msg.settings,
          customQuestions: msg.customQuestions,
          curriculumOverrides: msg.curriculumOverrides,
          hostAsSupervisor: msg.hostAsSupervisor ?? !msg.autoStart,
        });
        const managed: ManagedRoom = {
          state,
          clients: new Map([[session.playerId, ws]]),
          roundTimer: null,
          finalizeDelayTimer: null,
          cleanupTimer: null,
        };
        rooms.set(code, managed);
        session.roomCode = code;

        if (msg.autoStart) {
          startMatch(managed.state, Date.now());
          scheduleRoundTimer(managed);
        }

        send(ws, {
          type: 'welcome',
          playerId: session.playerId,
          room: toPublicRoomState(managed.state, Date.now()),
        });
        return;
      }

      if (msg.type === 'join_room') {
        const codeRes = validateRoomCode(msg.code ?? '');
        if (!codeRes.ok) {
          send(ws, { type: 'error', message: codeRes.error });
          return;
        }
        const nameRes = validatePlayerName(msg.playerName ?? '');
        if (!nameRes.ok) {
          send(ws, { type: 'error', message: nameRes.error });
          return;
        }

        const managed = rooms.get(codeRes.value);
        if (!managed) {
          send(ws, { type: 'error', message: 'ژوورێک بەم کۆدە نەدۆزرایەوە. دڵنیابە لە کۆدەکە.' });
          return;
        }

        if (managed.cleanupTimer) {
          clearTimeout(managed.cleanupTimer);
          managed.cleanupTimer = null;
        }

        detachClientFromCurrentRoom(session);
        joinPlayer(managed.state, session.playerId, nameRes.value, msg.teamId);
        managed.clients.set(session.playerId, ws);
        session.roomCode = managed.state.code;

        send(ws, {
          type: 'welcome',
          playerId: session.playerId,
          room: toPublicRoomState(managed.state, Date.now()),
        });
        broadcastRoom(managed);
        return;
      }

      if (!session.roomCode) {
        send(ws, { type: 'error', message: 'هێشتا بەشداری هیچ ژوورێک نەبوویت.' });
        return;
      }

      const managed = rooms.get(session.roomCode);
      if (!managed) {
        session.roomCode = null;
        send(ws, { type: 'error', message: 'ژوورەکە داخراوە.' });
        return;
      }

      switch (msg.type) {
        case 'switch_team': {
          if (switchPlayerTeam(managed.state, session.playerId, msg.teamId)) {
            broadcastRoom(managed);
          }
          break;
        }

        case 'update_settings': {
          if (managed.state.hostId !== session.playerId) return;
          updateRoomSettings(managed.state, msg.settings);
          broadcastRoom(managed);
          break;
        }

        case 'set_custom_questions': {
          if (managed.state.hostId !== session.playerId) return;
          setRoomCustomQuestions(managed.state, msg.questions);
          broadcastRoom(managed);
          break;
        }

        case 'set_curriculum_overrides': {
          if (managed.state.hostId !== session.playerId) return;
          setRoomCurriculumOverrides(managed.state, msg.overrides);
          broadcastRoom(managed);
          break;
        }

        case 'start_match': {
          if (managed.state.hostId !== session.playerId) return;
          if (managed.state.phase !== 'lobby') return;
          if (
            managed.state.settings.questionSource === 'custom' &&
            managed.state.customQuestions.length === 0
          ) {
            send(ws, {
              type: 'error',
              message: 'تکایە لانیکەم ١ پرسیاری تایبەت زیاد بکە یان شێوازەکە بگۆڕە بۆ پرسیاری خۆکار (Auto).',
            });
            return;
          }
          startMatch(managed.state, Date.now());
          scheduleRoundTimer(managed);
          broadcastRoom(managed);
          break;
        }

        case 'submit_answer': {
          if (managed.state.phase !== 'playing') return;
          const answer = recordPlayerAnswer(managed.state, session.playerId, msg.payload, Date.now());
          if (!answer) return;

          send(ws, { type: 'answer_ack', answer });
          broadcastRoom(managed);

          if (allConnectedPlayersAnswered(managed.state) && !managed.finalizeDelayTimer) {
            if (managed.roundTimer) {
              clearTimeout(managed.roundTimer);
              managed.roundTimer = null;
            }
            managed.finalizeDelayTimer = setTimeout(() => {
              managed.finalizeDelayTimer = null;
              if (managed.state.phase === 'playing') {
                finalizeCurrentRound(managed.state);
                broadcastRoom(managed);
              }
            }, 420);
          }
          break;
        }

        case 'end_round_now': {
          if (managed.state.hostId !== session.playerId) return;
          if (managed.state.phase !== 'playing') return;
          clearRoomTimers(managed);
          finalizeCurrentRound(managed.state);
          broadcastRoom(managed);
          break;
        }

        case 'next_round': {
          if (managed.state.hostId !== session.playerId) return;
          if (managed.state.phase !== 'round_result') return;
          const nextPhase = advanceToNextRound(managed.state, Date.now());
          if (nextPhase === 'playing') {
            scheduleRoundTimer(managed);
          } else {
            clearRoomTimers(managed);
          }
          broadcastRoom(managed);
          break;
        }

        case 'restart_match': {
          if (managed.state.hostId !== session.playerId) return;
          startMatch(managed.state, Date.now());
          scheduleRoundTimer(managed);
          broadcastRoom(managed);
          break;
        }

        case 'leave_room': {
          detachClientFromCurrentRoom(session);
          break;
        }
      }
    });

    ws.on('close', () => {
      detachClientFromCurrentRoom(session);
    });
  });

  // Keep mobile Safari/Chrome & Cloud Run WebSocket connections alive across proxies
  const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    }
  }, 25_000);
  wss.on('close', () => clearInterval(heartbeatInterval));

  const distDir = path.resolve(__dirname, 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && fs.existsSync(path.join(distDir, 'index.html')));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Accounting Arena server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
