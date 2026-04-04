'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface DMOverlayCtx {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const Ctx = createContext<DMOverlayCtx | null>(null);

export function DMOverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Ctx.Provider value={{
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDMOverlay() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDMOverlay must be used within DMOverlayProvider');
  return ctx;
}
