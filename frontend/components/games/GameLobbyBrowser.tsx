'use client';

import { useEffect } from 'react';
import { useBilliards, type LobbyInfo } from './BilliardsContext';

export function GameLobbyBrowser() {
  const { socket, openLobbies, lobbyError, clearLobbyError, createLobby, joinLobby } = useBilliards();
  const isConnected = !!socket?.connected;

  // Auto-dismiss error after 4s
  useEffect(() => {
    if (!lobbyError) return;
    const t = setTimeout(clearLobbyError, 4000);
    return () => clearTimeout(t);
  }, [lobbyError, clearLobbyError]);

  return (
    <div
      style={{
        width: 780,
        minHeight: 480,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-elevated)',
        padding: '28px 32px',
        gap: 20,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: '0.08em',
              color: 'var(--color-text-primary)',
            }}
          >
            8-BALL POOL
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              marginTop: 4,
              letterSpacing: '0.04em',
            }}
          >
            Find a game or create one
          </div>
        </div>

        <button
          onClick={createLobby}
          disabled={!isConnected}
          style={{
            padding: '10px 22px',
            borderRadius: 8,
            border: 'none',
            background: isConnected
              ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
              : 'rgba(139,92,246,0.12)',
            color: isConnected ? '#fff' : 'var(--color-text-muted)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.1em',
            cursor: isConnected ? 'pointer' : 'default',
            boxShadow: isConnected ? '0 0 16px rgba(139,92,246,0.35)' : 'none',
            transition: 'box-shadow 0.15s, transform 0.1s',
          }}
          onMouseEnter={(e) => {
            if (!isConnected) return;
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(139,92,246,0.6)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            if (!isConnected) return;
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(139,92,246,0.35)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          {isConnected ? '+ CREATE GAME' : 'CONNECTING...'}
        </button>
      </div>

      {/* Error banner */}
      {lobbyError && (
        <div
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13,
            color: '#f87171',
            letterSpacing: '0.03em',
          }}
        >
          {lobbyError}
          {!isConnected ? ' The game server connection is still initializing.' : ''}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(139,92,246,0.12)' }} />

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 120px 100px',
          gap: 12,
          padding: '0 4px',
        }}
      >
        {['ROOM', 'PLAYERS', ''].map((h) => (
          <span
            key={h}
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--color-text-muted)',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Lobby list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        {openLobbies.length === 0 ? (
          <EmptyState />
        ) : (
          openLobbies.map((lobby) => (
            <LobbyRow key={lobby.id} lobby={lobby} onJoin={joinLobby} />
          ))
        )}
      </div>
    </div>
  );
}

function LobbyRow({ lobby, onJoin }: { lobby: LobbyInfo; onJoin(id: string): void }) {
  const isFull = lobby.playerCount >= 2 || lobby.gameStarted;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 120px 100px',
        gap: 12,
        alignItems: 'center',
        padding: '14px 16px',
        borderRadius: 10,
        background: 'var(--color-floating)',
        border: '1px solid rgba(139,92,246,0.1)',
        opacity: isFull ? 0.5 : 1,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!isFull) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.3)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.1)';
      }}
    >
      {/* Room name */}
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--color-text-primary)',
            letterSpacing: '0.04em',
          }}
        >
          {lobby.displayName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
          by {lobby.creatorUsername}
        </div>
      </div>

      {/* Player count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2].map((slot) => (
            <div
              key={slot}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: slot <= lobby.playerCount ? '#8b5cf6' : 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.4)',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {lobby.playerCount}/2
        </span>
      </div>

      {/* Join button */}
      <button
        onClick={() => !isFull && onJoin(lobby.id)}
        disabled={isFull}
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          border: isFull ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(139,92,246,0.4)',
          background: isFull ? 'transparent' : 'rgba(139,92,246,0.15)',
          color: isFull ? 'var(--color-text-muted)' : '#a78bfa',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.1em',
          cursor: isFull ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!isFull) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.28)';
            (e.currentTarget as HTMLElement).style.color = '#fff';
          }
        }}
        onMouseLeave={(e) => {
          if (!isFull) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.15)';
            (e.currentTarget as HTMLElement).style.color = '#a78bfa';
          }
        }}
      >
        {isFull ? 'FULL' : 'JOIN'}
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '60px 0',
        color: 'var(--color-text-muted)',
      }}
    >
      <div style={{ fontSize: 40, opacity: 0.3 }}>🎱</div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.08em',
          opacity: 0.6,
        }}
      >
        NO OPEN GAMES
      </div>
      <div style={{ fontSize: 12, opacity: 0.45, textAlign: 'center', maxWidth: 240 }}>
        Be the first to create one
      </div>
    </div>
  );
}
