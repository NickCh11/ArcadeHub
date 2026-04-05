import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import { SOCKET_EVENTS } from '../types/events';
import type { SendDMPayload, MarkReadPayload } from '../types/events';
import { saveDMMessage } from '../db/messages';
import { checkRateLimit, checkReplayAttack } from '../middleware/rateLimit';

// Map userId → socketId for direct delivery
const userSocketMap = new Map<string, string>();

export function registerDMHandlers(io: Server, socket: AuthenticatedSocket): void {
  const userId = socket.user.id;

  // Register this socket for the user
  userSocketMap.set(userId, socket.id);
  socket.on('disconnect', () => userSocketMap.delete(userId));

  // Join a personal room so we can target this user directly
  socket.join(`user:${userId}`);

  // Send an encrypted DM
  socket.on(SOCKET_EVENTS.SEND_DM, async (payload: SendDMPayload) => {
    const { message } = payload;

    if (message.senderId !== userId) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'FORBIDDEN', message: 'Sender ID mismatch' });
      return;
    }

    // Rate limit
    const allowed = await checkRateLimit(userId, 'dm');
    if (!allowed) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'RATE_LIMITED', message: 'Too many messages' });
      return;
    }

    // Replay attack check
    const isNew = await checkReplayAttack(message.id);
    if (!isNew) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'DUPLICATE_MESSAGE', message: 'Message already received' });
      return;
    }

    // Timestamp freshness check
    const msgTime = new Date(message.createdAt).getTime();
    if (Date.now() - msgTime > 5 * 60 * 1000) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'STALE_MESSAGE', message: 'Message timestamp too old' });
      return;
    }

    // Persist (only ciphertext + ephemeral pub key)
    await saveDMMessage(
      message.id,
      message.senderId,
      message.recipientId,
      message.ciphertextRecipient,
      message.ciphertextSender,
      message.ephemeralPublicKey
    );

    // Deliver to recipient's personal room (works across multiple server instances via Redis adapter)
    io.to(`user:${message.recipientId}`).emit(SOCKET_EVENTS.NEW_DM, { message });

    // Also echo back to sender (for multi-device support)
    socket.emit(SOCKET_EVENTS.NEW_DM, { message });
  });

  // Mark message as read
  socket.on(SOCKET_EVENTS.MARK_READ, async (payload: MarkReadPayload) => {
    // Notify the other participant that the message was read
    io.to(`user:${payload.conversationWith}`).emit('message-read', {
      messageId: payload.messageId,
      readBy: userId,
    });
  });
}
