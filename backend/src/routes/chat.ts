import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getRooms,
  createRoom,
  getRoomWithType,
  getUserRole,
  deleteRoomById,
} from '../db/rooms';
import { getGroupMessages, getDMMessages } from '../db/messages';
import { getIo } from '../socket/ioInstance';
import { SOCKET_EVENTS } from '../_shared/types/events';
import { hasPermission, normalizeRole } from '../_shared/types/permissions';
import { getPresenceBulk } from '../redis/presence';
import type { AuthenticatedUser } from '../types';

const router = Router();

// ── Rooms ──────────────────────────────────────────────────────────────────────

router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await getRooms();
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rooms', authMiddleware, async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const role = normalizeRole(await getUserRole(req.user!.id));
  if (!hasPermission(role, 'room:create_public')) {
    res.status(403).json({ error: 'Missing permission: room:create_public' });
    return;
  }

  try {
    const room = await createRoom(name, req.user!.id);
    res.status(201).json(room);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/rooms/:roomId', authMiddleware, async (req, res) => {
  const roomId = req.params['roomId'] as string;

  try {
    const role = normalizeRole(await getUserRole(req.user!.id));
    if (!hasPermission(role, 'room:delete_any')) {
      res.status(403).json({ error: 'Missing permission: room:delete_any' });
      return;
    }

    await deleteRoomById(roomId);
    res.json({ success: true, roomId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rooms/:roomId/members', authMiddleware, async (req, res) => {
  const roomId = req.params['roomId'] as string;
  try {
    const sockets = await getIo().in(roomId).fetchSockets();
    const uniqueUsers = new Map<string, AuthenticatedUser>();

    sockets.forEach((socket) => {
      const user = socket.data.user as AuthenticatedUser | undefined;
      if (user?.id && !uniqueUsers.has(user.id)) {
        uniqueUsers.set(user.id, user);
      }
    });

    const userIds = [...uniqueUsers.keys()];
    const presenceMap = await getPresenceBulk(userIds);

    const members = userIds.map((userId) => {
      const user = uniqueUsers.get(userId)!;
      return {
        user_id: userId,
        joined_at: null,
        profiles: {
          username: user.username,
          avatar_url: user.avatarUrl ?? null,
          status: user.status ?? presenceMap[userId] ?? 'offline',
        },
      };
    });

    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rooms/:roomId/messages', authMiddleware, async (req, res) => {
  const roomId = req.params['roomId'] as string;
  const limit = Math.min(parseInt(req.query['limit'] as string) || 50, 100);
  try {
    const messages = await getGroupMessages(roomId, limit);
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DMs ────────────────────────────────────────────────────────────────────────

router.get('/dm/:otherUserId/messages', authMiddleware, async (req, res) => {
  const otherUserId = req.params['otherUserId'] as string;
  const limit = Math.min(parseInt(req.query['limit'] as string) || 50, 100);
  try {
    const messages = await getDMMessages(req.user!.id, otherUserId, limit);
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
