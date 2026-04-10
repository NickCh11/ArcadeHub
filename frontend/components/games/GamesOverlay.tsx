'use client';

import { useRef, useState, useCallback, type PointerEvent } from 'react';
import { useGamesOverlay } from './GamesOverlayContext';
import { GAMES } from './gamesConfig';
import { BASE_WINDOW_Z, bringToFront } from '@/lib/windowZIndex';

export function GamesOverlay() {
  const { isLibraryOpen, closeLibrary, launchGame } = useGamesOverlay();

  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [zIndex, setZIndex] = useState(BASE_WINDOW_Z);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onTitlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!isLibraryOpen) return null;

  return (
    <div
      onPointerDown={() => setZIndex(bringToFront())}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 700,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.18)',
        background: 'var(--color-floating)',
        userSelect: 'none',
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Title bar */}
      <div
        onPointerDown={onTitlePointerDown}
        style={{
          height: 46,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'var(--color-elevated)',
          borderBottom: '1px solid rgba(139,92,246,0.14)',
          cursor: 'grab',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎮</span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.12em',
              color: 'var(--color-text-primary)',
            }}
          >
            GAME LIBRARY
          </span>
        </div>
        <button
          onClick={closeLibrary}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minHeight: 200,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            margin: 0,
            letterSpacing: '0.04em',
          }}
        >
          Select a game to play with other players online.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 14,
          }}
        >
          {GAMES.map((game) => (
            <GameCard
              key={game.id}
              icon={game.icon}
              name={game.name}
              description={game.description}
              players={game.players}
              available={game.status === 'available'}
              onPlay={() => launchGame(game.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GameCard({
  icon,
  name,
  description,
  players,
  available,
  onPlay,
}: {
  icon: string;
  name: string;
  description: string;
  players: string;
  available: boolean;
  onPlay: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--color-elevated)',
        borderRadius: 10,
        border: '1px solid rgba(139,92,246,0.12)',
        padding: '18px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        opacity: available ? 1 : 0.5,
        transition: 'border-color 200ms',
      }}
      onMouseEnter={(e) => { if (available) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.35)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.12)'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: 'rgba(139,92,246,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--color-text-primary)',
              letterSpacing: '0.02em',
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 4,
              padding: '2px 8px',
              borderRadius: 20,
              background: 'rgba(139,92,246,0.15)',
              fontSize: 10,
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              color: '#a78bfa',
              letterSpacing: '0.06em',
            }}
          >
            {players}
          </div>
        </div>
        {!available && (
          <div
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.06)',
              fontSize: 9,
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.08em',
            }}
          >
            SOON
          </div>
        )}
      </div>

      {/* Description */}
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>

      {/* Play button */}
      {available && (
        <button
          onClick={onPlay}
          style={{
            marginTop: 'auto',
            padding: '9px 0',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            transition: 'opacity 150ms',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          PLAY
        </button>
      )}
    </div>
  );
}
