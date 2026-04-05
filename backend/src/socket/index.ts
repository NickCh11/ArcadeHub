import type { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import type { AuthenticatedSocket } from '../types';
import { setPresence, refreshPresence, type PresenceStatus } from '../redis/presence';
import { registerGroupChatHandlers } from './groupChat';
import { registerDMHandlers } from './directMessage';
import { SOCKET_EVENTS } from '../_shared/types/events';
import { setIo } from './ioInstance';
import { setUserStatus } from '../db/users';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export function initSocket(io: Server): void {
  setIo(io);
  // JWT auth middleware for Socket.IO connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return next(new Error('Invalid token'));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url, status')
      .eq('id', user.id)
      .single();

    const selectedStatus = ((profile?.status as PresenceStatus | null) ?? 'online');

    (socket as AuthenticatedSocket).user = {
      id: user.id,
      email: user.email!,
      username: profile?.username || user.email!.split('@')[0],
      avatarUrl: profile?.avatar_url,
      status: selectedStatus,
    };
    socket.data.user = (socket as AuthenticatedSocket).user;

    next();
  });

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

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`[Socket] User disconnected: ${authedSocket.user.username}`);
      await setPresence(userId, 'offline');
      io.emit(SOCKET_EVENTS.PRESENCE_UPDATE, { userId, status: 'offline' });
    });
  });
}
