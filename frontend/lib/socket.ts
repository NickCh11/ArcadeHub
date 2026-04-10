'use client';

import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '@/lib/publicUrl';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (!socket) {
    // Only create a new socket if we have none at all.
    // Never replace a socket just because connected === false — it may be
    // in socket.io's own reconnection backoff window, and replacing it
    // would orphan the old socket, cause a spurious disconnect event,
    // and flash the user as offline.
    socket = io(getBackendUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  } else if (token) {
    // Always keep the auth token current so the next reconnect uses the
    // latest session token.
    socket.auth = { token };
  }
  return socket;
}

export function connectSocket(token: string): Socket {
  const s = getSocket(token);
  if (!s.connected) {
    s.auth = { token };
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
