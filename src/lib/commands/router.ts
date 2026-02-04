// Command routing logic for slash commands

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
