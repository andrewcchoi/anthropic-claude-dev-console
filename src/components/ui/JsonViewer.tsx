import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppTheme } from '@/hooks/useAppTheme';

interface JsonViewerProps {
  data: unknown;
  className?: string;
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  const { resolvedTheme } = useAppTheme();
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <SyntaxHighlighter
      language="json"
      style={resolvedTheme === 'light' ? vs : vscDarkPlus}
      customStyle={{
        margin: 0,
        padding: '0.5rem',
        fontSize: '0.75rem',
        borderRadius: '0.25rem',
      }}
      className={className}
    >
      {jsonString}
    </SyntaxHighlighter>
  );
}
