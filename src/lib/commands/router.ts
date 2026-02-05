// Command routing logic for slash commands

export interface CommandInfo {
  command: string;
  handler: string;
  description: string;
}

// Built-in commands handled locally in the web UI
const LOCAL_COMMANDS: Record<string, string> = {
  '/help': 'openHelpPanel',
  '/clear': 'clearChat',
  '/status': 'openStatusPanel',
  '/cost': 'scrollToUsage',
  '/context': 'openContextPanel',
  '/config': 'openConfigPanel',
  '/copy': 'copyLastResponse',
  '/model': 'openModelPanel',
  '/theme': 'cycleTheme',
  '/export': 'exportConversation',
  '/todos': 'openTodosPanel',
  '/rename': 'openRenameDialog',
};

// Command descriptions for autocomplete
export const LOCAL_COMMAND_INFO: CommandInfo[] = [
  { command: '/help', handler: 'openHelpPanel', description: 'Show help panel with available commands' },
  { command: '/clear', handler: 'clearChat', description: 'Clear the current chat history' },
  { command: '/status', handler: 'openStatusPanel', description: 'Show connection and session status' },
  { command: '/cost', handler: 'scrollToUsage', description: 'Scroll to usage and cost information' },
  { command: '/context', handler: 'openContextPanel', description: 'Open context panel (future)' },
  { command: '/config', handler: 'openConfigPanel', description: 'Open configuration panel (future)' },
  { command: '/copy', handler: 'copyLastResponse', description: 'Copy last assistant response to clipboard' },
  { command: '/model', handler: 'openModelPanel', description: 'Open model selection panel' },
  { command: '/theme', handler: 'cycleTheme', description: 'Cycle through available themes' },
  { command: '/export', handler: 'exportConversation', description: 'Export conversation as JSON file' },
  { command: '/todos', handler: 'openTodosPanel', description: 'Show tasks and todos panel' },
  { command: '/rename', handler: 'openRenameDialog', description: 'Rename the current session' },
];

export type CommandRouteType = 'local' | 'passthrough';

export interface CommandRoute {
  type: CommandRouteType;
  handler?: string;
}

/**
 * Routes a command to the appropriate handler
 * @param input - The user input (potentially a slash command)
 * @returns Route information indicating how to handle the command
 */
export function routeCommand(input: string): CommandRoute {
  const trimmed = input.trim();

  // Check if it's a local command
  if (LOCAL_COMMANDS[trimmed]) {
    return {
      type: 'local',
      handler: LOCAL_COMMANDS[trimmed]
    };
  }

  // All other /commands pass through to CLI (skills, plugins, etc.)
  if (trimmed.startsWith('/')) {
    return { type: 'passthrough' };
  }

  // Regular messages also pass through
  return { type: 'passthrough' };
}
