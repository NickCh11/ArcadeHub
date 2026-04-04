'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { bootstrapUserKeys } from '@/lib/auth/bootstrapKeys';

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function completeSessionFromUrl() {
  const supabase = createClient();
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  const existingSession = await supabase.auth.getSession();
  if (existingSession.data.session) {
    return existingSession.data.session;
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      return data.session;
    }

    console.warn('[Auth callback] Session exchange failed', error);
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!error && data.session) {
      return data.session;
    }

    console.warn('[Auth callback] Session restore failed', error);
  }

  const fallbackSession = await supabase.auth.getSession();
  return fallbackSession.data.session;
}

export default function AuthCallbackPage() {
  const startedRef = useRef(false);
  const [status, setStatus] = useState('Completing sign-in...');

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function run() {
      try {
        const session = await completeSessionFromUrl();

        if (!session) {
          setStatus('Authentication failed. Redirecting...');
          await delay(1200);
          window.location.replace('/login');
          return;
        }

        setStatus('Finishing sign-in...');
        void bootstrapUserKeys(session.user.id, session.access_token).catch((error) => {
          console.error('[Auth callback] Key bootstrap failed', error);
        });

        await delay(150);
        window.location.replace('/');
      } catch (error) {
        console.error('[Auth callback] Unexpected failure', error);
        setStatus('Something went wrong. Redirecting...');
        await delay(1200);
        window.location.replace('/login');
      }
    }

    void run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#070711' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="animate-blob absolute rounded-full" style={{ width: 500, height: 500, top: '20%', left: '30%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />
      </div>
      <div className="glass-elevated rounded-2xl p-10 flex flex-col items-center gap-6 animate-fade-in" style={{ minWidth: 320 }}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 0 24px rgba(139,92,246,0.4)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
        <div className="flex items-center gap-3">
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: '#c4b5fd' }}>
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
