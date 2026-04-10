import { randomUUID } from 'crypto';
import type { Server } from 'socket.io';
import { createSocketAuthMiddleware } from '../middleware/socketAuth';
import type { AuthenticatedSocket } from '../types';
import { createGameLog, finalizeGameLog } from '../db/gameLogs';

interface ChatMessage {
  id: string;
  username: string;
  userId: string;
  text: string;
  timestamp: string;
}

interface BilliardsLobby {
  id: string;
  displayName: string;
  lobbyNum: number;
  playerSocketIds: string[];
  playerUserIds: string[];
  playerUsernames: string[];
  readyUserIds: string[];
  gameStarted: boolean;
  logId: string | null;
  chatMessages: ChatMessage[];
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

interface LobbyInfo {
  id: string;
  displayName: string;
  creatorUsername: string;
  playerCount: number;
  maxPlayers: 2;
  readyUserIds: string[];
  gameStarted: boolean;
}

const lobbies = new Map<string, BilliardsLobby>();
let nextLobbyNum = 0;

function lobbyToInfo(lobby: BilliardsLobby): LobbyInfo {
  return {
    id: lobby.id,
    displayName: lobby.displayName,
    creatorUsername: lobby.playerUsernames[0] ?? 'Unknown',
    playerCount: lobby.playerSocketIds.length,
    maxPlayers: 2,
    readyUserIds: [...lobby.readyUserIds],
    gameStarted: lobby.gameStarted,
  };
}

function getOpenLobbies(): LobbyInfo[] {
  return Array.from(lobbies.values())
    .filter((lobby) => !lobby.gameStarted && lobby.playerSocketIds.length < 2)
    .map(lobbyToInfo);
}

function broadcastLobbyList(ns: ReturnType<Server['of']>) {
  ns.emit('lobby:list', getOpenLobbies());
}

function findLobbyForSocket(socketId: string): BilliardsLobby | null {
  for (const lobby of lobbies.values()) {
    if (lobby.playerSocketIds.includes(socketId)) return lobby;
  }
  return null;
}

function removePlayerFromLobby(lobby: BilliardsLobby, socketId: string, userId: string) {
  const idx = lobby.playerSocketIds.indexOf(socketId);
  if (idx !== -1) {
    lobby.playerSocketIds.splice(idx, 1);
    lobby.playerUserIds.splice(idx, 1);
    lobby.playerUsernames.splice(idx, 1);
  }
  lobby.readyUserIds = lobby.readyUserIds.filter((id) => id !== userId);
}

async function finalizeLobbyGame(
  lobby: BilliardsLobby,
  params: {
    winnerUserId: string | null;
    loserUserId: string | null;
    endReason: 'win' | 'forfeit';
  }
) {
  if (!lobby.logId) return;

  const logId = lobby.logId;
  lobby.logId = null;

  await finalizeGameLog({
    logId,
    winnerId: params.winnerUserId,
    loserId: params.loserUserId,
    endReason: params.endReason,
  });
}

export function initBilliardsNamespace(io: Server): void {
  const billiards = io.of('/billiards');
  billiards.use(createSocketAuthMiddleware());

  billiards.on('connection', (socket) => {
    const authed = socket as AuthenticatedSocket;

    socket.emit('lobby:list', getOpenLobbies());

    socket.on('lobby:create', () => {
      if (findLobbyForSocket(socket.id)) return;

      const lobbyNum = nextLobbyNum++;
      const lobby: BilliardsLobby = {
        id: `billiards-${lobbyNum}`,
        displayName: `8-Ball Pool #${lobbyNum}`,
        lobbyNum,
        playerSocketIds: [socket.id],
        playerUserIds: [authed.user.id],
        playerUsernames: [authed.user.username ?? authed.user.email ?? 'Player'],
        readyUserIds: [],
        gameStarted: false,
        logId: null,
        chatMessages: [],
      };
      lobbies.set(lobby.id, lobby);

      socket.join(lobby.id);
      socket.emit('lobby:joined', lobbyToInfo(lobby));
      socket.emit('roleAssignement', socket.id, 1);

      broadcastLobbyList(billiards);
      console.log(`[Billiards] Lobby created | ${lobby.id} by ${lobby.playerUsernames[0]}`);
    });

    socket.on('lobby:join', ({ lobbyId }: { lobbyId: string }) => {
      const lobby = lobbies.get(lobbyId);

      if (!lobby) {
        socket.emit('lobby:error', 'Lobby not found');
        return;
      }
      if (lobby.gameStarted) {
        socket.emit('lobby:error', 'Game already in progress');
        return;
      }
      if (lobby.playerSocketIds.length >= 2) {
        socket.emit('lobby:error', 'Lobby is full');
        return;
      }
      if (lobby.playerSocketIds.includes(socket.id)) {
        socket.emit('lobby:error', 'Already in this lobby');
        return;
      }

      lobby.playerSocketIds.push(socket.id);
      lobby.playerUserIds.push(authed.user.id);
      lobby.playerUsernames.push(authed.user.username ?? authed.user.email ?? 'Player');
      lobby.readyUserIds = [];

      socket.join(lobby.id);

      billiards.to(lobby.id).emit('roleAssignement', lobby.playerSocketIds[0], 1);
      billiards.to(lobby.id).emit('roleAssignement', lobby.playerSocketIds[1], 2);
      socket.emit('lobby:joined', lobbyToInfo(lobby));
      billiards.to(lobby.id).emit('lobby:updated', lobbyToInfo(lobby));

      broadcastLobbyList(billiards);
      console.log(`[Billiards] Player joined | ${lobby.id} | p2=${lobby.playerUsernames[1]}`);
    });

    socket.on('lobby:leave', () => {
      const lobby = findLobbyForSocket(socket.id);
      if (!lobby || lobby.gameStarted) return;

      removePlayerFromLobby(lobby, socket.id, authed.user.id);
      socket.leave(lobby.id);

      if (lobby.playerSocketIds.length === 0) {
        lobbies.delete(lobby.id);
      } else {
        billiards.to(lobby.id).emit('lobby:updated', lobbyToInfo(lobby));
      }

      broadcastLobbyList(billiards);
    });

    socket.on('game:start-request', async () => {
      const lobby = findLobbyForSocket(socket.id);
      if (!lobby || lobby.playerSocketIds.length < 2 || lobby.gameStarted) return;

      if (!lobby.readyUserIds.includes(authed.user.id)) {
        lobby.readyUserIds.push(authed.user.id);
      }

      billiards.to(lobby.id).emit('lobby:updated', lobbyToInfo(lobby));

      if (lobby.readyUserIds.length < 2) return;

      lobby.gameStarted = true;
      lobby.readyUserIds = [];
      billiards.to(lobby.id).emit('gameStarted');
      billiards.to(lobby.id).emit('lobby:updated', lobbyToInfo(lobby));

      if (!lobby.logId) {
        const sessionId = `${lobby.id}-${Date.now()}`;
        console.log(
          `[Billiards] Game started | ${lobby.id} | ${lobby.playerUsernames[0]} vs ${lobby.playerUsernames[1]}`
        );
        lobby.logId = await createGameLog({
          sessionId,
          gameType: 'billiards',
          player1Id: lobby.playerUserIds[0],
          player2Id: lobby.playerUserIds[1],
        });
      }

      broadcastLobbyList(billiards);
    });

    socket.on('game:end', async () => {
      const lobby = findLobbyForSocket(socket.id);
      if (!lobby || !lobby.gameStarted) return;

      const loserUserId = authed.user.id;
      const winnerUserId = lobby.playerUserIds.find((id) => id !== loserUserId) ?? null;

      console.log(
        `[Billiards] Game ended (manual end) | ${lobby.id} | winner=${winnerUserId} loser=${loserUserId}`
      );

      await finalizeLobbyGame(lobby, {
        winnerUserId,
        loserUserId,
        endReason: 'forfeit',
      });

      billiards.to(lobby.id).emit('forfeit', { forfeitingUserId: loserUserId, reason: 'manual_end' });
      scheduleClose(billiards, lobby, 'manual_end');
    });

    socket.on('game:chat:send', ({ lobbyId, text }: { lobbyId: string; text: string }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return;
      if (!lobby.playerSocketIds.includes(socket.id)) return;

      const trimmed = String(text).trim().slice(0, 500);
      if (!trimmed) return;

      const msg: ChatMessage = {
        id: randomUUID(),
        username: authed.user.username ?? authed.user.email ?? 'Player',
        userId: authed.user.id,
        text: trimmed,
        timestamp: new Date().toISOString(),
      };

      lobby.chatMessages.push(msg);
      if (lobby.chatMessages.length > 100) lobby.chatMessages.shift();

      billiards.to(lobbyId).emit('game:chat:message', msg);
    });

    socket.on('addSpectator', () => {
      const lobby = findLobbyForSocket(socket.id);
      if (lobby) billiards.to(lobby.id).emit('requestBoard');
    });

    socket.on('launching', (mouseData: unknown, profile: unknown) => {
      const lobby = findLobbyForSocket(socket.id);
      if (lobby) billiards.to(lobby.id).emit('opponentLaunching', mouseData, profile);
    });

    socket.on('launchBall', (mouseData: unknown, profile: unknown) => {
      const lobby = findLobbyForSocket(socket.id);
      if (lobby) billiards.to(lobby.id).emit('launchedBall', mouseData, profile);
    });

    socket.on('switchTurns', (profile: unknown) => {
      const lobby = findLobbyForSocket(socket.id);
      if (lobby) billiards.to(lobby.id).emit('turnSwitch', profile);
    });

    socket.on('opponentLoss', async (profile: unknown) => {
      const lobby = findLobbyForSocket(socket.id);
      if (!lobby) return;

      billiards.to(lobby.id).emit('youLoose', profile);

      const winnerUserId = authed.user.id;
      const loserUserId = lobby.playerUserIds.find((id) => id !== winnerUserId) ?? null;
      console.log(
        `[Billiards] Game ended (win) | ${lobby.id} | winner=${winnerUserId} loser=${loserUserId}`
      );
      await finalizeLobbyGame(lobby, {
        winnerUserId,
        loserUserId,
        endReason: 'win',
      });

      scheduleClose(billiards, lobby, 'game_ended');
    });

    socket.on('opponentWin', async (profile: unknown) => {
      const lobby = findLobbyForSocket(socket.id);
      if (!lobby) return;

      billiards.to(lobby.id).emit('youWin', profile);

      const loserUserId = authed.user.id;
      const winnerUserId = lobby.playerUserIds.find((id) => id !== loserUserId) ?? null;
      console.log(
        `[Billiards] Game ended (win) | ${lobby.id} | winner=${winnerUserId} loser=${loserUserId}`
      );
      await finalizeLobbyGame(lobby, {
        winnerUserId,
        loserUserId,
        endReason: 'win',
      });

      scheduleClose(billiards, lobby, 'game_ended');
    });

    socket.on('currentGameSent', (balls: unknown) => {
      const lobby = findLobbyForSocket(socket.id);
      if (lobby) socket.to(lobby.id).emit('ballData', balls, 'spectator');
    });

    socket.on('updateBalls', (balls: unknown, receiver: unknown) => {
      const lobby = findLobbyForSocket(socket.id);
      if (lobby) socket.to(lobby.id).emit('ballData', balls, receiver);
    });

    socket.on('disconnecting', async () => {
      const lobby = findLobbyForSocket(socket.id);
      if (!lobby) return;

      if (lobby.gameStarted) {
        const forfeitingUserId = authed.user.id;
        const winnerUserId = lobby.playerUserIds.find((id) => id !== forfeitingUserId) ?? null;
        console.log(
          `[Billiards] Game ended (forfeit) | ${lobby.id} | forfeiter=${forfeitingUserId} winner=${winnerUserId}`
        );
        await finalizeLobbyGame(lobby, {
          winnerUserId,
          loserUserId: forfeitingUserId,
          endReason: 'forfeit',
        });
      }

      removePlayerFromLobby(lobby, socket.id, authed.user.id);

      billiards.to(lobby.id).emit('forfeit', { forfeitingUserId: authed.user.id, reason: 'disconnect' });
      scheduleClose(billiards, lobby, 'forfeit');
    });
  });
}

function scheduleClose(
  ns: ReturnType<Server['of']>,
  lobby: BilliardsLobby,
  reason: string
) {
  if (lobby.cleanupTimer) clearTimeout(lobby.cleanupTimer);
  lobby.cleanupTimer = setTimeout(() => {
    ns.to(lobby.id).emit('lobby:closed', { reason });
    lobbies.delete(lobby.id);
    broadcastLobbyList(ns);
  }, 3500);
}
