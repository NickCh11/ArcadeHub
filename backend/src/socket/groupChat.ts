import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import { SOCKET_EVENTS } from '../_shared/types/events';
import type {
  JoinRoomPayload,
  LeaveRoomPayload,
  SendPublicMessagePayload,
} from '../_shared/types/events';
import { saveGroupMessage } from '../db/messages';
import { checkRateLimit, checkReplayAttack } from '../middleware/rateLimit';

export function registerGroupChatHandlers(io: Server, socket: AuthenticatedSocket): void {
  const userId = socket.user.id;

  socket.on(SOCKET_EVENTS.JOIN_ROOM, async (payload: JoinRoomPayload) => {
    const { roomId } = payload;
    socket.join(roomId);
    io.to(roomId).emit(SOCKET_EVENTS.USER_JOINED_ROOM, {
      roomId,
      user: {
        id: userId,
        username: socket.user.username,
        avatarUrl: socket.user.avatarUrl,
        status: socket.user.status ?? 'online',
      },
    });
  });

  socket.on(SOCKET_EVENTS.LEAVE_ROOM, async (payload: LeaveRoomPayload) => {
    const { roomId } = payload;
    socket.leave(roomId);
    io.to(roomId).emit(SOCKET_EVENTS.USER_LEFT_ROOM, { roomId, userId });
  });

  socket.on(SOCKET_EVENTS.SEND_PUBLIC_MESSAGE, async (payload: SendPublicMessagePayload) => {
    const { roomId, messageId, text, senderName, senderAvatar, createdAt } = payload;

    const allowed = await checkRateLimit(userId, 'group-msg');
    if (!allowed) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'RATE_LIMITED', message: 'Too many messages' });
      return;
    }

    const isNew = await checkReplayAttack(messageId);
    if (!isNew) return;

    const msgTime = new Date(createdAt).getTime();
    if (Date.now() - msgTime > 5 * 60 * 1000) return;

    await saveGroupMessage(messageId, roomId, userId, null, null, createdAt, text);

    io.to(roomId).emit(SOCKET_EVENTS.NEW_PUBLIC_MESSAGE, {
      roomId, messageId, text, senderId: userId, senderName, senderAvatar, createdAt,
    });
  });
}
