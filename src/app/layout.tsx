import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DebugProvider } from '@/components/providers/DebugProvider';

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
        <DebugProvider>{children}</DebugProvider>
      </body>
    </html>
  );
}
