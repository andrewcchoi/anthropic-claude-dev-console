# Tailscale SSH Setup Guide

Connect to remote machines via SSH without port forwarding, firewall configuration, or public IPs using Tailscale.

## Overview

Tailscale creates a secure mesh network (WireGuard-based) that allows you to access your devices from anywhere. Combined with this app's SSH workspace feature, you can:

- **Auto-discover** devices on your Tailnet
- **Connect securely** without exposing ports to the internet
- **Access from anywhere** - coffee shop, mobile, corporate networks
- **Bypass NAT** - no router configuration needed

## Prerequisites

1. **Tailscale account** - Free at [tailscale.com](https://tailscale.com)
2. **Tailscale installed** on:
   - Your local machine (where this app runs)
   - The remote machine(s) you want to connect to
3. **SSH server** running on the remote machine

## Quick Start

### 1. Install Tailscale

**On your local machine:**
```bash
# Linux
curl -fsSL https://tailscale.com/install.sh | sh

# macOS
brew install tailscale

# Windows
# Download from https://tailscale.com/download/windows
```

**On your remote machine:**
```bash
# Same installation process as above
curl -fsSL https://tailscale.com/install.sh | sh
```

### 2. Connect Both Machines

```bash
# On both machines, run:
sudo tailscale up

# This opens a browser to authenticate
# Sign in with the same account on both machines
```

### 3. Verify Connection

```bash
# Check your devices
tailscale status

# You should see both machines listed
# e.g., "my-laptop" and "my-server"
```

### 4. Add SSH Workspace

1. Open the app
2. Click **"Add Workspace"** in the sidebar
3. Select **🔐 SSH**
4. Enable **"Use Tailscale"** toggle (on by default)
5. Select your device from the list
6. Enter SSH username and remote path
7. Click **"Connect"**

## Connection Types

### Direct Connection (Best)
- Devices communicate peer-to-peer
- Lowest latency (typically <10ms on LAN)
- Badge shows: **⚡ Direct**

### Relay Connection (DERP)
- Traffic routed through Tailscale's relay servers
- Used when direct connection isn't possible
- Badge shows: **📡 Relay**
- Higher latency but still secure (WireGuard encrypted)

**Tip:** Enable "Require direct connection" in the form if you need low latency and both devices are on the same network.

## Detailed Setup

### Remote Machine Configuration

1. **Install Tailscale** (see Quick Start)

2. **Enable SSH access:**
   ```bash
   # Ensure SSH server is installed and running
   sudo systemctl enable ssh
   sudo systemctl start ssh
   ```

3. **Optional: Enable Tailscale SSH**

   Tailscale can provide SSH access without traditional SSH keys:
   ```bash
   sudo tailscale up --ssh
   ```

   This uses your Tailscale identity for authentication.

### Authentication Options

| Method | Description |
|--------|-------------|
| **SSH Key** (Recommended) | Uses your `~/.ssh/id_rsa` or specified key |
| **Password** | Prompts for password on each connection |
| **Tailscale SSH** | Uses Tailscale identity (no separate SSH keys) |

### Using SSH Keys

1. **Generate key** (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. **Copy to remote machine:**
   ```bash
   # Replace with your Tailscale device name/IP
   ssh-copy-id user@my-server
   # or
   ssh-copy-id user@100.x.x.x
   ```

3. **In the app:**
   - Select "SSH Key" authentication
   - Ensure key path is correct (default: `~/.ssh/id_rsa`)

## Form Fields Explained

| Field | Description | Example |
|-------|-------------|---------|
| **Use Tailscale** | Enable device discovery | Toggle on |
| **Device** | Select from discovered devices | "my-server" |
| **Use Magic DNS** | Use hostname instead of IP | Usually off |
| **Require Direct** | Fail if relay needed | For LAN only |
| **Username** | SSH user on remote | `pi`, `ubuntu` |
| **Remote Path** | Directory to open | `/home/pi/projects` |
| **Auth Method** | Key or password | SSH Key |
| **Key Path** | Path to private key | `~/.ssh/id_rsa` |

## Advanced Options

### Magic DNS

When enabled, uses Tailscale's Magic DNS names instead of IP addresses:
- `my-server.tailnet-name.ts.net` instead of `100.x.x.x`

**Benefits:**
- Human-readable names
- Automatic DNS updates if IP changes

**Drawbacks:**
- Requires DNS resolution
- May be slower initially

### Require Direct Connection

When enabled, connection fails if a direct peer-to-peer path isn't available.

**Use when:**
- Both devices are on same LAN
- You need lowest possible latency
- You don't want relay traffic

**Don't use when:**
- Connecting from mobile/hotel networks
- Firewall blocks peer-to-peer
- You just want it to work

## Security Notes

1. **Double Encryption**
   - WireGuard encrypts the Tailscale tunnel
   - SSH encrypts the application layer
   - Defense in depth

2. **No Public Exposure**
   - Devices only accessible within your Tailnet
   - No public IPs or port forwarding needed

3. **Access Control**
   - Use Tailscale ACLs to restrict access
   - [Tailscale Admin Console](https://login.tailscale.com/admin)

## Next Steps

- [Platform-Specific Instructions](./tailscale-platforms.md)
- [Troubleshooting Guide](./tailscale-troubleshooting.md)
- [Tailscale Documentation](https://tailscale.com/kb/)
