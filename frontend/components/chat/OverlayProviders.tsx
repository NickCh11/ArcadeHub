'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChatOverlayProvider } from './ChatOverlayContext';
import { ChatOverlay } from './ChatOverlay';
import { DMOverlayProvider } from './DMOverlayContext';
import { DMOverlay } from './DMOverlay';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { GamesOverlayProvider } from '@/components/games/GamesOverlayContext';
import { GamesOverlay } from '@/components/games/GamesOverlay';
import { GamesPanel } from '@/components/games/GamesPanel';

export function OverlayProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <AuthProvider>
      <ChatOverlayProvider>
        <DMOverlayProvider>
          <GamesOverlayProvider>
            {children}
            {mounted ? (
              <>
                <ChatOverlay />
                <DMOverlay />
                <GamesOverlay />
                <GamesPanel />
              </>
            ) : null}
          </GamesOverlayProvider>
        </DMOverlayProvider>
      </ChatOverlayProvider>
    </AuthProvider>
  );
}
