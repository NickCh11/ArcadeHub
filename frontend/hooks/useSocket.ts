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

    // Keep presence TTL alive — every 25s while the tab is active
    const ping = setInterval(() => {
      if (document.visibilityState === 'visible') {
        socket.emit('ping-presence');
      }
    }, 25_000);

    // When the tab becomes visible again after being hidden:
    // - Ping presence immediately (avoid the up-to-25s gap)
    // - Reconnect if the socket dropped while the tab was in the background
    const handleVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const s = socketRef.current;
      if (!s) return;
      s.emit('ping-presence');
      if (!s.connected) {
        s.connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      clearInterval(ping);
      document.removeEventListener('visibilitychange', handleVisible);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [token]);

  return { socket: socketRef.current, connected };
}
