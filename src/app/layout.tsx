import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DebugProvider } from '@/components/providers/DebugProvider';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { MonacoErrorSuppressor } from '@/components/editor/MonacoErrorSuppressor';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Claude Code UI',
  description: 'Browser interface for Claude Code',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <MonacoErrorSuppressor />
        <DebugProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </DebugProvider>
      </body>
    </html>
  );
}
