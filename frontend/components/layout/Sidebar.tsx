'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChatOverlay } from '@/components/chat/ChatOverlayContext';
import { useDMOverlay } from '@/components/chat/DMOverlayContext';
import { useAuth } from '@/components/auth/AuthProvider';

const CHAT_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const linkItems = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/games',
    label: 'Games',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 12h4M8 10v4M15 11h2M15 13h2" />
      </svg>
    ),
  },
];

function SidebarShell({ children }: { children: React.ReactNode }) {
  return (
    <aside className="sidebar fixed left-0 top-0 h-full flex flex-col items-center py-4 gap-1 z-40">
      <Link
        href="/"
        className="mb-4 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      </Link>

      <nav className="flex flex-col gap-1 w-full px-2">{children}</nav>
    </aside>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, toggle } = useChatOverlay();
  const { isOpen: isDMOpen, toggle: toggleDM } = useDMOverlay();
  const { user, resolved } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <SidebarShell>
        {linkItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className="relative w-full flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200"
            style={{ color: '#5a5a80', background: 'transparent' }}
          >
            {item.icon}
            <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em' }}>
              {item.label.toUpperCase()}
            </span>
          </Link>
        ))}

        <button
          title="Chat"
          className="relative w-full flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200"
          style={{ color: '#3d3d58', background: 'transparent', border: 'none', cursor: 'not-allowed', opacity: 0.55 }}
          aria-disabled="true"
          tabIndex={-1}
        >
          {CHAT_ICON}
          <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em' }}>CHAT</span>
        </button>

        <button
          title="Direct Messages"
          className="relative w-full flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200"
          style={{ color: '#3d3d58', background: 'transparent', border: 'none', cursor: 'not-allowed', opacity: 0.55 }}
          aria-disabled="true"
          tabIndex={-1}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-.997 16 16 0 0 0 7-1.383 16 16 0 0 0 7 1.384 1 1 0 0 1 1 .996z" />
          </svg>
          <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em' }}>DMS</span>
        </button>
      </SidebarShell>
    );
  }

  const canUseRealtime = resolved && !!user;

  return (
    <SidebarShell>
      {linkItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className="relative w-full flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200"
            style={{
              color: isActive ? '#8b5cf6' : '#5a5a80',
              background: isActive ? 'rgba(139,92,246,0.12)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget as HTMLElement).style.color = '#9d9db8';
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget as HTMLElement).style.color = '#5a5a80';
            }}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r" style={{ background: '#8b5cf6' }} />
            )}
            {item.icon}
            <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em' }}>
              {item.label.toUpperCase()}
            </span>
          </Link>
        );
      })}

      <button
        onClick={() => {
          if (canUseRealtime) toggle();
        }}
        title="Chat"
        className="relative w-full flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200"
        style={{
          color: isOpen ? '#8b5cf6' : (canUseRealtime ? '#5a5a80' : '#3d3d58'),
          background: isOpen ? 'rgba(139,92,246,0.12)' : 'transparent',
          border: 'none',
          cursor: canUseRealtime ? 'pointer' : 'not-allowed',
          opacity: canUseRealtime ? 1 : 0.55,
        }}
        onMouseEnter={(e) => {
          if (canUseRealtime && !isOpen) (e.currentTarget as HTMLElement).style.color = '#9d9db8';
        }}
        onMouseLeave={(e) => {
          if (canUseRealtime && !isOpen) (e.currentTarget as HTMLElement).style.color = '#5a5a80';
        }}
        aria-disabled={!canUseRealtime}
        tabIndex={!canUseRealtime ? -1 : 0}
      >
        {isOpen && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r" style={{ background: '#8b5cf6' }} />
        )}
        {CHAT_ICON}
        <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em' }}>CHAT</span>
      </button>

      <button
        onClick={() => {
          if (canUseRealtime) toggleDM();
        }}
        title="Direct Messages"
        className="relative w-full flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200"
        style={{
          color: isDMOpen ? '#8b5cf6' : (canUseRealtime ? '#5a5a80' : '#3d3d58'),
          background: isDMOpen ? 'rgba(139,92,246,0.12)' : 'transparent',
          border: 'none',
          cursor: canUseRealtime ? 'pointer' : 'not-allowed',
          opacity: canUseRealtime ? 1 : 0.55,
        }}
        onMouseEnter={(e) => {
          if (canUseRealtime && !isDMOpen) (e.currentTarget as HTMLElement).style.color = '#9d9db8';
        }}
        onMouseLeave={(e) => {
          if (canUseRealtime && !isDMOpen) (e.currentTarget as HTMLElement).style.color = '#5a5a80';
        }}
        aria-disabled={!canUseRealtime}
        tabIndex={!canUseRealtime ? -1 : 0}
      >
        {isDMOpen && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r" style={{ background: '#8b5cf6' }} />
        )}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-.997 16 16 0 0 0 7-1.383 16 16 0 0 0 7 1.384 1 1 0 0 1 1 .996z" />
        </svg>
        <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em' }}>DMS</span>
      </button>
    </SidebarShell>
  );
}
