# Tailscale SSH Troubleshooting Guide

Solutions for common issues when connecting to SSH workspaces via Tailscale.

## Quick Diagnostics

Run these commands to gather diagnostic information:

```bash
# Check Tailscale status
tailscale status

# Check version
tailscale version

# Ping remote device
tailscale ping <hostname>

# View detailed status
tailscale status --json
```

## Common Issues

### 1. "Tailscale is not installed"

**Symptom:** App shows "Install Tailscale" prompt

**Solutions:**
1. Install Tailscale: [tailscale.com/download](https://tailscale.com/download)
2. Ensure it's in your PATH:
   ```bash
   which tailscale
   # Should return: /usr/bin/tailscale or similar
   ```
3. Restart your shell/terminal after installation

---

### 2. "Not logged in to Tailscale"

**Symptom:** App shows "Login to Tailscale" prompt

**Solutions:**
```bash
# Login to Tailscale
tailscale up

# If browser doesn't open:
tailscale up --login-server=https://controlplane.tailscale.com

# For headless/server:
tailscale up --authkey=tskey-auth-xxxxx
```

---

### 3. "Tailscale is not connected"

**Symptom:** Status shows disconnected, no devices listed

**Solutions:**
```bash
# Check daemon is running
sudo systemctl status tailscaled   # Linux
launchctl list | grep tailscale    # macOS

# Start daemon
sudo systemctl start tailscaled    # Linux
sudo tailscaled &                  # macOS (CLI)

# Reconnect
tailscale up
```

---

### 4. "Device not found"

**Symptom:** Remote device doesn't appear in list

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Device offline | Turn on remote device, check internet |
| Different Tailnet | Ensure same account on both devices |
| Device removed | Re-add device via `tailscale up` |
| Cache stale | Click refresh button in picker |

**Verify device is in Tailnet:**
```bash
# List all devices
tailscale status

# Check admin console
# https://login.tailscale.com/admin/machines
```

---

### 5. "Device is offline"

**Symptom:** Device shown but marked offline

**Solutions:**
1. Ensure remote device is powered on
2. Check internet connectivity on remote
3. Restart Tailscale on remote:
   ```bash
   sudo systemctl restart tailscaled
   tailscale up
   ```
4. Check for firewall blocking Tailscale

---

### 6. "SSH not available"

**Symptom:** Connection times out, "Connection refused"

**The remote machine has Tailscale but SSH isn't reachable.**

**Solutions:**

1. **Verify SSH is running:**
   ```bash
   # On remote machine
   sudo systemctl status ssh
   # or
   sudo systemctl status sshd
   ```

2. **Start SSH service:**
   ```bash
   sudo systemctl enable --now ssh
   ```

3. **Check SSH port:**
   ```bash
   sudo netstat -tlnp | grep :22
   # or
   ss -tlnp | grep :22
   ```

4. **Test SSH locally on remote:**
   ```bash
   ssh localhost
   ```

5. **Check firewall on remote:**
   ```bash
   sudo ufw status  # Ubuntu
   sudo firewall-cmd --list-all  # Fedora/RHEL
   ```

---

### 7. "Permission denied" (Tailscale)

**Symptom:** Can't run `tailscale` commands

**Solutions:**

**Linux:**
```bash
# Add to tailscale group
sudo usermod -aG tailscale $USER
# Log out and back in
```

**macOS:**
```bash
# May need sudo for CLI
sudo tailscale status
```

---

### 8. "Permission denied" (SSH)

**Symptom:** SSH connection fails with auth error

**Solutions:**

1. **Check username:**
   - Verify the username exists on remote
   - Common: `pi`, `ubuntu`, `root`, `admin`

2. **SSH Key issues:**
   ```bash
   # Check key exists locally
   ls -la ~/.ssh/id_rsa

   # Check permissions
   chmod 600 ~/.ssh/id_rsa
   chmod 700 ~/.ssh

   # Copy key to remote
   ssh-copy-id user@100.x.x.x
   ```

3. **Check authorized_keys on remote:**
   ```bash
   cat ~/.ssh/authorized_keys
   # Should contain your public key
   ```

---

### 9. "Relay not allowed"

**Symptom:** Connection fails when "Require direct" is enabled

**This means direct peer-to-peer isn't possible.**

**Solutions:**
1. Disable "Require direct connection" toggle
2. If you need direct:
   - Ensure both devices on same network
   - Check firewall allows UDP (Tailscale uses WireGuard)
   - Try restarting Tailscale on both ends

---

### 10. Slow/high latency connection

**Symptom:** Connection works but is laggy

**Diagnose:**
```bash
tailscale ping <hostname>
# Check if "via DERP" or direct
```

**If using relay (DERP):**
- This is expected for devices behind strict NAT
- Latency depends on distance to relay server
- Try:
  - Connecting from different network
  - Opening UDP ports if possible
  - Using different relay region (Tailscale chooses automatically)

**If direct but slow:**
- Check network connection on both ends
- Run speed test on both machines
- Check for bandwidth throttling

---

### 11. "Invalid Tailscale IP"

**Symptom:** App rejects IP address

**This is a security feature.** Tailscale IPs must be in:
- IPv4: `100.64.0.0/10` (100.x.x.x where x=64-127)
- IPv6: `fd7a:115c:a1e0::/48`

**If you see non-Tailscale IPs:**
- You may be trying to use a regular IP
- Use the device picker instead of manual entry
- If device shows wrong IP, contact Tailscale support

---

### 12. Connection drops frequently

**Solutions:**
1. Check internet stability on both ends
2. Update Tailscale to latest version:
   ```bash
   # Linux
   sudo apt update && sudo apt upgrade tailscale

   # macOS
   brew upgrade tailscale
   ```
3. Check for VPN conflicts
4. Disable any conflicting network software

---

## Error Code Reference

| Code | Description | Solution |
|------|-------------|----------|
| TAILSCALE_NOT_INSTALLED | CLI not found | Install Tailscale |
| TAILSCALE_NOT_LOGGED_IN | Not authenticated | Run `tailscale up` |
| TAILSCALE_NOT_CONNECTED | Daemon not connected | Start daemon + `tailscale up` |
| TAILSCALE_DEVICE_NOT_FOUND | Device ID unknown | Refresh device list |
| TAILSCALE_DEVICE_OFFLINE | Device unreachable | Check remote device |
| TAILSCALE_RELAY_NOT_ALLOWED | Direct required but unavailable | Disable "require direct" |
| TAILSCALE_TIMEOUT | CLI command hung | Restart tailscaled |
| TAILSCALE_PERMISSION_DENIED | No permission to run CLI | Add user to tailscale group |
| SSH_NOT_AVAILABLE | SSH server not responding | Start SSH on remote |

---

## Getting Help

### Gather Diagnostic Info

```bash
# Full diagnostic dump
tailscale bugreport

# Status as JSON (for support)
tailscale status --json > tailscale-status.json
```

### Support Resources

- **Tailscale Knowledge Base:** [tailscale.com/kb](https://tailscale.com/kb/)
- **Tailscale Discord:** [discord.gg/tailscale](https://discord.gg/tailscale)
- **GitHub Issues:** [github.com/tailscale/tailscale](https://github.com/tailscale/tailscale/issues)

### App-Specific Issues

For issues with this app's Tailscale integration (not Tailscale itself):
1. Check browser console for errors
2. Enable debug mode: `enableDebug()` in console
3. Export logs: `downloadLogs()` in console
4. Check API responses in Network tab

---

## Preventive Measures

1. **Keep Tailscale updated** - fixes and improvements
2. **Use SSH keys** - more reliable than passwords
3. **Monitor device status** - admin console shows offline devices
4. **Test connections periodically** - catch issues early
5. **Document your setup** - helps troubleshooting later
