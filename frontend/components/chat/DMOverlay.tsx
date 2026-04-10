'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { BASE_WINDOW_Z, bringToFront } from '@/lib/windowZIndex';
import { createClient } from '@/lib/supabase';
import { connectSocket } from '@/lib/socket';
import { useDMOverlay } from './DMOverlayContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { useWindowSize } from '@/hooks/useWindowSize';
import { useDirectMessage } from '@/hooks/useDirectMessage';
import { getBackendUrl } from '@/lib/publicUrl';
import { SOCKET_EVENTS } from '@/types/events';
import type { Socket } from 'socket.io-client';
import type { UserProfile } from '@/types';
import type { NewDMPayload, PresenceUpdatePayload } from '@/types/events';

const BACKEND = getBackendUrl();
const WINDOW_W = 760;
const WINDOW_H = 540;
const TITLEBAR_H = 46;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── DM Conversation View ───────────────────────────────────────────────────────

interface DMViewProps {
  socket: Socket | null;
  myUserId: string;
  otherUserId: string;
  token: string;
  myUsername: string;
  otherUser: UserProfile | null;
}

function DMView({ socket, myUserId, otherUserId, token, myUsername, otherUser }: DMViewProps) {
  const { messages, loading, sendMessage } = useDirectMessage(socket, myUserId, otherUserId, token);
  const [input, setInput] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    setSendError(null);
    try {
      await sendMessage(text, myUsername);
    } catch (err) {
      setInput(text);
      setSendError(err instanceof Error ? err.message : 'Message could not be sent');
    }
  }

  const statusColor = otherUser?.status === 'online' ? '#22c55e' : otherUser?.status === 'away' ? '#f59e0b' : '#6b7280';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div style={{
        height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', borderBottom: '1px solid rgba(139,92,246,0.1)',
        flexShrink: 0, background: 'rgba(13,13,31,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: 'rgba(139,92,246,0.2)', color: '#a78bfa',
              fontWeight: 700, fontSize: 13,
            }}>
              {otherUser?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <span style={{
              position: 'absolute', bottom: -1, right: -1, width: 10, height: 10,
              borderRadius: '50%', border: '2px solid #0d0d1f', background: statusColor,
            }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#f1f0ff' }}>
              {otherUser?.username || 'Loading…'}
              {otherUser?.user_tag && (
                <span style={{ color: '#5a5a80', fontWeight: 400, fontSize: 12 }}>#{otherUser.user_tag}</span>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#5a5a80' }}>
              {otherUser?.status === 'online' ? '● Online' : otherUser?.status === 'away' ? '● Away' : '● Offline'}
            </div>
          </div>
        </div>
        <div className="e2e-badge">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          E2E · Forward Secrecy
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.3)', borderTopColor: '#8b5cf6', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.senderId === myUserId;
          const showSender = !messages[i - 1] || messages[i - 1].senderId !== msg.senderId;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginTop: showSender ? 10 : 2 }}>
              <div className="msg-bubble" style={{ maxWidth: '78%' }}>
                <div style={{
                  padding: '7px 11px', borderRadius: 14,
                  background: isOwn ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(20,20,42,0.8)',
                  border: `1px solid ${isOwn ? 'rgba(196,181,253,0.4)' : 'rgba(139,92,246,0.1)'}`,
                  boxShadow: isOwn ? '0 10px 24px rgba(109,40,217,0.24)' : 'none',
                  borderBottomRightRadius: isOwn ? 4 : 14, borderBottomLeftRadius: isOwn ? 14 : 4,
                }}>
                  <p style={{ fontSize: 13, color: '#f1f0ff', lineHeight: 1.55, margin: 0 }}>{msg.plaintext}</p>
                </div>
                <div style={{ fontSize: 10, color: isOwn ? '#c4b5fd' : '#5a5a80', marginTop: 2, textAlign: isOwn ? 'right' : 'left', paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0 }}>
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: '10px 14px', borderTop: '1px solid rgba(139,92,246,0.1)', flexShrink: 0, background: 'rgba(13,13,31,0.3)' }}>
        {sendError && (
          <div style={{ marginBottom: 8, fontSize: 11, color: '#f87171' }}>
            {sendError}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${otherUser?.username || '…'} (E2E encrypted)`}
            style={{ flex: 1, padding: '9px 13px', borderRadius: 11, background: 'rgba(20,20,42,0.8)', border: '1px solid rgba(139,92,246,0.15)', color: '#f1f0ff', outline: 'none', fontSize: 13 }}
          />
          <button type="submit" disabled={!input.trim()} style={{
            width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', flexShrink: 0, cursor: input.trim() ? 'pointer' : 'default',
            background: input.trim() ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(139,92,246,0.1)',
            transition: 'background 0.2s',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-.997 16 16 0 007-1.383 16 16 0 007 1.384 1 1 0 011 .996z"/>
          </svg>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#f1f0ff', marginBottom: 6 }}>Direct Messages</div>
        <div style={{ fontSize: 12, color: '#5a5a80', maxWidth: 200, lineHeight: 1.6 }}>
          Search for a user to start an E2E encrypted conversation.
        </div>
      </div>
    </div>
  );
}

// ── Main DMOverlay ─────────────────────────────────────────────────────────────

export function DMOverlay() {
  const { isOpen, close, open } = useDMOverlay();
  const { user, token, profile, resolved } = useAuth();
  const { w: winW, h: winH } = useWindowSize();

  const userId = user?.id ?? null;
  const username = profile.username || '';

  const isMobile = winW < 640;
  const isTablet = winW >= 640 && winW < 1024;
  const overlayW = isMobile ? winW : isTablet ? Math.min(WINDOW_W, winW - 32) : WINDOW_W;
  const overlayH = isMobile ? winH : Math.min(WINDOW_H, winH - 80);
  const sidebarW = isMobile ? Math.min(180, Math.floor(winW * 0.4)) : 220;

  const [socket, setSocket] = useState<Socket | null>(null);

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [currentDMUserId, setCurrentDMUserId] = useState<string | null>(null);
  const [currentDMUser, setCurrentDMUser] = useState<UserProfile | null>(null);
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [zIndex, setZIndex] = useState(BASE_WINDOW_Z);
  const posInitialized = useRef(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  // Center on first open
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
            x: Math.max(0, Math.round((window.innerWidth - w) / 2)) + 80,
            y: Math.max(0, Math.round((window.innerHeight - h) / 2)),
          });
        }
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!token || !user) {
      const timeoutId = window.setTimeout(() => {
        setSocket(null);
        setCurrentDMUser(null);
        setCurrentDMUserId(null);
        setRecentUsers([]);
        setUnreadCounts({});
        if (isOpen) close();
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      setSocket(connectSocket(token));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [token, user, isOpen, close]);

  const refreshRecentUsers = useCallback(async (nextToken = token) => {
    if (!nextToken) return;

    const ids = Array.from(new Set([
      ...recentUsers.map((user) => user.id),
      currentDMUserId,
    ].filter((value): value is string => !!value)));

    if (ids.length === 0) return;

    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, username, user_tag, avatar_url, status')
        .in('id', ids);

      if (!Array.isArray(data)) return;

      const byId = new Map(data.map((user) => [user.id, user as UserProfile]));

      setRecentUsers((prev) =>
        prev.map((user) => byId.get(user.id) ?? user)
      );

      if (currentDMUserId) {
        setCurrentDMUser((prev) => {
          if (!prev) return byId.get(currentDMUserId) ?? null;
          return byId.get(currentDMUserId) ?? prev;
        });
      }
    } catch (err) {
      console.error('[DMs]', err);
    }
  }, [token, recentUsers, currentDMUserId]);

  // User search
  useEffect(() => {
    if (!token || searchQ.length < 2) return;
    fetch(`${BACKEND}/api/users/search?q=${encodeURIComponent(searchQ)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((users) => setSearchResults(Array.isArray(users) ? users : [])).catch(console.error);
  }, [token, searchQ]);

  useEffect(() => {
    if (!isOpen || !token) return;
    const timeoutId = window.setTimeout(() => {
      void refreshRecentUsers(token);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, token, currentDMUserId, refreshRecentUsers]);

  // Surface incoming DMs even when that conversation is not currently open
  useEffect(() => {
    if (!socket || !userId) return;

    const supabase = createClient();

    const ensureRecentUser = async (incomingUserId: string) => {
      const existing =
        recentUsers.find((u) => u.id === incomingUserId) ||
        searchResults.find((u) => u.id === incomingUserId) ||
        (currentDMUser?.id === incomingUserId ? currentDMUser : null);

      if (existing) {
        setRecentUsers((prev) => [existing, ...prev.filter((u) => u.id !== incomingUserId)].slice(0, 10));
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('id, username, user_tag, avatar_url, status')
        .eq('id', incomingUserId)
        .single();

      if (!data) return;

      setRecentUsers((prev) => [data as UserProfile, ...prev.filter((u) => u.id !== incomingUserId)].slice(0, 10));
    };

    const handler = async ({ message }: NewDMPayload) => {
      if (message.senderId === userId) return;

      await ensureRecentUser(message.senderId);

      if (currentDMUserId !== message.senderId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] ?? 0) + 1,
        }));
      }

      open();
    };

    socket.on(SOCKET_EVENTS.NEW_DM, handler);
    return () => { socket.off(SOCKET_EVENTS.NEW_DM, handler); };
  }, [socket, userId, currentDMUserId, currentDMUser, recentUsers, searchResults, open]);

  // Live presence updates — keep status indicators current without polling
  useEffect(() => {
    if (!socket) return;
    const handler = (payload: PresenceUpdatePayload) => {
      setCurrentDMUser((prev) =>
        prev && prev.id === payload.userId ? { ...prev, status: payload.status } : prev
      );
      setRecentUsers((prev) =>
        prev.map((u) => u.id === payload.userId ? { ...u, status: payload.status } : u)
      );
    };
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, handler);
    return () => { socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, handler); };
  }, [socket]);

  // Drag
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

  function selectUser(user: UserProfile) {
    setCurrentDMUser(user);
    setCurrentDMUserId(user.id);
    setSearchQ('');
    setSearchResults([]);
    setRecentUsers((prev) => [user, ...prev.filter((u) => u.id !== user.id)].slice(0, 10));
    setUnreadCounts((prev) => {
      if (!(user.id in prev)) return prev;
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
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
      background: 'rgba(10,10,24,0.92)', backdropFilter: 'blur(28px)',
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
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-.997 16 16 0 007-1.383 16 16 0 007 1.384 1 1 0 011 .996z"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#f1f0ff', letterSpacing: '-0.01em' }}>Direct Messages</span>
          <div className="e2e-badge" style={{ fontSize: 9, padding: '2px 6px' }}>E2E Encrypted</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => { void refreshRecentUsers(); }}
            title="Refresh conversations"
            style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(34,211,238,0.1)', color: '#22d3ee', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
              <path d="M21 3v6h-6"/>
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
          {/* Left panel — conversations */}
          <div style={{ width: sidebarW, borderRight: '1px solid rgba(139,92,246,0.1)', display: 'flex', flexDirection: 'column', background: 'rgba(7,7,17,0.5)', flexShrink: 0 }}>
            {/* Search */}
            <div style={{ padding: '10px 10px 6px' }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5a5a80" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  value={searchQ}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSearchQ(next);
                    if (next.length < 2) setSearchResults([]);
                  }}
                  placeholder="Find user…"
                  style={{ width: '100%', paddingLeft: 28, paddingRight: 8, paddingTop: 7, paddingBottom: 7, borderRadius: 9, background: 'rgba(20,20,42,0.8)', border: '1px solid rgba(139,92,246,0.15)', color: '#f1f0ff', outline: 'none', fontSize: 12 }}
                />
              </div>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div style={{ padding: '0 6px 6px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#5a5a80', letterSpacing: '0.06em', padding: '4px 6px' }}>RESULTS</div>
                {searchResults.filter((u) => u.id !== userId).map((u) => (
                  <button key={u.id} onClick={() => selectUser(u)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px', borderRadius: 9, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.08)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#a78bfa', flexShrink: 0 }}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f0ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.username}
                        {u.user_tag && <span style={{ color: '#5a5a80', fontWeight: 400 }}>#{u.user_tag}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recent conversations */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
              {searchQ.length < 2 && recentUsers.length === 0 && (
                <p style={{ fontSize: 11, color: '#5a5a80', textAlign: 'center', padding: '20px 12px', lineHeight: 1.6 }}>
                  Search for a user above to start chatting
                </p>
              )}
              {searchQ.length < 2 && recentUsers.map((u) => {
                const isActive = currentDMUserId === u.id;
                const unread = unreadCounts[u.id] ?? 0;
                return (
                  <button key={u.id} onClick={() => selectUser(u)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px', borderRadius: 9,
                      border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 2,
                      background: isActive ? 'rgba(139,92,246,0.12)' : 'transparent',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.06)'; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {isActive && <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: 2, background: '#8b5cf6' }} />}
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#a78bfa', flexShrink: 0 }}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#f1f0ff' : '#9d9db8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.username}
                    </span>
                    {unread > 0 && (
                      <span style={{
                        minWidth: 18,
                        height: 18,
                        padding: '0 6px',
                        borderRadius: 99,
                        background: '#8b5cf6',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {currentDMUserId && userId && token ? (
              <DMView
                key={currentDMUserId}
                socket={socket}
                myUserId={userId}
                otherUserId={currentDMUserId}
                token={token}
                myUsername={username}
                otherUser={currentDMUser}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
