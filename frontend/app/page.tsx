import { Sidebar } from '@/components/layout/Sidebar';
import { OpenChatButton } from '@/components/chat/OpenChatButton';
import { NavUserButton } from '@/components/layout/NavUserButton';
import { HomeHero } from '@/components/home/HomeHero';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100dvh', background: '#070711', position: 'relative' }}>

      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 45% at 50% 100%, rgba(139,92,246,0.14) 0%, transparent 70%)',
      }} />

      {/* Dot grid */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(rgba(139,92,246,0.18) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 10%, rgba(0,0,0,0.5), transparent)',
        maskImage: 'radial-gradient(ellipse 90% 70% at 50% 10%, rgba(0,0,0,0.5), transparent)',
      }} />

      <Sidebar />

      <main style={{ marginLeft: 64, position: 'relative', zIndex: 1 }}>

        {/* Nav */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 28px',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(7,7,17,0.88)',
          borderBottom: '1px solid rgba(139,92,246,0.1)',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: '#fff',
              boxShadow: '0 4px 14px rgba(139,92,246,0.45)',
            }}>A</div>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 15,
              fontWeight: 700, color: '#f1f0ff', letterSpacing: '-0.02em',
            }}>ArcadeHub</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <OpenChatButton className="hp-ghost-btn">Open chat</OpenChatButton>
            <NavUserButton />
          </div>
        </header>

        {/* Hero + features — hidden when logged in */}
        <HomeHero />

      </main>
    </div>
  );
}
