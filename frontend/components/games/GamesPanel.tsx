'use client';

import { useRef, useState, useCallback, type PointerEvent } from 'react';
import { useGamesOverlay } from './GamesOverlayContext';
import { BilliardsGame } from './BilliardsGame';
import { BilliardsProvider, useBilliards } from './BilliardsContext';
import { GameLobbyBrowser } from './GameLobbyBrowser';
import { GameLobbyRoom } from './GameLobbyRoom';
import { GameChatPanel } from './GameChatPanel';
import { useAuth } from '@/components/auth/AuthProvider';

const CANVAS_W = Math.round(262 * 3.6);
const CHAT_W = 300;
const WAITING_PANEL_W = 780;
const PLAYING_PANEL_H = Math.round(150 * 3.6) + 46;
const WAITING_PANEL_H = 526;

function BilliardsHub({ onClose }: { onClose(): void }) {
  const { phase, showChat, currentLobby, leaveLobby, endGame } = useBilliards();

  const [pos, setPos] = useState({ x: 120, y: 60 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onTitlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
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

  const handleClose = useCallback(() => {
    if (phase === 'waiting') leaveLobby();
    if (phase === 'playing') endGame();
    onClose();
  }, [phase, leaveLobby, endGame, onClose]);

  const panelWidth = phase === 'playing' ? CANVAS_W : WAITING_PANEL_W;
  const totalWidth = showChat ? panelWidth + CHAT_W : panelWidth;
  const chatHeight = phase === 'playing' ? PLAYING_PANEL_H : WAITING_PANEL_H;
  const titleLabel =
    phase === 'playing' && currentLobby
      ? currentLobby.displayName.toUpperCase()
      : phase === 'waiting' && currentLobby
        ? currentLobby.displayName.toUpperCase()
        : 'GAME LOBBY';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: totalWidth,
          zIndex: 51,
          display: 'flex',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 32px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.2)',
          background: 'transparent',
          userSelect: 'none',
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          style={{
            width: panelWidth,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--color-elevated)',
          }}
        >
          <div
            onPointerDown={onTitlePointerDown}
            style={{
              height: 46,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              background: 'var(--color-floating)',
              borderBottom: '1px solid rgba(139,92,246,0.16)',
              cursor: 'grab',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 6px #22c55e',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.12em',
                  color: 'var(--color-text-primary)',
                }}
              >
                {titleLabel}
              </span>
            </div>

            <button
              onClick={handleClose}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
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
              title="Leave game"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)';
                (e.currentTarget as HTMLElement).style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
              }}
            >
              x
            </button>
          </div>

          <div style={{ lineHeight: phase === 'playing' ? 0 : undefined, position: 'relative' }}>
            {phase === 'playing' && (
              <button
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 2,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.35)',
                  background: 'rgba(12,12,24,0.86)',
                  color: '#f87171',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  lineHeight: 1.2,
                }}
              >
                END
              </button>
            )}

            {phase === 'browse' && <GameLobbyBrowser />}
            {phase === 'waiting' && <GameLobbyRoom />}
            {phase === 'playing' && <BilliardsGame />}
          </div>
        </div>

        {showChat && <GameChatPanel attached height={chatHeight} />}
      </div>
    </>
  );
}

export function GamesPanel() {
  const { activeGame, closeGame } = useGamesOverlay();
  const { user, resolved } = useAuth();

  if (!activeGame || !resolved || !user) return null;

  return (
    <BilliardsProvider>
      <BilliardsHub onClose={closeGame} />
    </BilliardsProvider>
  );
}
