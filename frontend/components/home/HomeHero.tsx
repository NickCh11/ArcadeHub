'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { OpenChatButton } from '@/components/chat/OpenChatButton';

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: ShieldIcon,
    title: 'End-to-end encrypted',
    body: 'Every DM encrypted in-browser with AES-256-GCM. The server never sees your plaintext.',
  },
  {
    icon: UsersIcon,
    title: 'Public rooms',
    body: 'Open channels for any game, squad, or topic. Jump in without an invite.',
  },
  {
    icon: ZapIcon,
    title: 'Real-time presence',
    body: 'Online, away, or offline — across rooms and DMs, always in sync.',
  },
];

export function HomeHero() {
  const { user, resolved } = useAuth();

  // Don't render anything until we know auth state
  if (!resolved) return null;

  // Logged-in users see nothing (they use the chat overlays via nav)
  if (user) return null;

  return (
    <>
      {/* Hero */}
      <section style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '5rem 2rem 3rem',
        textAlign: 'center',
      }}>

        {/* Badge */}
        <div className="animate-fade-in" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 14px', borderRadius: 999,
          border: '1px solid rgba(139,92,246,0.25)',
          background: 'rgba(139,92,246,0.08)',
          color: '#a78bfa', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: '2.5rem',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', flexShrink: 0 }} />
          E2E encrypted · Public rooms · Real-time
        </div>

        {/* Headline */}
        <h1 className="animate-fade-in" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
          fontWeight: 800, color: '#f1f0ff',
          letterSpacing: '-0.04em', lineHeight: 0.95,
          margin: '0 0 2rem', maxWidth: '100%',
          animationDelay: '0.1s',
        }}>
          Play&nbsp;together.<br />
          <span style={{ color: '#8b5cf6' }}>Trust&nbsp;each&nbsp;other.</span>
        </h1>

        {/* Subtext */}
        <p className="animate-fade-in" style={{
          color: '#9d9db8', fontSize: '1.1rem', lineHeight: 1.8,
          maxWidth: '36ch', margin: '0 0 2.5rem',
          fontFamily: 'var(--font-sans)',
          animationDelay: '0.2s',
        }}>
          A gaming social layer built on encrypted chat, public rooms, and real presence. Your crew, your rules.
        </p>

        {/* CTAs */}
        <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '0.3s' }}>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 12,
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            color: '#fff', fontSize: 15, fontWeight: 700,
            textDecoration: 'none', letterSpacing: '-0.01em',
            boxShadow: '0 8px 32px rgba(139,92,246,0.4)',
          }}>
            Create account
            <ArrowIcon />
          </Link>
          <OpenChatButton className="hp-ghost-btn">
            Open chat
          </OpenChatButton>
        </div>
      </section>

      {/* Feature strip */}
      <section style={{
        padding: '0 2rem 6rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
        maxWidth: 900,
        margin: '0 auto',
        width: '100%',
      }}>
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="glass animate-fade-in" style={{
            padding: '1.4rem 1.5rem', borderRadius: 14,
            animationDelay: `${0.5 + i * 0.1}s`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(139,92,246,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <Icon />
            </div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14, fontWeight: 700, color: '#f1f0ff',
              margin: '0 0 7px', letterSpacing: '-0.02em',
            }}>{title}</h3>
            <p style={{ color: '#9d9db8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{body}</p>
          </div>
        ))}
      </section>
    </>
  );
}
