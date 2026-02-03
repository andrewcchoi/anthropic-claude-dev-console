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
  // CLI-specific fields
  event?: {
    type: string;
    index?: number;
    content_block?: {
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: any;
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
    usage?: any;
  };
}

export type ContentBlockType = 'text' | 'tool_use' | 'tool_result' | 'image';

export interface MessageContent {
  type: ContentBlockType;
  text?: string;
  id?: string;
  name?: string;
  input?: any;
  content?: string | any[];
  tool_use_id?: string;
  is_error?: boolean;
  source?: { type: 'file'; path: string; originalName: string };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
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
  input: any;
  output?: any;
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
