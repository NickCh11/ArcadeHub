'use client';

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from 'react';
import { useBilliards } from './BilliardsContext';
import { useAuth } from '@/components/auth/AuthProvider';

export function GameChatPanel({
  attached = false,
  height = 500,
}: {
  attached?: boolean;
  height?: number;
}) {
  const { currentLobby, chatMessages, sendChatMessage } = useBilliards();
  const { user } = useAuth();

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    sendChatMessage(text);
    setInputText('');
  }, [inputText, sendChatMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  }, [handleSend]);

  return (
    <div
      style={{
        width: 300,
        height,
        zIndex: 52,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: attached ? 0 : 14,
        overflow: 'hidden',
        boxShadow: attached ? 'none' : '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.18)',
        background: 'var(--color-elevated)',
        userSelect: 'none',
        borderLeft: attached ? '1px solid rgba(139,92,246,0.16)' : 'none',
      }}
    >
      <div
        style={{
          height: 46,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          background: 'var(--color-floating)',
          borderBottom: '1px solid rgba(139,92,246,0.16)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 6px #22c55e',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.1em',
            color: 'var(--color-text-primary)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentLobby?.displayName?.toUpperCase() ?? 'GAME CHAT'}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139,92,246,0.2) transparent',
        }}
      >
        {chatMessages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: 'var(--color-text-muted)',
              opacity: 0.5,
              textAlign: 'center',
            }}
          >
            No messages yet.
            <br />
            Say hello!
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isOwn = msg.userId === user?.id;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start',
                  gap: 2,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'baseline',
                    flexDirection: isOwn ? 'row-reverse' : 'row',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isOwn ? '#a78bfa' : '#60a5fa',
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {isOwn ? 'You' : msg.username}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)', opacity: 0.5 }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                <div
                  style={{
                    maxWidth: '85%',
                    padding: '7px 11px',
                    borderRadius: isOwn ? '10px 2px 10px 10px' : '2px 10px 10px 10px',
                    background: isOwn ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isOwn ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    fontSize: 13,
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                    userSelect: 'text',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(139,92,246,0.12)',
          padding: '10px 12px',
          display: 'flex',
          gap: 8,
          background: 'var(--color-floating)',
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={500}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 13,
            color: 'var(--color-text-primary)',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            userSelect: 'text',
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.5)';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.2)';
          }}
        />
        <button
          onClick={handleSend}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: 'none',
            background: inputText.trim() ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
            color: inputText.trim() ? '#a78bfa' : 'var(--color-text-muted)',
            cursor: inputText.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
          }}
          title="Send message"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
