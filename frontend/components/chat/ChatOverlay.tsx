'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BASE_WINDOW_Z, bringToFront } from '@/lib/windowZIndex';
import { connectSocket } from '@/lib/socket';
import { useChatOverlay } from './ChatOverlayContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { getBackendUrl } from '@/lib/publicUrl';
import { SOCKET_EVENTS } from '@/types/events';
import { useWindowSize } from '@/hooks/useWindowSize';
import type { Socket } from 'socket.io-client';
import type {
  NewPublicMessagePayload,
  UserJoinedRoomPayload,
  UserLeftRoomPayload,
  PresenceUpdatePayload,
} from '@/types/events';

const BACKEND = getBackendUrl();
const WINDOW_W = 980;
const WINDOW_H = 580;
const TITLEBAR_H = 46;
const CHANNELS_W = 190;
const MEMBERS_W = 152;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function canDeleteRooms(role: string | null | undefined) {
  return role === 'admin' || role === 'moderator';
}

interface Room {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

interface RoomMember {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  status: 'online' | 'away' | 'offline';
}

// ── Members Panel ──────────────────────────────────────────────────────────────

function MembersPanel({ members }: { members: RoomMember[] }) {
  const online = members.filter((m) => m.status === 'online');
  const away = members.filter((m) => m.status === 'away');

  const statusDot = (status: RoomMember['status']) => {
    const color = status === 'online' ? '#22c55e' : status === 'away' ? '#f59e0b' : '#4b5563';
    return <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />;
  };

  const renderGroup = (label: string, list: RoomMember[]) => {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#5a5a80', letterSpacing: '0.07em', padding: '2px 8px 6px' }}>
          {label} — {list.length}
        </div>
        {list.map((m) => (
          <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px', borderRadius: 7 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(139,92,246,0.18)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#a78bfa',
              position: 'relative',
            }}>
              {m.username[0]?.toUpperCase() ?? '?'}
              <span style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 8, height: 8, borderRadius: '50%',
                border: '1.5px solid rgba(10,10,24,0.9)',
                background: m.status === 'online' ? '#22c55e' : m.status === 'away' ? '#f59e0b' : '#4b5563',
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: m.status === 'offline' ? '#5a5a80' : '#c8c8e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.username}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ width: MEMBERS_W, borderLeft: '1px solid rgba(139,92,246,0.1)', display: 'flex', flexDirection: 'column', background: 'rgba(7,7,17,0.5)', overflowY: 'auto' }}>
      <div style={{ padding: '10px 8px 4px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#5a5a80', letterSpacing: '0.07em', padding: '2px 0px 6px 0px' }}>
          MEMBERS — {members.length}
        </div>
      </div>
      {members.length === 0 && (
        <p style={{ fontSize: 11, color: '#5a5a80', padding: '4px 12px', lineHeight: 1.6 }}>No one here yet</p>
      )}
      {renderGroup('ONLINE', online)}
      {renderGroup('AWAY', away)}
    </div>
  );
}

// ── Room View ──────────────────────────────────────────────────────────────────

interface RoomViewProps {
  socket: Socket | null;
  room: Room;
  userId: string;
  token: string;
  username: string;
  showMembers?: boolean;
}

function RoomView({ socket, room, userId, token, username, showMembers = true }: RoomViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);

  // Load message history
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setSendError(null);
    joinedRef.current = false;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${BACKEND}/api/rooms/${room.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Could not load messages');
        const data = await res.json();
        if (cancelled) return;
        setMessages((Array.isArray(data) ? data : []).map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.profiles?.username ?? 'Unknown',
          text: m.plaintext ?? '',
          createdAt: m.created_at,
        })));
      } catch (err) {
        console.error('[ChatOverlay] load messages', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [room.id, token]);

  // Load initial members list
  useEffect(() => {
    setMembers([]);
    let cancelled = false;

    async function loadMembers() {
      try {
        const res = await fetch(`${BACKEND}/api/rooms/${room.id}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setMembers((Array.isArray(data) ? data : []).map((m: any) => ({
          user_id: m.user_id,
          username: m.profiles?.username ?? 'Unknown',
          avatar_url: m.profiles?.avatar_url ?? null,
          status: m.profiles?.status ?? 'offline',
        })));
      } catch (err) {
        console.error('[ChatOverlay] load members', err);
      }
    }

    void loadMembers();
    return () => { cancelled = true; };
  }, [room.id, token]);

  // Join room socket channel
  useEffect(() => {
    if (!socket || joinedRef.current) return;
    joinedRef.current = true;
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: room.id });
    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId: room.id });
      joinedRef.current = false;
    };
  }, [socket, room.id]);

  // Incoming messages
  useEffect(() => {
    if (!socket) return;
    const handler = (payload: NewPublicMessagePayload) => {
      if (payload.roomId !== room.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.messageId)) return prev;
        return [...prev, { id: payload.messageId, senderId: payload.senderId, senderName: payload.senderName, text: payload.text, createdAt: payload.createdAt }];
      });
    };
    socket.on(SOCKET_EVENTS.NEW_PUBLIC_MESSAGE, handler);
    return () => { socket.off(SOCKET_EVENTS.NEW_PUBLIC_MESSAGE, handler); };
  }, [socket, room.id]);

  // Member join/leave
  useEffect(() => {
    if (!socket) return;

    const onJoin = (payload: UserJoinedRoomPayload) => {
      if (payload.roomId !== room.id) return;
      const u = payload.user as any;
      setMembers((prev) => {
        if (prev.some((m) => m.user_id === u.id)) return prev;
        return [...prev, { user_id: u.id, username: u.username ?? 'Unknown', avatar_url: u.avatarUrl ?? null, status: u.status ?? 'online' }];
      });
    };

    const onLeave = (payload: UserLeftRoomPayload) => {
      if (payload.roomId !== room.id) return;
      setMembers((prev) => prev.filter((m) => m.user_id !== payload.userId));
    };

    socket.on(SOCKET_EVENTS.USER_JOINED_ROOM, onJoin);
    socket.on(SOCKET_EVENTS.USER_LEFT_ROOM, onLeave);
    return () => {
      socket.off(SOCKET_EVENTS.USER_JOINED_ROOM, onJoin);
      socket.off(SOCKET_EVENTS.USER_LEFT_ROOM, onLeave);
    };
  }, [socket, room.id]);

  // Presence updates — remove offline users entirely; update online/away status
  useEffect(() => {
    if (!socket) return;
    const handler = (payload: PresenceUpdatePayload) => {
      if (payload.status === 'offline') {
        setMembers((prev) => prev.filter((m) => m.user_id !== payload.userId));
      } else {
        setMembers((prev) => prev.map((m) =>
          m.user_id === payload.userId ? { ...m, status: payload.status } : m
        ));
      }
    };
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, handler);
    return () => { socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, handler); };
  }, [socket]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!socket || !input.trim()) return;
    const text = input.trim();
    setInput('');
    setSendError(null);
    const messageId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    setMessages((prev) => [...prev, { id: messageId, senderId: userId, senderName: username, text, createdAt }]);

    try {
      socket.emit(SOCKET_EVENTS.SEND_PUBLIC_MESSAGE, { roomId: room.id, messageId, text, senderName: username, createdAt });
    } catch (err) {
      setInput(text);
      setSendError(err instanceof Error ? err.message : 'Could not send message');
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend(e as any);
    }
  }

  return (
    <div style={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0 }}>
      {/* Messages column */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {/* Channel header */}
        <div style={{ height: 46, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(139,92,246,0.1)', flexShrink: 0, background: 'rgba(13,13,31,0.5)', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#5a5a80' }}>#</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#f1f0ff' }}>{room.name}</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.3)', borderTopColor: '#8b5cf6', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>#</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#f1f0ff', marginBottom: 4 }}>Welcome to #{room.name}</div>
                <div style={{ fontSize: 12, color: '#5a5a80' }}>Be the first to say something!</div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isOwn = msg.senderId === userId;
            const prevMsg = messages[i - 1];
            const isGrouped = prevMsg && prevMsg.senderId === msg.senderId;

            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', marginTop: isGrouped ? 1 : 8 }}>
                {/* Sender name + time */}
                {!isGrouped && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: isOwn ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(139,92,246,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: isOwn ? '#fff' : '#a78bfa',
                    }}>
                      {msg.senderName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isOwn ? '#c4b5fd' : '#9d9db8' }}>
                      {isOwn ? 'You' : msg.senderName}
                    </span>
                    <span style={{ fontSize: 10, color: '#3d3d5c' }}>{formatTime(msg.createdAt)}</span>
                  </div>
                )}

                {/* Bubble */}
                <div style={{ maxWidth: '72%' }}>
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 14,
                    borderBottomRightRadius: isOwn ? 3 : 14,
                    borderBottomLeftRadius: isOwn ? 14 : 3,
                    background: isOwn
                      ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                      : 'rgba(20,20,42,0.85)',
                    border: isOwn
                      ? '1px solid rgba(196,181,253,0.25)'
                      : '1px solid rgba(139,92,246,0.12)',
                    boxShadow: isOwn ? '0 4px 16px rgba(109,40,217,0.22)' : 'none',
                  }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: isOwn ? '#f0ecff' : '#d0d0e8', wordBreak: 'break-word' }}>
                      {msg.text}
                    </p>
                  </div>
                  {isGrouped && (
                    <div style={{ fontSize: 10, color: '#3d3d5c', marginTop: 1, textAlign: isOwn ? 'right' : 'left', paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0 }}>
                      {formatTime(msg.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{ padding: '10px 14px', borderTop: '1px solid rgba(139,92,246,0.1)', flexShrink: 0, background: 'rgba(13,13,31,0.3)' }}>
          {sendError && <div style={{ marginBottom: 6, fontSize: 11, color: '#f87171' }}>{sendError}</div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${room.name}`}
              style={{ flex: 1, padding: '9px 13px', borderRadius: 11, background: 'rgba(20,20,42,0.8)', border: '1px solid rgba(139,92,246,0.15)', color: '#f1f0ff', outline: 'none', fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', flexShrink: 0, cursor: input.trim() ? 'pointer' : 'default',
                background: input.trim() ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(139,92,246,0.1)',
                transition: 'background 0.2s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </form>
      </div>

      {showMembers && <MembersPanel members={members} />}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#f1f0ff', marginBottom: 6 }}>Select a channel</div>
        <div style={{ fontSize: 12, color: '#5a5a80', maxWidth: 200, lineHeight: 1.6 }}>Pick a room from the list to start chatting.</div>
      </div>
    </div>
  );
}

// ── Main ChatOverlay ───────────────────────────────────────────────────────────

export function ChatOverlay() {
  const { isOpen, close, targetRoomId, clearTargetRoom } = useChatOverlay();
  const { user, token, profile, resolved } = useAuth();
  const { w: winW, h: winH } = useWindowSize();

  const userId = user?.id ?? null;
  const username = profile.username || '';

  const isMobile = winW < 640;
  const isTablet = winW >= 640 && winW < 1024;

  const overlayW = isMobile ? winW : isTablet ? Math.min(WINDOW_W, winW - 32) : WINDOW_W;
  const overlayH = isMobile ? winH : Math.min(WINDOW_H, winH - 80);
  const channelsW = isMobile ? Math.min(160, Math.floor(winW * 0.38)) : CHANNELS_W;
  const showMembers = !isMobile;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [zIndex, setZIndex] = useState(BASE_WINDOW_Z);
  const posInitialized = useRef(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;
  const canManageRooms = canDeleteRooms(profile.role);

  useEffect(() => {
    if (isOpen && !posInitialized.current) {
      const frame = window.requestAnimationFrame(() => {
        posInitialized.current = true;
        if (window.innerWidth < 640) {
          setPos({ x: 0, y: 0 });
        } else {
          const w = Math.min(WINDOW_W, window.innerWidth - 32);
          const h = Math.min(WINDOW_H, window.innerHeight - 80);
          setPos({
            x: Math.max(0, Math.round((window.innerWidth - w) / 2)),
            y: Math.max(0, Math.round((window.innerHeight - h) / 2)),
          });
        }
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!token || !user) {
      const id = window.setTimeout(() => { setSocket(null); setRooms([]); setSelectedRoomId(null); }, 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => { setSocket(connectSocket(token)); }, 0);
    return () => window.clearTimeout(id);
  }, [token, user]);

  const fetchRooms = useCallback(async (nextToken = token) => {
    if (!nextToken) return;
    try {
      const res = await fetch(`${BACKEND}/api/rooms`, { headers: { Authorization: `Bearer ${nextToken}` } });
      if (!res.ok) return;
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[ChatOverlay] fetch rooms', err);
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen || !token) return;
    const id = window.setTimeout(() => void fetchRooms(token), 0);
    return () => window.clearTimeout(id);
  }, [isOpen, token, fetchRooms]);

  useEffect(() => {
    if (!targetRoomId) return;
    setSelectedRoomId(targetRoomId);
    clearTargetRoom();
  }, [targetRoomId, clearTargetRoom]);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    const name = newRoomName.trim();
    if (!name || !token) return;
    setCreateError(null);
    try {
      const res = await fetch(`${BACKEND}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not create room');
      setRooms((prev) => [data, ...prev]);
      setSelectedRoomId(data.id);
      setNewRoomName('');
      setCreating(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleDeleteRoom(roomId: string) {
    if (!token || !canManageRooms || deletingRoomId) return;

    const roomToDelete = rooms.find((room) => room.id === roomId);
    const confirmed = window.confirm(`Delete #${roomToDelete?.name ?? 'this room'}? This cannot be undone.`);
    if (!confirmed) return;

    setDeleteError(null);
    setDeletingRoomId(roomId);

    try {
      const res = await fetch(`${BACKEND}/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'Could not delete room');

      const fallbackRoomId = rooms.find((room) => room.id !== roomId)?.id ?? null;
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
      setSelectedRoomId((current) => current === roomId ? fallbackRoomId : current);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete room');
    } finally {
      setDeletingRoomId(null);
    }
  }

  function handleTitleMouseDown(e: React.MouseEvent) {
    if (isMobile || (e.target as HTMLElement).closest('button')) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    const onMove = (me: MouseEvent) => {
      if (!dragStart.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - overlayW, dragStart.current.px + me.clientX - dragStart.current.mx)),
        y: Math.max(0, Math.min(window.innerHeight - TITLEBAR_H, dragStart.current.py + me.clientY - dragStart.current.my)),
      });
    };
    const onUp = () => { dragStart.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  if (!resolved || !user || !token) return null;
  if (pos.x < 0) return <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex }} />;

  const windowHeight = minimized ? TITLEBAR_H : overlayH;

  return (
    <div
      onPointerDown={() => setZIndex(bringToFront())}
      style={{
      position: 'fixed', left: pos.x, top: pos.y, width: overlayW, height: windowHeight, zIndex,
      borderRadius: isMobile ? 0 : 16, overflow: 'hidden',
      background: 'rgba(10,10,24,0.93)', backdropFilter: 'blur(28px)',
      border: '1px solid rgba(139,92,246,0.18)',
      boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08)',
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? 'scale(1)' : 'scale(0.96)',
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'opacity 0.18s ease, transform 0.18s ease',
    }}>
      {/* Title bar */}
      <div
        onMouseDown={handleTitleMouseDown}
        style={{
          height: TITLEBAR_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', borderBottom: minimized ? 'none' : '1px solid rgba(139,92,246,0.12)',
          background: 'rgba(13,13,31,0.7)', cursor: 'grab', flexShrink: 0, userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#f1f0ff', letterSpacing: '-0.01em' }}>Chat Rooms</span>
          {selectedRoom && (
            <>
              <span style={{ color: '#3d3d5c', fontSize: 12 }}>/</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>#{selectedRoom.name}</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => void fetchRooms()} title="Refresh rooms"
            style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>
            </svg>
          </button>
          <button onClick={() => setMinimized((v) => !v)} title={minimized ? 'Restore' : 'Minimize'}
            style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(139,92,246,0.1)', color: '#5a5a80', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {minimized ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
            </svg>
          </button>
          <button onClick={close} title="Close"
            style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {!minimized && (
        <div style={{ display: 'flex', height: overlayH - TITLEBAR_H }}>
          {/* Channels sidebar */}
          <div style={{ width: channelsW, borderRight: '1px solid rgba(139,92,246,0.1)', display: 'flex', flexDirection: 'column', background: 'rgba(7,7,17,0.5)', flexShrink: 0 }}>
            <div style={{ padding: '10px 10px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#5a5a80', letterSpacing: '0.07em', padding: '2px 4px' }}>CHANNELS</div>
              <button
                onClick={() => { setCreating((v) => !v); setCreateError(null); setNewRoomName(''); }}
                title="New channel"
                style={{ width: 20, height: 20, borderRadius: 5, border: 'none', background: 'rgba(139,92,246,0.12)', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, lineHeight: 1 }}
              >+</button>
            </div>
            {creating && (
              <form onSubmit={handleCreateRoom} style={{ padding: '0 8px 8px' }}>
                <input
                  autoFocus
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="channel-name"
                  style={{ width: '100%', padding: '6px 9px', borderRadius: 8, background: 'rgba(20,20,42,0.9)', border: '1px solid rgba(139,92,246,0.3)', color: '#f1f0ff', outline: 'none', fontSize: 12, boxSizing: 'border-box' }}
                />
                {createError && <div style={{ fontSize: 10, color: '#f87171', marginTop: 4 }}>{createError}</div>}
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  <button type="submit" disabled={!newRoomName.trim()} style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: 'none', background: newRoomName.trim() ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(139,92,246,0.1)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: newRoomName.trim() ? 'pointer' : 'default' }}>
                    Create
                  </button>
                  <button type="button" onClick={() => setCreating(false)} style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: '1px solid rgba(139,92,246,0.15)', background: 'transparent', color: '#5a5a80', fontSize: 11, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {deleteError && (
              <div style={{ fontSize: 10, color: '#f87171', padding: '0 12px 8px', lineHeight: 1.4 }}>
                {deleteError}
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2px 6px' }}>
              {rooms.length === 0 && !creating && (
                <p style={{ fontSize: 11, color: '#5a5a80', padding: '12px 8px', lineHeight: 1.6 }}>No rooms yet. Create one!</p>
              )}
              {rooms.map((room) => {
                const isActive = selectedRoomId === room.id;
                const isDeleting = deletingRoomId === room.id;
                return (
                  <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                    <button onClick={() => setSelectedRoomId(room.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', background: isActive ? 'rgba(139,92,246,0.14)' : 'transparent', position: 'relative' }}
                      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.07)'; }}
                      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {isActive && <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: 2, background: '#8b5cf6' }} />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#7c6fa0' : '#4a4a6a' }}>#</span>
                      <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? '#f1f0ff' : '#9d9db8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.name}
                      </span>
                    </button>
                    {canManageRooms && (
                      <button
                        type="button"
                        title={isDeleting ? 'Deleting room...' : `Delete #${room.name}`}
                        disabled={isDeleting}
                        onClick={() => void handleDeleteRoom(room.id)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          border: 'none',
                          flexShrink: 0,
                          cursor: isDeleting ? 'wait' : 'pointer',
                          background: isActive ? 'rgba(239,68,68,0.16)' : 'rgba(239,68,68,0.1)',
                          color: '#f87171',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isDeleting ? 0.7 : 1,
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main area */}
          <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
            {selectedRoom && userId && token ? (
              <RoomView key={selectedRoom.id} socket={socket} room={selectedRoom} userId={userId} token={token} username={username} showMembers={showMembers} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
