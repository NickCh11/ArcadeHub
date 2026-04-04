import type { PresenceStatus } from '../redis/presence';
import type { Socket } from 'socket.io';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  status?: PresenceStatus;
}

export interface AuthenticatedSocket extends Socket {
  user: AuthenticatedUser;
}

export interface AppRequest extends Express.Request {
  user?: AuthenticatedUser;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
