'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { connectSocket } from '@/lib/socket';
import { getPresenceMeta } from '@/components/presence/StatusPicker';
import { useAuth } from '@/components/auth/AuthProvider';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { useWindowSize } from '@/hooks/useWindowSize';

export function NavUserButton() {
  const { user, token, profile, resolved } = useAuth();
  const { w: winW } = useWindowSize();
  const isMobile = winW < 640;
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    router.push('/');
    router.refresh();
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
      <a
        href="/login"
        className="px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.3)', textDecoration: 'none' }}
      >
        Sign In
      </a>
    );
  }

  const initials = profile.username
    ? profile.username.slice(0, 2).toUpperCase()
    : (user.email ?? '?').slice(0, 2).toUpperCase();

  const displayName = profile.username || user.email?.split('@')[0] || 'User';
  const tagSuffix = profile.userTag ? `#${profile.userTag}` : '';
  const activeStatus = getPresenceMeta(profile.status);

  function renderAvatar(size: number, fontSize: number) {
    const url = profile.avatarUrl;
    if (url && !url.startsWith('__default__:')) {
      return (
        <img
          src={url}
          alt={displayName}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      );
    }
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>
        {initials}
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 10, padding: '5px 10px 5px 6px', cursor: 'pointer',
          }}
        >
          <div style={{ position: 'relative', width: 26, height: 26, flexShrink: 0 }}>
            {renderAvatar(26, 11)}
            <span
              style={{
                position: 'absolute', right: -1, bottom: -1,
                width: 9, height: 9, borderRadius: '50%',
                border: '2px solid #101022',
                background: activeStatus.color,
                boxShadow: `0 0 10px ${activeStatus.color}55`,
              }}
            />
          </div>
          {!isMobile && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e2f0', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5a5a80" strokeWidth="2.5"
            style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 220,
            background: '#14142a', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 12,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 100,
          }}>
            {/* Profile header */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {renderAvatar(32, 13)}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f0ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                    {tagSuffix && <span style={{ color: '#5a5a80', fontWeight: 400, fontSize: 12 }}>{tagSuffix}</span>}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: activeStatus.color, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: activeStatus.color, fontWeight: 600 }}>{activeStatus.label}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '6px' }}>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setProfileOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, color: '#9d9db8', fontSize: 13, fontWeight: 500, width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.1)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                Profile
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
          </div>
        )}
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  );
}
