// Types for Claude CLI stream-json messages
export type SDKMessageType = 'system' | 'assistant' | 'stream_event' | 'result' | 'user' | 'error' | 'session_locked';

export interface SDKMessage {
  type: SDKMessageType;
  subtype?: string;
  content?: MessageContent[];
  session_id?: string;
  tools?: string[];
  model?: string;
  permissionMode?: string;
  text?: string;
  delta?: string;
  success?: boolean;
  error?: string;
  is_error?: boolean;
  total_cost_usd?: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  duration_ms?: number;
  // Init-specific fields
  slash_commands?: string[];
  skills?: string[];
  plugins?: Array<{ name: string; path: string }>;
  mcp_servers?: Array<{ name: string; status: string }>;
  cwd?: string;
  claude_code_version?: string;
  agents?: string[];
  // CLI-specific fields
  event?: {
    type: string;
    index?: number;
    content_block?: {
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    };
    delta?: {
      type: string;
      text?: string;
      partial_json?: string;
    };
  };
  message?: {
    content?: MessageContent[];
    model?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

export type ContentBlockType = 'text' | 'tool_use' | 'tool_result' | 'image' | 'system_info';

export interface MessageContent {
  type: ContentBlockType;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string | unknown[];
  tool_use_id?: string;
  is_error?: boolean;
  source?: { type: 'file'; path: string; originalName: string };
}

export interface SystemInfoContent {
  type: 'system_info';
  model?: string;
  sessionId?: string;
  toolCount?: number;
  mcpServers?: Array<{ name: string; status: string }>;
  cliVersion?: string;
  cwd?: string;
  permissionMode?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: MessageContent[];
  timestamp: number;
  isStreaming?: boolean;
}

export interface Session {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  cwd: string;
}

export interface ToolExecution {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
}

export interface UsageStats {
  totalCost: number;         // USD
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  requestCount: number;      // Number of requests in session
}

export type Provider = 'anthropic' | 'bedrock' | 'vertex' | 'foundry';

export type DefaultMode = 'default' | 'acceptEdits' | 'plan' | 'dontAsk' | 'bypassPermissions';

export interface ProviderConfig {
  // API Keys
  anthropicApiKey?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  foundryApiKey?: string;
  // Config
  awsRegion?: string;
  vertexRegion?: string;
  vertexProjectId?: string;
  foundryResource?: string;
}
