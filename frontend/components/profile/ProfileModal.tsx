'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useWindowSize } from '@/hooks/useWindowSize';
import { createClient } from '@/lib/supabase';
import { getBackendUrl } from '@/lib/publicUrl';
import { SOCKET_EVENTS } from '@/types/events';
import { connectSocket } from '@/lib/socket';
import { StatusPicker, getPresenceMeta, type PresenceStatus } from '@/components/presence/StatusPicker';
import { useAuth } from '@/components/auth/AuthProvider';

const BACKEND = getBackendUrl();

const DEFAULT_AVATARS = [
  { id: 'red',    bg: 'linear-gradient(135deg,#ef4444,#b91c1c)', icon: '🎮' },
  { id: 'purple', bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', icon: '⚡' },
  { id: 'blue',   bg: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', icon: '🌌' },
  { id: 'green',  bg: 'linear-gradient(135deg,#22c55e,#15803d)', icon: '🎯' },
  { id: 'amber',  bg: 'linear-gradient(135deg,#f59e0b,#b45309)', icon: '🔥' },
  { id: 'pink',   bg: 'linear-gradient(135deg,#ec4899,#be185d)', icon: '🎲' },
];

function daysUntilUsernameUnlock(changedAt: string | null): number {
  if (!changedAt) return 0;
  const remaining = 7 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(changedAt).getTime());
  return remaining <= 0 ? 0 : Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

// Renders the avatar — defined outside component to avoid remount on every render
function AvatarDisplay({ avatarUrl, initials, size = 80 }: { avatarUrl: string | null; initials: string; size?: number }) {
  if (avatarUrl && avatarUrl.startsWith('__default__:')) {
    const id = avatarUrl.replace('__default__:', '');
    const def = DEFAULT_AVATARS.find(d => d.id === id) ?? DEFAULT_AVATARS[1];
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', background: def.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, flexShrink: 0,
      }}>
        {def.icon}
      </div>
    );
  }
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt="avatar" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 800, color: '#fff', flexShrink: 0,
      fontFamily: 'var(--font-display)',
    }}>
      {initials}
    </div>
  );
}

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, token, profile, refresh } = useAuth();
  const { w: winW, h: winH } = useWindowSize();
  const isMobile = winW < 640;

  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [status, setStatus] = useState<PresenceStatus>(profile.status);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const daysLocked = daysUntilUsernameUnlock(profile.usernameChangedAt);
  const usernameLocked = daysLocked > 0;

  const initials = profile.username
    ? profile.username.slice(0, 2).toUpperCase()
    : (user?.email ?? '?').slice(0, 2).toUpperCase();

  // Close on backdrop click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (overlayRef.current && e.target === overlayRef.current) onClose();
    }
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!user || !token) return;
    setUploading(true);
    setError('');
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    } catch (err: any) {
      setError(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [user, token]);

  async function handleStatusChange(nextStatus: PresenceStatus) {
    if (!token || statusSaving || nextStatus === status) return;
    setStatusSaving(true);
    setStatus(nextStatus);
    try {
      const res = await fetch(`${BACKEND}/api/users/me/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to update status');
      }
      const socket = connectSocket(token);
      socket.emit(SOCKET_EVENTS.UPDATE_STATUS, { status: nextStatus });
    } catch (err: any) {
      setError(err.message);
      setStatus(profile.status);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const body: Record<string, string> = {};

      if (!usernameLocked) {
        const trimmed = username.trim();
        if (trimmed !== profile.username) {
          if (trimmed.length < 2) throw new Error('Username must be at least 2 characters');
          body.username = trimmed;
        }
      }

      const trimmedBio = bio.trim();
      if (trimmedBio !== (profile.bio ?? '').trim()) {
        body.bio = trimmedBio;
      }

      if (avatarUrl !== profile.avatarUrl) {
        body.avatarUrl = avatarUrl ?? '';
      }

      if (Object.keys(body).length > 0) {
        const res = await fetch(`${BACKEND}/api/users/me/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });

        let resBody: any = {};
        try { resBody = await res.json(); } catch { /* empty body */ }

        if (!res.ok) {
          throw new Error(resBody?.error ?? `Save failed (${res.status})`);
        }
      }

      await refresh();
      setSuccessMsg('Profile saved!');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: any) {
      console.error('[ProfileModal] save error', err);
      setError(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(7,7,17,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
        padding: isMobile ? 0 : 16,
      }}
    >
      <div style={{
        width: '100%', maxWidth: isMobile ? '100%' : 480,
        background: '#14142a',
        border: '1px solid rgba(139,92,246,0.18)',
        borderRadius: isMobile ? '20px 20px 0 0' : 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        maxHeight: isMobile ? `${winH * 0.92}px` : '90vh',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: '1px solid rgba(139,92,246,0.1)',
          background: 'linear-gradient(180deg, rgba(139,92,246,0.05) 0%, transparent 100%)',
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#f1f0ff', margin: 0 }}>
              Edit Profile
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#5a5a80' }}>Customize how others see you</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(139,92,246,0.08)', color: '#5a5a80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#f1f0ff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#5a5a80'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: isMobile ? '16px' : '20px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', flex: 1 }}>

          {/* Avatar */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5a5a80', letterSpacing: '0.07em', display: 'block', marginBottom: 12, textTransform: 'uppercase' }}>
              Avatar
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <AvatarDisplay avatarUrl={avatarUrl} initials={initials} size={80} />
                {uploading && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(7,7,17,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.3)', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite' }} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#c4b5fd', cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.5 : 1 }}
                  onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.12)'; }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload photo
                </button>
                <p style={{ margin: '5px 0 0', fontSize: 11, color: '#5a5a80' }}>JPG, PNG or WebP · max 2 MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); e.target.value = ''; }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#5a5a80' }}>Or pick a default</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {DEFAULT_AVATARS.map(av => {
                  const isSelected = avatarUrl === `__default__:${av.id}`;
                  return (
                    <button key={av.id} onClick={() => setAvatarUrl(`__default__:${av.id}`)}
                      style={{ width: 38, height: 38, borderRadius: 10, border: `2px solid ${isSelected ? '#8b5cf6' : 'transparent'}`, background: av.bg, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isSelected ? '0 0 12px rgba(139,92,246,0.5)' : 'none', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                    >
                      {av.icon}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(139,92,246,0.08)' }} />

          {/* Tag (read-only) */}
          {profile.userTag && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#5a5a80', letterSpacing: '0.07em', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                Your Tag
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  padding: '8px 14px', borderRadius: 10, fontSize: 15, fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
                  color: '#a78bfa', letterSpacing: '0.04em',
                }}>
                  {profile.username || 'user'}<span style={{ color: '#5a5a80' }}>#{profile.userTag}</span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#5a5a80' }}>Unique identifier · cannot be changed</p>
              </div>
            </div>
          )}

          {/* Username */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#5a5a80', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Username
              </label>
              {usernameLocked && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 7px', borderRadius: 999 }}>
                  🔒 {daysLocked}d cooldown
                </span>
              )}
            </div>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              disabled={usernameLocked} placeholder="your_username" maxLength={32}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, background: usernameLocked ? 'rgba(7,7,17,0.4)' : 'rgba(7,7,17,0.8)', border: `1px solid ${usernameLocked ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.2)'}`, color: usernameLocked ? '#5a5a80' : '#f1f0ff', outline: 'none', cursor: usernameLocked ? 'not-allowed' : 'text', boxSizing: 'border-box' }}
            />
            {usernameLocked && (
              <p style={{ margin: '5px 0 0', fontSize: 11, color: '#5a5a80' }}>
                Can be changed once per week. Available in {daysLocked} day{daysLocked !== 1 ? 's' : ''}.
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#5a5a80', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Bio <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <span style={{ fontSize: 11, color: bio.length > 180 ? '#f59e0b' : '#5a5a80' }}>{bio.length}/200</span>
            </div>
            <textarea
              value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Tell others a bit about yourself…" maxLength={200} rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, background: 'rgba(7,7,17,0.8)', border: '1px solid rgba(139,92,246,0.2)', color: '#f1f0ff', outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)', lineHeight: 1.6, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ height: 1, background: 'rgba(139,92,246,0.08)' }} />

          {/* Status */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5a5a80', letterSpacing: '0.07em', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
              Presence
            </label>
            <StatusPicker value={status} onChange={handleStatusChange} disabled={statusSaving} compact />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {error && <p style={{ margin: 0, fontSize: 12, color: '#f87171', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{error}</p>}
            {successMsg && <p style={{ margin: 0, fontSize: 12, color: '#22c55e' }}>{successMsg}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)', color: '#9d9db8', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.06)'; }}
            >
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || uploading}
              style={{ padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', border: 'none', color: '#fff', cursor: saving || uploading ? 'default' : 'pointer', opacity: saving || uploading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(139,92,246,0.3)' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}
