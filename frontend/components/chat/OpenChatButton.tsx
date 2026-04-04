'use client';

import { useEffect, useState } from 'react';
import { useChatOverlay } from './ChatOverlayContext';
import { useAuth } from '@/components/auth/AuthProvider';

interface OpenChatButtonProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function OpenChatButton({ className, style, children }: OpenChatButtonProps) {
  const { open } = useChatOverlay();
  const { user, resolved } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDisabled = !mounted || !resolved || !user;

  return (
    <button
      onClick={() => {
        if (!isDisabled && user) open();
      }}
      className={className}
      style={{ ...style, opacity: mounted && resolved && !user ? 0.55 : style?.opacity }}
      aria-disabled={isDisabled}
      tabIndex={isDisabled ? -1 : 0}
    >
      {children}
    </button>
  );
}
