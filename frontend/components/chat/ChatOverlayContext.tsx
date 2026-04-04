'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface ChatOverlayCtx {
  isOpen: boolean;
  open: () => void;
  openRoom: (roomId: string) => void;
  close: () => void;
  toggle: () => void;
  targetRoomId: string | null;
  clearTargetRoom: () => void;
}

const Ctx = createContext<ChatOverlayCtx | null>(null);

export function ChatOverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState<string | null>(null);
  return (
    <Ctx.Provider value={{
      isOpen,
      open: () => setIsOpen(true),
      openRoom: (roomId) => {
        setTargetRoomId(roomId);
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
      targetRoomId,
      clearTargetRoom: () => setTargetRoomId(null),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useChatOverlay() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useChatOverlay must be used within ChatOverlayProvider');
  return ctx;
}
