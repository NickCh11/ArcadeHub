import type { Metadata } from 'next';
import './globals.css';
import { OverlayProviders } from '@/components/chat/OverlayProviders';

export const metadata: Metadata = {
  title: 'ArcadeHub - Gaming Platform',
  description: 'Discover, play, and connect. The ultimate dark-themed gaming platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="grain min-h-full antialiased" style={{ fontFamily: 'var(--font-sans)' }} suppressHydrationWarning>
        <OverlayProviders>{children}</OverlayProviders>
      </body>
    </html>
  );
}
