/**
 * Maps file extensions to Monaco Editor language IDs
 * @see https://github.com/microsoft/monaco-editor/tree/main/src/basic-languages
 */
const extensionToLanguage: Record<string, string> = {
  // TypeScript/JavaScript
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',

  // Python
  py: 'python',
  pyw: 'python',
  pyi: 'python',

  // Data formats
  json: 'json',
  jsonl: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  csv: 'plaintext',

  // Markup
  md: 'markdown',
  mdx: 'markdown',
  html: 'html',
  htm: 'html',
  svg: 'xml',

  // Stylesheets
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',

  // Shell
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',

  // SQL
  sql: 'sql',
  mysql: 'sql',
  pgsql: 'sql',

  // Systems languages
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'c',
  hpp: 'cpp',
  go: 'go',
  rs: 'rust',

  // Other languages
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  rb: 'ruby',
  php: 'php',
  cs: 'csharp',
  fs: 'fsharp',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
  scala: 'scala',
  perl: 'perl',
  pl: 'perl',

  // Config files
  dockerfile: 'dockerfile',
  dockerignore: 'dockerfile',
  env: 'plaintext',
  gitignore: 'plaintext',
  gitattributes: 'plaintext',
  editorconfig: 'plaintext',
  ini: 'ini',
  cfg: 'ini',
  conf: 'plaintext',

  // Other
  txt: 'plaintext',
  log: 'plaintext',
  diff: 'plaintext',
  patch: 'plaintext',
};

/**
 * Detects the Monaco Editor language ID from a file path
 * @param filePath - The file path or name
 * @returns Monaco Editor language ID (defaults to 'plaintext')
 */
export function detectLanguage(filePath: string): string {
  if (!filePath) return 'plaintext';

  // Handle special cases (no extension but known filename)
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';
  if (fileName === 'dockerfile') return 'dockerfile';
  if (fileName === '.dockerignore') return 'dockerfile';
  if (fileName.startsWith('.env')) return 'plaintext';
  if (fileName === '.gitignore' || fileName === '.gitattributes') return 'plaintext';
  if (fileName === '.editorconfig') return 'plaintext';

  // Extract extension
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return extensionToLanguage[ext] || 'plaintext';
}
