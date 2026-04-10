'use client';

import { useBilliards } from './BilliardsContext';
import { useAuth } from '@/components/auth/AuthProvider';

export function GameLobbyRoom() {
  const { currentLobby, myRole, leaveLobby, requestGameStart } = useBilliards();
  const { user } = useAuth();

  if (!currentLobby) return null;

  const player1Name = currentLobby.creatorUsername;
  const hasOpponent = currentLobby.playerCount >= 2;
  const myUserId = user?.id ?? null;
  const readyUserIds = Array.isArray(currentLobby.readyUserIds) ? currentLobby.readyUserIds : [];
  const iAmReady = myUserId ? readyUserIds.includes(myUserId) : false;
  const readyCount = readyUserIds.length;

  return (
    <div
      style={{
        width: 780,
        minHeight: 480,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-elevated)',
        padding: '40px 48px',
        gap: 36,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: '0.08em',
            color: 'var(--color-text-primary)',
          }}
        >
          {currentLobby.displayName.toUpperCase()}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6, letterSpacing: '0.04em' }}>
          {hasOpponent ? `${readyCount}/2 players pressed START` : 'Waiting for an opponent to join'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, width: '100%', maxWidth: 520 }}>
        <PlayerSlot
          label="PLAYER 1"
          name={player1Name}
          color="#60a5fa"
          glowColor="rgba(96,165,250,0.25)"
          filled
          isMe={myRole === 'player1'}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: 40,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 18,
              color: 'rgba(139,92,246,0.4)',
              letterSpacing: '0.1em',
            }}
          >
            VS
          </span>
        </div>

        <PlayerSlot
          label="PLAYER 2"
          name={hasOpponent ? 'Player 2' : undefined}
          color="#f87171"
          glowColor="rgba(248,113,113,0.25)"
          filled={hasOpponent}
          isMe={myRole === 'player2'}
        />
      </div>

      <div
        style={{
          fontSize: 12,
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          letterSpacing: '0.03em',
          opacity: 0.75,
          maxWidth: 320,
          lineHeight: 1.6,
        }}
      >
        The match starts only after both players press START.
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={requestGameStart}
          disabled={!hasOpponent || iAmReady}
          style={{
            padding: '10px 22px',
            borderRadius: 8,
            border: 'none',
            background: !hasOpponent || iAmReady
              ? 'rgba(139,92,246,0.12)'
              : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            color: !hasOpponent || iAmReady ? 'var(--color-text-muted)' : '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.1em',
            cursor: !hasOpponent || iAmReady ? 'default' : 'pointer',
          }}
        >
          {iAmReady ? 'START LOCKED' : 'START'}
        </button>

        <button
          onClick={leaveLobby}
          style={{
            padding: '10px 22px',
            borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'transparent',
            color: 'rgba(239,68,68,0.78)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          LEAVE
        </button>
      </div>
    </div>
  );
}

interface PlayerSlotProps {
  label: string;
  name?: string;
  color: string;
  glowColor: string;
  filled: boolean;
  isMe: boolean;
}

function PlayerSlot({ label, name, color, glowColor, filled, isMe }: PlayerSlotProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '24px 20px',
        borderRadius: 12,
        background: filled ? glowColor : 'rgba(255,255,255,0.02)',
        border: `1px solid ${filled ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
        boxShadow: filled ? `0 0 24px ${glowColor}` : 'none',
        transition: 'all 0.3s',
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: filled ? color : 'var(--color-text-muted)',
          padding: '3px 10px',
          borderRadius: 20,
          background: filled ? `${color}20` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${filled ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        {label}
        {isMe ? ' (YOU)' : ''}
      </span>

      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: filled ? `${color}25` : 'rgba(255,255,255,0.03)',
          border: `2px solid ${filled ? `${color}50` : 'rgba(255,255,255,0.08)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        {filled ? 'P' : <WaitingSpinner color={color} />}
      </div>

      {filled ? (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--color-text-primary)',
            letterSpacing: '0.04em',
            textAlign: 'center',
          }}
        >
          {name ?? 'Player'}
        </span>
      ) : (
        <span
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            letterSpacing: '0.03em',
            textAlign: 'center',
            opacity: 0.7,
          }}
        >
          Waiting...
        </span>
      )}
    </div>
  );
}

function WaitingSpinner({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: `2px solid ${color}30`,
        borderTopColor: color,
        animation: 'spin 1s linear infinite',
      }}
    />
  );
}
