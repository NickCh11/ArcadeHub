'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type GameId = 'billiards';

interface GamesOverlayCtx {
  isLibraryOpen: boolean;
  openLibrary: () => void;
  closeLibrary: () => void;
  toggleLibrary: () => void;
  activeGame: GameId | null;
  launchGame: (id: GameId) => void;
  closeGame: () => void;
}

const Ctx = createContext<GamesOverlayCtx | null>(null);

export function GamesOverlayProvider({ children }: { children: ReactNode }) {
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  return (
    <Ctx.Provider
      value={{
        isLibraryOpen,
        activeGame,
        openLibrary: () => setLibraryOpen(true),
        closeLibrary: () => setLibraryOpen(false),
        toggleLibrary: () => setLibraryOpen((v) => !v),
        launchGame: (id) => setActiveGame(id),
        closeGame: () => setActiveGame(null),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useGamesOverlay() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGamesOverlay must be used within GamesOverlayProvider');
  return ctx;
}
