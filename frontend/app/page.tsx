import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { OpenChatButton } from '@/components/chat/OpenChatButton';
import { NavUserButton } from '@/components/layout/NavUserButton';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { name: 'Action', icon: '⚡', count: '2.4k games' },
  { name: 'RPG', icon: '⚔️', count: '1.8k games' },
  { name: 'Strategy', icon: '🎯', count: '956 games' },
  { name: 'Puzzle', icon: '🧩', count: '1.2k games' },
  { name: 'Sports', icon: '🏆', count: '743 games' },
  { name: 'Arcade', icon: '🕹️', count: '3.1k games' },
];

const STATS = [
  { value: '50K+', label: 'Active Players' },
  { value: '12K+', label: 'Games Listed' },
  { value: '98%', label: 'Uptime' },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen" style={{ background: '#070711' }}>
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="animate-blob absolute rounded-full" style={{
          width: 600, height: 600, top: '-10%', left: '10%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          '--duration': '22s',
        } as React.CSSProperties} />
        <div className="animate-blob absolute rounded-full" style={{
          width: 500, height: 500, top: '40%', right: '5%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)',
          '--duration': '28s', animationDelay: '-8s',
        } as React.CSSProperties} />
        <div className="animate-blob absolute rounded-full" style={{
          width: 400, height: 400, bottom: '5%', left: '30%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          '--duration': '18s', animationDelay: '-4s',
        } as React.CSSProperties} />
      </div>

      <Sidebar />

      {/* Main content */}
      <main className="flex-1 ml-16 flex flex-col">
        {/* Navbar */}
        <header className="h-16 flex items-center justify-between px-8 border-b" style={{ borderColor: 'rgba(139,92,246,0.1)' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: '#f1f0ff', letterSpacing: '-0.02em' }}>
              Arcade<span style={{ color: '#8b5cf6' }}>Hub</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a5a80" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search games..."
                className="pl-9 pr-4 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(20,20,42,0.8)', border: '1px solid rgba(139,92,246,0.15)', color: '#f1f0ff', outline: 'none', width: 220 }}
              />
            </div>
            <OpenChatButton
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)', cursor: 'pointer' }}>
              Open Chat
            </OpenChatButton>
            <NavUserButton />
          </div>
        </header>

        {/* Hero */}
        <section className="flex flex-col justify-center px-12 pt-20 pb-16 max-w-4xl animate-fade-in">
          <div className="e2e-badge mb-6" style={{ width: 'fit-content' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            End-to-End Encrypted Chat
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(48px, 6vw, 76px)',
            lineHeight: 1.05, letterSpacing: '-0.03em', color: '#f1f0ff', marginBottom: 24,
          }}>
            Your Ultimate<br />
            <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Gaming Hub
            </span>
          </h1>
          <p style={{ fontSize: 18, color: '#9d9db8', lineHeight: 1.7, maxWidth: 480, marginBottom: 36 }}>
            Discover thousands of games, connect with players worldwide — all with privacy-first, end-to-end encrypted messaging.
          </p>
          <div className="flex gap-3">
            <OpenChatButton
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', boxShadow: '0 8px 24px rgba(139,92,246,0.35)', fontSize: 15, cursor: 'pointer' }}>
              Open Chat
            </OpenChatButton>
            <Link href="/signup"
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)', fontSize: 15 }}>
              Create Account
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-12">
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: '#8b5cf6', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#5a5a80', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="px-12 pb-20">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#f1f0ff', marginBottom: 20, letterSpacing: '-0.02em' }}>
            Browse Categories
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat.name}
                className="glass rounded-2xl p-5 cursor-pointer animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>{cat.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#f1f0ff', marginBottom: 4 }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: '#5a5a80' }}>{cat.count}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
