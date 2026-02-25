/**
 * CommandValidator
 * Allowlist-based command validation for secure execution
 */

import { SecurityError } from '../errors';

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  /** If true, user can request approval for this command */
  canRequest?: boolean;
}

/**
 * Allowed base commands (first word of command)
 * These are considered safe for execution
 */
const ALLOWED_COMMANDS = new Set([
  // File operations (read-only or safe)
  'ls', 'cat', 'head', 'tail', 'grep', 'find', 'wc', 'file', 'stat',
  'diff', 'tree', 'du', 'df', 'pwd', 'readlink', 'realpath',

  // Text processing
  'sort', 'uniq', 'cut', 'tr', 'sed', 'awk', 'jq', 'yq',

  // Git operations
  'git',

  // Node.js ecosystem
  'node', 'npm', 'npx', 'yarn', 'pnpm', 'bun', 'deno',
  'tsc', 'tsx', 'ts-node', 'esbuild', 'vite', 'next',
  'jest', 'vitest', 'mocha', 'playwright', 'cypress',
  'eslint', 'prettier', 'biome',

  // Python ecosystem
  'python', 'python3', 'pip', 'pip3', 'pipx', 'uv',
  'pytest', 'mypy', 'ruff', 'black', 'flake8', 'isort',
  'poetry', 'pdm', 'hatch',

  // Rust ecosystem
  'cargo', 'rustc', 'rustfmt', 'clippy',

  // Go ecosystem
  'go', 'gofmt', 'golint',

  // Other languages
  'ruby', 'gem', 'bundler',
  'php', 'composer',
  'java', 'javac', 'mvn', 'gradle',

  // Build tools
  'make', 'cmake', 'ninja',

  // Container tools (read operations)
  'docker', 'podman',

  // Utilities
  'echo', 'printf', 'date', 'env', 'which', 'whereis', 'type',
  'basename', 'dirname', 'xargs', 'true', 'false',
  'sleep', 'timeout', 'time',

  // Archive (read operations)
  'tar', 'zip', 'unzip', 'gzip', 'gunzip', 'bzip2',

  // Network (safe operations)
  'curl', 'wget', 'http', 'httpie',

  // Editors (for scripts that might call them)
  'code', 'vim', 'nvim', 'nano', 'emacs',
]);

/**
 * Patterns that are always blocked regardless of base command
 */
const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Destructive file operations
  {
    pattern: /rm\s+(-[a-zA-Z]*)?r[a-zA-Z]*\s+[\/~]/,
    reason: 'Recursive delete of system directories',
  },
  {
    pattern: /rm\s+(-[a-zA-Z]*)?f[a-zA-Z]*\s+[\/~]/,
    reason: 'Force delete of system directories',
  },

  // Direct disk operations
  {
    pattern: />\s*\/dev\/sd/,
    reason: 'Direct disk write',
  },
  {
    pattern: /dd\s+.*of=\/dev/,
    reason: 'Direct device write',
  },
  {
    pattern: /mkfs/,
    reason: 'Filesystem format',
  },

  // Fork bombs and resource exhaustion
  {
    pattern: /:\(\)\{.*\};:/,
    reason: 'Fork bomb pattern',
  },
  {
    pattern: /while\s*true.*do/,
    reason: 'Potential infinite loop',
  },

  // Privilege escalation
  {
    pattern: /sudo\s+/,
    reason: 'Privilege escalation',
  },
  {
    pattern: /su\s+/,
    reason: 'User switching',
  },
  {
    pattern: /chmod\s+.*[0-7]?777/,
    reason: 'World-writable permissions',
  },
  {
    pattern: /chown\s+root/,
    reason: 'Ownership change to root',
  },

  // System modification
  {
    pattern: /systemctl\s+(start|stop|restart|enable|disable)/,
    reason: 'System service modification',
  },
  {
    pattern: /service\s+\w+\s+(start|stop|restart)/,
    reason: 'System service modification',
  },

  // Network attacks
  {
    pattern: /nc\s+.*-e/,
    reason: 'Netcat reverse shell',
  },
  {
    pattern: /nmap\s+/,
    reason: 'Network scanning',
  },

  // Code execution from network
  {
    pattern: /curl\s+.*\|\s*(bash|sh|python|perl)/,
    reason: 'Remote code execution',
  },
  {
    pattern: /wget\s+.*\|\s*(bash|sh|python|perl)/,
    reason: 'Remote code execution',
  },

  // Environment manipulation
  {
    pattern: /export\s+PATH=/,
    reason: 'PATH manipulation',
  },
  {
    pattern: /export\s+LD_PRELOAD=/,
    reason: 'Library injection',
  },
];

/**
 * Commands that require extra scrutiny
 */
const SENSITIVE_COMMANDS = new Set([
  'rm', 'mv', 'cp', 'chmod', 'chown',
  'docker', 'podman',
  'curl', 'wget',
  'ssh', 'scp', 'rsync',
]);

export class CommandValidator {
  private readonly additionalAllowed: Set<string>;
  private readonly additionalBlocked: Array<{ pattern: RegExp; reason: string }>;

  constructor(options?: {
    additionalAllowed?: string[];
    additionalBlocked?: Array<{ pattern: RegExp; reason: string }>;
  }) {
    this.additionalAllowed = new Set(options?.additionalAllowed ?? []);
    this.additionalBlocked = options?.additionalBlocked ?? [];
  }

  /**
   * Validate a command for execution
   */
  validate(command: string): ValidationResult {
    const trimmedCommand = command.trim();

    if (!trimmedCommand) {
      return { allowed: false, reason: 'Empty command' };
    }

    // Check blocked patterns first (highest priority)
    for (const { pattern, reason } of [...BLOCKED_PATTERNS, ...this.additionalBlocked]) {
      if (pattern.test(trimmedCommand)) {
        return {
          allowed: false,
          reason: `Blocked: ${reason}`,
          canRequest: false,
        };
      }
    }

    // Extract base command
    const baseCommand = this.extractBaseCommand(trimmedCommand);

    if (!baseCommand) {
      return { allowed: false, reason: 'Could not parse command' };
    }

    // Check if allowed
    if (ALLOWED_COMMANDS.has(baseCommand) || this.additionalAllowed.has(baseCommand)) {
      // Additional checks for sensitive commands
      if (SENSITIVE_COMMANDS.has(baseCommand)) {
        return this.validateSensitiveCommand(baseCommand, trimmedCommand);
      }
      return { allowed: true };
    }

    // Not in allowlist
    return {
      allowed: false,
      reason: `Command '${baseCommand}' is not in the allowlist`,
      canRequest: true,
    };
  }

  /**
   * Additional validation for sensitive commands
   */
  private validateSensitiveCommand(baseCommand: string, fullCommand: string): ValidationResult {
    switch (baseCommand) {
      case 'rm':
        // Block rm -rf with broad paths
        if (/rm\s+.*-[a-z]*r[a-z]*\s+\.\s*$/.test(fullCommand)) {
          // rm -r . is allowed (current directory)
          return { allowed: true };
        }
        if (/rm\s+.*-[a-z]*r[a-z]*\s+(\/|~|\.\.)/.test(fullCommand)) {
          return {
            allowed: false,
            reason: 'Recursive delete of parent/root directory',
            canRequest: false,
          };
        }
        return { allowed: true };

      case 'docker':
      case 'podman':
        // Block privileged containers
        if (/--privileged/.test(fullCommand)) {
          return {
            allowed: false,
            reason: 'Privileged container execution',
            canRequest: true,
          };
        }
        // Block host network
        if (/--network\s*=?\s*host/.test(fullCommand)) {
          return {
            allowed: false,
            reason: 'Host network access',
            canRequest: true,
          };
        }
        return { allowed: true };

      case 'curl':
      case 'wget':
        // Block piping to shell (already in blocked patterns, but double-check)
        if (/\|\s*(bash|sh|python|perl|ruby)/.test(fullCommand)) {
          return {
            allowed: false,
            reason: 'Remote code execution via pipe',
            canRequest: false,
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  /**
   * Extract the base command from a full command string
   */
  private extractBaseCommand(command: string): string | null {
    // Handle env vars prefix: VAR=value command
    const withoutEnvVars = command.replace(/^(\w+=\S*\s+)+/, '');

    // Handle path prefix: /usr/bin/command or ./command
    const withoutPath = withoutEnvVars.replace(/^[.\/\w-]+\//, '');

    // Get first word
    const match = withoutPath.match(/^([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if a command is in the allowlist
   */
  isAllowed(command: string): boolean {
    return this.validate(command).allowed;
  }

  /**
   * Throw if command is not allowed
   */
  assertAllowed(command: string): void {
    const result = this.validate(command);
    if (!result.allowed) {
      throw new SecurityError('BLOCKED_COMMAND', result.reason ?? 'Command not allowed', {
        context: { command: command.slice(0, 100) },
      });
    }
  }
}

// Singleton instance with default configuration
export const commandValidator = new CommandValidator();
