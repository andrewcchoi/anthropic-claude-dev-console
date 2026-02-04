import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppTheme } from '@/hooks/useAppTheme';

interface JsonViewerProps {
  data: unknown;
  className?: string;
}

/**
 * Format JSON with readable string values (escape sequences rendered)
 * This makes content like old_string/new_string in Edit tools readable
 */
function formatJsonReadable(data: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  const nextSpaces = '  '.repeat(indent + 1);

  if (data === null) return 'null';
  if (data === undefined) return 'undefined';

  if (typeof data === 'string') {
    // Check if string contains escape sequences that should be rendered
    if (data.includes('\n') || data.includes('\t')) {
      // Multi-line string - render with actual newlines, properly indented
      const lines = data.split('\n');
      if (lines.length > 1) {
        const indentedContent = lines
          .map((line, i) => (i === 0 ? line : nextSpaces + line))
          .join('\n');
        return `"${indentedContent}"`;
      }
    }
    // Single-line string - use JSON.stringify for proper escaping
    return JSON.stringify(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    const items = data.map(item => nextSpaces + formatJsonReadable(item, indent + 1));
    return `[\n${items.join(',\n')}\n${spaces}]`;
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return '{}';
    const items = entries.map(([key, value]) => {
      const formattedValue = formatJsonReadable(value, indent + 1);
      return `${nextSpaces}${JSON.stringify(key)}: ${formattedValue}`;
    });
    return `{\n${items.join(',\n')}\n${spaces}}`;
  }

  return String(data);
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  const { resolvedTheme } = useAppTheme();

  // Use readable format that renders escape sequences in strings
  const jsonString = typeof data === 'string' ? data : formatJsonReadable(data);

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
