import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import { setPresence, refreshPresence } from '../redis/presence';
import { registerGroupChatHandlers } from './groupChat';
import { registerDMHandlers } from './directMessage';
import { SOCKET_EVENTS } from '../types/events';
import { setIo } from './ioInstance';
import { setUserStatus } from '../db/users';
import { createSocketAuthMiddleware } from '../middleware/socketAuth';

export function initSocket(io: Server): void {
  setIo(io);
  io.use(createSocketAuthMiddleware());

  io.on('connection', async (socket) => {
    const authedSocket = socket as AuthenticatedSocket;
    const userId = authedSocket.user.id;

    console.log(`[Socket] User connected: ${authedSocket.user.username} (${userId})`);

    // Restore the user's selected status on connect
    const activeStatus = authedSocket.user.status ?? 'online';
    await setPresence(userId, activeStatus);
    io.emit(SOCKET_EVENTS.PRESENCE_UPDATE, { userId, status: activeStatus });

    // Register domain handlers
    registerGroupChatHandlers(io, authedSocket);
    registerDMHandlers(io, authedSocket);

    // Presence ping — client sends every 30s to refresh TTL
    socket.on('ping-presence', async () => {
      await refreshPresence(userId);
    });

    // Status update
    socket.on(SOCKET_EVENTS.UPDATE_STATUS, async ({ status }: { status: 'online' | 'away' | 'offline' }) => {
      authedSocket.user.status = status;
      socket.data.user = authedSocket.user;
      await setUserStatus(userId, status);
      await setPresence(userId, status);
      io.emit(SOCKET_EVENTS.PRESENCE_UPDATE, { userId, status });
    });

    // Disconnecting — socket.rooms is still populated here (cleared before 'disconnect')
    // Broadcast USER_LEFT_ROOM to every public room this socket was in so that
    // members panels update immediately without waiting for a client-side LEAVE_ROOM.
    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id || roomId.startsWith('user:')) continue;
        io.to(roomId).emit(SOCKET_EVENTS.USER_LEFT_ROOM, { roomId, userId });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`[Socket] User disconnected: ${authedSocket.user.username}`);
      await setPresence(userId, 'offline');
      io.emit(SOCKET_EVENTS.PRESENCE_UPDATE, { userId, status: 'offline' });
    });
  });
}
