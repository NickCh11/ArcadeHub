'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChatOverlayProvider } from './ChatOverlayContext';
import { ChatOverlay } from './ChatOverlay';
import { DMOverlayProvider } from './DMOverlayContext';
import { DMOverlay } from './DMOverlay';
import { AuthProvider } from '@/components/auth/AuthProvider';

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
          {children}
          {mounted ? (
            <>
              <ChatOverlay />
              <DMOverlay />
            </>
          ) : null}
        </DMOverlayProvider>
      </ChatOverlayProvider>
    </AuthProvider>
  );
}
