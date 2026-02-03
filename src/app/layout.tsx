import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DebugProvider } from '@/components/providers/DebugProvider';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Claude Code UI',
  description: 'Browser interface for Claude Code',
};

/**
 * Inline script to suppress Monaco Editor errors in Next.js dev overlay.
 *
 * This runs BEFORE Next.js devtools initializes to catch Monaco error objects
 * (e.g., {type: 'cancelation'}) before they appear as "[object Object]" in the overlay.
 *
 * @see /docs/troubleshooting/MONACO_ERROR_SUPPRESSION.md for:
 * - How this works and why it's needed
 * - Troubleshooting steps if errors still appear
 * - How to temporarily disable for debugging
 * - How to adjust error patterns
 */
const monacoErrorSuppressorScript = `
(function() {
  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;
    if (reason && typeof reason === 'object') {
      // Monaco cancelation error: {type: 'cancelation', msg: '...'}
      if (reason.type === 'cancelation') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      // Check for Monaco-related error messages
      var message = reason.message || reason.msg || '';
      if (typeof message === 'string' && (
        message.indexOf('monaco') !== -1 ||
        message.indexOf('Monaco') !== -1 ||
        message.indexOf('editor') !== -1 ||
        message.indexOf('Loading chunk') !== -1
      )) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }
  }, true); // Use capture phase to run first
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: monacoErrorSuppressorScript }} />
      </head>
      <body className={inter.className}>
        <DebugProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </DebugProvider>
      </body>
    </html>
  );
}
