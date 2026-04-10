'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/components/auth/AuthProvider';
import { getBackendUrl } from '@/lib/publicUrl';

export interface LobbyInfo {
  id: string;
  displayName: string;
  creatorUsername: string;
  playerCount: number;
  maxPlayers: 2;
  readyUserIds?: string[];
  gameStarted: boolean;
}

export interface ChatMessage {
  id: string;
  username: string;
  userId: string;
  text: string;
  timestamp: string;
}

export type Phase = 'browse' | 'waiting' | 'playing';

interface BilliardsCtx {
  socket: Socket | null;
  phase: Phase;
  showChat: boolean;
  openLobbies: LobbyInfo[];
  currentLobby: LobbyInfo | null;
  myRole: 'player1' | 'player2' | null;
  chatMessages: ChatMessage[];
  lobbyError: string | null;
  clearLobbyError(): void;
  createLobby(): void;
  joinLobby(id: string): void;
  leaveLobby(): void;
  requestGameStart(): void;
  endGame(): void;
  sendChatMessage(text: string): void;
}

const BilliardsContext = createContext<BilliardsCtx | null>(null);

export function useBilliards(): BilliardsCtx {
  const ctx = useContext(BilliardsContext);
  if (!ctx) throw new Error('useBilliards must be used within BilliardsProvider');
  return ctx;
}

export function BilliardsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [phase, setPhase] = useState<Phase>('browse');
  const [showChat, setShowChat] = useState(false);
  const [openLobbies, setOpenLobbies] = useState<LobbyInfo[]>([]);
  const [currentLobby, setCurrentLobby] = useState<LobbyInfo | null>(null);
  const [myRole, setMyRole] = useState<'player1' | 'player2' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const currentLobbyRef = useRef(currentLobby);
  currentLobbyRef.current = currentLobby;

  useEffect(() => {
    if (!token) return;

    const backendUrl = getBackendUrl();
    const s = io(`${backendUrl}/billiards`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });

    s.connect();

    s.on('lobby:list', (lobbies: LobbyInfo[]) => {
      setOpenLobbies(
        (Array.isArray(lobbies) ? lobbies : []).map((lobby) => ({
          ...lobby,
          readyUserIds: Array.isArray(lobby.readyUserIds) ? lobby.readyUserIds : [],
        }))
      );
    });

    s.on('lobby:joined', (lobby: LobbyInfo) => {
      setCurrentLobby({
        ...lobby,
        readyUserIds: Array.isArray(lobby.readyUserIds) ? lobby.readyUserIds : [],
      });
      setPhase('waiting');
      setShowChat(true);
      setLobbyError(null);
    });

    s.on('lobby:updated', (lobby: LobbyInfo) => {
      setCurrentLobby({
        ...lobby,
        readyUserIds: Array.isArray(lobby.readyUserIds) ? lobby.readyUserIds : [],
      });
    });

    s.on('lobby:error', (msg: string) => {
      setLobbyError(msg);
    });

    s.on('connect_error', (error) => {
      console.error('[Billiards] connect_error', error);
      setLobbyError(error.message || 'Could not connect to the game server');
    });

    s.on('roleAssignement', (id: string, num: number) => {
      if (id !== s.id) return;
      setMyRole(num === 1 ? 'player1' : 'player2');
    });

    s.on('gameStarted', () => {
      setPhase('playing');
      setShowChat(true);
    });

    s.on('forfeit', () => {
      setShowChat(false);
    });

    s.on('youWin', () => {
      setShowChat(false);
    });

    s.on('youLoose', () => {
      setShowChat(false);
    });

    s.on('lobby:closed', () => {
      setPhase('browse');
      setShowChat(false);
      setCurrentLobby(null);
      setMyRole(null);
      setChatMessages([]);
    });

    s.on('game:chat:message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setPhase('browse');
      setShowChat(false);
      setCurrentLobby(null);
      setMyRole(null);
      setChatMessages([]);
      setOpenLobbies([]);
      setLobbyError(null);
    };
  }, [token]);

  const createLobby = useCallback(() => {
    if (!socket?.connected) {
      setLobbyError('Game server is still connecting. Try again in a moment.');
      return;
    }
    socket?.emit('lobby:create');
  }, [socket]);

  const joinLobby = useCallback((id: string) => {
    if (!socket?.connected) {
      setLobbyError('Game server is still connecting. Try again in a moment.');
      return;
    }
    socket?.emit('lobby:join', { lobbyId: id });
  }, [socket]);

  const leaveLobby = useCallback(() => {
    if (phaseRef.current === 'waiting') {
      socket?.emit('lobby:leave');
      setPhase('browse');
      setShowChat(false);
      setCurrentLobby(null);
      setMyRole(null);
      setChatMessages([]);
    }
  }, [socket]);

  const requestGameStart = useCallback(() => {
    if (!socket?.connected) {
      setLobbyError('Game server is still connecting. Try again in a moment.');
      return;
    }
    socket?.emit('game:start-request');
  }, [socket]);

  const endGame = useCallback(() => {
    if (!socket?.connected) {
      setLobbyError('Game server is disconnected.');
      return;
    }
    socket?.emit('game:end');
  }, [socket]);

  const sendChatMessage = useCallback((text: string) => {
    const lobby = currentLobbyRef.current;
    if (!lobby || !text.trim() || !socket?.connected) return;
    socket?.emit('game:chat:send', { lobbyId: lobby.id, text });
  }, [socket]);

  const clearLobbyError = useCallback(() => setLobbyError(null), []);

  return (
    <BilliardsContext.Provider
      value={{
        socket,
        phase,
        showChat,
        openLobbies,
        currentLobby,
        myRole,
        chatMessages,
        lobbyError,
        clearLobbyError,
        createLobby,
        joinLobby,
        leaveLobby,
        requestGameStart,
        endGame,
        sendChatMessage,
      }}
    >
      {children}
    </BilliardsContext.Provider>
  );
}
