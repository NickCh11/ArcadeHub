'use client';

import { useEffect, useRef, useState } from 'react';
import { connectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

export function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Keep presence TTL alive
    const ping = setInterval(() => socket.emit('ping-presence'), 25_000);

    return () => {
      clearInterval(ping);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [token]);

  return { socket: socketRef.current, connected };
}
