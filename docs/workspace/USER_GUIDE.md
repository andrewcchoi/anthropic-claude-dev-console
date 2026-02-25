# Flexible Workspace User Guide

## Overview

The flexible workspace feature allows you to work with multiple projects simultaneously, supporting Local, Git, and SSH workspace types.

## Quick Start

### Adding a Local Workspace

```typescript
import { getWorkspaceManager } from '@/lib/workspace';

const manager = getWorkspaceManager();

const provider = await manager.registerProvider({
  type: 'local',
  path: '/path/to/project',
  name: 'My Project',
});

await manager.connectProvider(provider.id);
```

### Adding a Git Workspace

```typescript
const provider = await manager.registerProvider({
  type: 'git',
  repoUrl: 'https://github.com/user/repo.git',
  branch: 'main',
  name: 'GitHub Project',
});

await manager.connectProvider(provider.id);
```

### Adding an SSH Workspace

```typescript
const provider = await manager.registerProvider({
  type: 'ssh',
  host: 'example.com',
  port: 22,
  username: 'deploy',
  remotePath: '/var/www/app',
  name: 'Production Server',
});

await manager.connectProvider(provider.id);
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+P` | Open workspace switcher |
| `Cmd/Ctrl+1-9` | Switch to workspace 1-9 |

## Security Features

### Path Validation
All file paths are validated to prevent path traversal:
- ✅ `file.txt` - Allowed
- ✅ `dir/file.txt` - Allowed
- ❌ `../outside` - Blocked
- ❌ `/etc/passwd` - Blocked

### Command Validation
Dangerous commands are blocked:
- ❌ `rm -rf /` - Blocked
- ❌ `:(){ :|:& };:` - Blocked (fork bomb)
- ✅ `ls -la` - Allowed
- ✅ `npm install` - Allowed

### SSH Host Key Verification

Three modes available:

1. **strict**: Only accept known hosts
2. **tofu**: Trust On First Use, reject changes
3. **ask**: Always prompt user

## Credential Storage

Credentials are stored securely:

1. **Primary**: System keychain (macOS Keychain, Windows Credential Vault, Linux Secret Service)
2. **Fallback**: AES-256-GCM encrypted file (`~/.claude-credentials.enc`)

## Limits

| Resource | Limit |
|----------|-------|
| Max workspaces | 20 |
| SSH connections per host | 5 |
| Git storage | 5GB |
| Git repositories | 50 |

## Troubleshooting

### Connection Failed

**SSH:**
- Verify hostname, port, username
- Check SSH key permissions (chmod 600)
- Verify host key is accepted

**Git:**
- Verify URL format
- Check authentication (SSH keys, tokens)
- Ensure branch exists

**Local:**
- Verify path exists
- Check filesystem permissions

### Performance

- Git clones are cached in `~/.claude-workspaces/`
- SSH connections are pooled and reused
- Idle connections cleaned up after 5 minutes

## Best Practices

1. **Use SSH keys** instead of passwords when possible
2. **Favorite frequently used** workspaces for quick access
3. **Close unused workspaces** to free resources
4. **Use sparse checkout** for large Git repositories
5. **Monitor storage usage** (Git LRU eviction at 5GB)
