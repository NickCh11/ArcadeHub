import type { Metadata } from 'next';
import './globals.css';
import { OverlayProviders } from '@/components/chat/OverlayProviders';
import { Syne, DM_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const syne = Syne({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'ArcadeHub - Gaming Platform',
  description: 'Discover, play, and connect. The ultimate dark-themed gaming platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full dark", syne.variable, dmSans.variable)} suppressHydrationWarning>
      <body className="grain min-h-full antialiased" suppressHydrationWarning>
        <OverlayProviders>{children}</OverlayProviders>
      </body>
    </html>
  );
}
