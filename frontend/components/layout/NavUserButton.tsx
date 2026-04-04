'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { connectSocket } from '@/lib/socket';
import { SOCKET_EVENTS } from '../../../shared/types/events';
import { StatusPicker, getPresenceMeta, type PresenceStatus } from '@/components/presence/StatusPicker';
import { useAuth } from '@/components/auth/AuthProvider';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function NavUserButton() {
  const { user, token, profile, resolved, refresh } = useAuth();
  const [status, setStatus] = useState<PresenceStatus>(profile.status);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setStatus(profile.status);
  }, [profile.status]);

  useEffect(() => {
    if (!token || !user) return;
    const socket = connectSocket(token);
    const ping = window.setInterval(() => {
      socket.emit('ping-presence');
    }, 25_000);
    return () => window.clearInterval(ping);
  }, [token, user]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    setSettingsOpen(false);
    router.push('/');
    router.refresh();
  }

  async function handleStatusChange(nextStatus: PresenceStatus) {
    if (!token || statusSaving || nextStatus === status) return;

    setStatusSaving(true);
    setStatus(nextStatus);

    try {
      const res = await fetch(`${BACKEND}/api/users/me/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? 'Could not update status');
      }

      const socket = connectSocket(token);
      socket.emit(SOCKET_EVENTS.UPDATE_STATUS, { status: nextStatus });
    } catch (err) {
      console.error('[Status]', err);
      alert(err instanceof Error ? err.message : 'Could not update status');
      await refresh();
    } finally {
      setStatusSaving(false);
    }
  }

  if (!resolved) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: 112,
          height: 38,
          borderRadius: 10,
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.15)',
        }}
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}
      >
        Sign In
      </Link>
    );
  }

  const initials = profile.username
    ? profile.username.slice(0, 2).toUpperCase()
    : (user.email ?? '?').slice(0, 2).toUpperCase();

  const displayName = profile.username || user.email?.split('@')[0] || 'User';
  const activeStatus = getPresenceMeta(status);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setMenuOpen((v) => {
            const next = !v;
            if (!next) setSettingsOpen(false);
            return next;
          });
        }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '5px 10px 5px 6px', cursor: 'pointer' }}
      >
        <div style={{ position: 'relative', width: 26, height: 26, flexShrink: 0 }}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={displayName} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {initials}
            </div>
          )}
          <span
            style={{
              position: 'absolute',
              right: -1,
              bottom: -1,
              width: 9,
              height: 9,
              borderRadius: '50%',
              border: '2px solid #101022',
              background: activeStatus.color,
              boxShadow: `0 0 10px ${activeStatus.color}55`,
            }}
          />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e2f0', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5a5a80" strokeWidth="2.5"
          style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {menuOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: settingsOpen ? 312 : 220,
          background: '#14142a', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 12,
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 100, transition: 'width 0.18s ease',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#5a5a80', marginBottom: 2 }}>Signed in as</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f0ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.14)', color: activeStatus.color, fontSize: 11, fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeStatus.color }} />
                {activeStatus.label}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', minHeight: 0 }}>
            <div style={{ padding: '6px', width: settingsOpen ? 132 : '100%', borderRight: settingsOpen ? '1px solid rgba(139,92,246,0.1)' : 'none' }}>
              <Link
                href="/profile"
                onClick={() => {
                  setMenuOpen(false);
                  setSettingsOpen(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, color: '#9d9db8', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                Profile
              </Link>
              <button
                onClick={() => setSettingsOpen((value) => !value)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 8, color: '#9d9db8', fontSize: 13, fontWeight: 500, width: '100%', background: settingsOpen ? 'rgba(139,92,246,0.1)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1v.17a2 2 0 1 1-4 0V21a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H2.83a2 2 0 1 1 0-4H3a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V2.83a2 2 0 1 1 4 0V3a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.24.31.44.65.6 1a1.65 1.65 0 0 0 1 .33h.17a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1 .33c-.35.16-.69.36-1 .6z"/>
                  </svg>
                  Settings
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5a5a80" strokeWidth="2.5" style={{ transform: settingsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                  <path d="M9 6l6 6-6 6"/>
                </svg>
              </button>
              <button
                onClick={handleSignOut}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, color: '#f87171', fontSize: 13, fontWeight: 500, width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
            {settingsOpen && (
              <div style={{ flex: 1, padding: 14, background: 'linear-gradient(180deg, rgba(11,11,26,0.9), rgba(17,17,35,0.92))' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#f1f0ff', marginBottom: 4 }}>
                  Presence
                </div>
                <div style={{ fontSize: 11, color: '#7f809e', lineHeight: 1.5, marginBottom: 12 }}>
                  Choose exactly how you appear in member lists and chat headers.
                </div>
                <StatusPicker
                  value={status}
                  onChange={handleStatusChange}
                  disabled={statusSaving}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
