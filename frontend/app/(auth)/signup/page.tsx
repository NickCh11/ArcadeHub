'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { bootstrapUserKeys } from '@/lib/auth/bootstrapKeys';
import { getAuthCallbackUrl } from '@/lib/publicUrl';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getSession().then((result: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      const { data } = result;
      if (data.session) {
        router.replace('/');
      }
    });
  }, [router]);

  async function handleGoogleSignup() {
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getAuthCallbackUrl() },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (authError) throw authError;

      const user = data.user;
      const session = data.session;

      if (!user) {
        throw new Error('Signup did not return a user');
      }

      if (!session) {
        router.replace('/login');
        return;
      }

      void bootstrapUserKeys(user.id, session.access_token).catch((keyError) => {
        console.error('[Auth] Key bootstrap failed after signup', keyError);
      });

      window.location.replace('/');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#070711' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="animate-blob absolute rounded-full" style={{ width: 500, height: 500, top: '20%', left: '30%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />
      </div>

      <div className="glass-elevated rounded-2xl p-8 w-full max-w-md relative animate-fade-in">
        <div className="mb-8 text-center">
          <div className="inline-flex w-12 h-12 rounded-xl items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 0 24px rgba(139,92,246,0.4)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#f1f0ff', letterSpacing: '-0.02em' }}>
            Join ArcadeHub
          </h1>
          <p style={{ color: '#5a5a80', fontSize: 14, marginTop: 6 }}>Create your account with E2E encrypted chat</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#9d9db8', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>USERNAME</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="gamer42"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(7,7,17,0.8)', border: '1px solid rgba(139,92,246,0.2)', color: '#f1f0ff', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#9d9db8', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>EMAIL</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(7,7,17,0.8)', border: '1px solid rgba(139,92,246,0.2)', color: '#f1f0ff', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#9d9db8', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>PASSWORD</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 8 characters"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(7,7,17,0.8)', border: '1px solid rgba(139,92,246,0.2)', color: '#f1f0ff', outline: 'none' }} />
          </div>

          {error && (
            <p className="text-sm px-4 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>
          )}

          <div className="e2e-badge" style={{ fontSize: 11 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Your crypto keys are generated locally — the server never sees them
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm mt-2"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', boxShadow: '0 8px 24px rgba(139,92,246,0.3)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'rgba(139,92,246,0.15)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#5a5a80', letterSpacing: '0.06em' }}>OR</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(139,92,246,0.15)' }} />
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e2f0', opacity: loading ? 0.7 : 1, transition: 'background 0.15s, border-color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.35)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center mt-6" style={{ fontSize: 13, color: '#5a5a80' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#8b5cf6', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
