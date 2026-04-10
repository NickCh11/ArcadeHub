import { createClient } from '@supabase/supabase-js';
import type { Socket } from 'socket.io';
import type { AuthenticatedSocket } from '../types';
import type { PresenceStatus } from '../redis/presence';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export function createSocketAuthMiddleware() {
  return async (socket: Socket, next: (err?: Error) => void) => {
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
  };
}
