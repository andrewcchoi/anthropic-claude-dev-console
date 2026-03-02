# Platform-Specific Instructions

Tailscale installation and configuration varies by platform. This guide covers the specifics for each.

## Linux

### Installation

**Ubuntu/Debian:**
```bash
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/jammy.noarmor.gpg | \
  sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/jammy.tailscale-keyring.list | \
  sudo tee /etc/apt/sources.list.d/tailscale.list

sudo apt-get update
sudo apt-get install tailscale
```

**Fedora/RHEL/CentOS:**
```bash
sudo dnf config-manager --add-repo https://pkgs.tailscale.com/stable/fedora/tailscale.repo
sudo dnf install tailscale
```

**Arch Linux:**
```bash
sudo pacman -S tailscale
```

### Starting Tailscale

```bash
# Enable and start the daemon
sudo systemctl enable --now tailscaled

# Connect to your Tailnet
sudo tailscale up

# Verify connection
tailscale status
```

### Permission Configuration

If you see permission errors, add your user to the tailscale group:

```bash
sudo usermod -aG tailscale $USER

# Log out and back in, or run:
newgrp tailscale
```

### Headless/Server Setup

For servers without a browser:

```bash
# This prints a URL to visit
sudo tailscale up

# Or use auth key (from admin console):
sudo tailscale up --authkey=tskey-auth-xxxxx
```

## macOS

### Installation Options

**Option 1: Mac App Store (Recommended)**
- Search "Tailscale" in App Store
- Runs in menu bar
- Auto-updates

**Option 2: Homebrew**
```bash
brew install tailscale

# Start the daemon
sudo tailscaled &

# Connect
tailscale up
```

### App vs CLI Differences

| Feature | App Store | Homebrew |
|---------|-----------|----------|
| GUI | ✅ Menu bar | ❌ CLI only |
| Auto-updates | ✅ | ✅ via brew |
| Daemon management | Automatic | Manual |
| Sudo required | No | Yes (for daemon) |

### macOS Firewall

If Tailscale doesn't work:
1. System Settings → Network → Firewall
2. Ensure Tailscale is allowed
3. Or temporarily disable firewall to test

## Windows

### Installation

1. Download from [tailscale.com/download/windows](https://tailscale.com/download/windows)
2. Run installer
3. Click "Connect" in system tray
4. Sign in via browser

### Command Line (Optional)

```powershell
# If installed, CLI is available
tailscale status
tailscale ping <device>
```

### Windows Firewall

Tailscale usually configures this automatically. If issues occur:
1. Windows Security → Firewall
2. Allow Tailscale through firewall
3. For both private and public networks

## Docker / DevContainer

### Running in Docker

Tailscale in Docker requires special configuration:

**docker-compose.yml:**
```yaml
services:
  app:
    # Your app configuration...

  tailscale:
    image: tailscale/tailscale:latest
    hostname: docker-tailscale
    environment:
      - TS_AUTHKEY=tskey-auth-xxxxx  # From admin console
      - TS_STATE_DIR=/var/lib/tailscale
    volumes:
      - tailscale-state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    restart: unless-stopped

volumes:
  tailscale-state:
```

### Accessing from Container

If running this app in a DevContainer:

1. **Option A: Install Tailscale in container**
   ```dockerfile
   RUN curl -fsSL https://tailscale.com/install.sh | sh
   ```

2. **Option B: Use host Tailscale**
   - Run Tailscale on host
   - Container accesses via host network

3. **Option C: Sidecar container**
   - Run Tailscale in separate container
   - Share network namespace

### DevContainer Configuration

**.devcontainer/devcontainer.json:**
```json
{
  "name": "My Dev Container",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "runArgs": [
    "--cap-add=NET_ADMIN",
    "--device=/dev/net/tun"
  ],
  "postStartCommand": "sudo tailscaled & sudo tailscale up --authkey=${TS_AUTHKEY}"
}
```

## Raspberry Pi

### Installation

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo systemctl enable --now tailscaled
sudo tailscale up
```

### Headless Setup

For Pi without monitor:

```bash
# Get auth key from Tailscale admin console
sudo tailscale up --authkey=tskey-auth-xxxxx
```

### SSH Server

Ensure SSH is enabled:
```bash
sudo raspi-config
# Interface Options → SSH → Enable

# Or via command:
sudo systemctl enable --now ssh
```

## Troubleshooting by Platform

### Linux: "Permission denied"
```bash
sudo usermod -aG tailscale $USER
# Then log out/in
```

### macOS: "Connection refused"
```bash
# Ensure daemon is running
sudo tailscaled &
```

### Windows: Slow startup
- Check if Tailscale service is set to "Automatic"
- Services → Tailscale → Properties → Startup type

### Docker: "No route to host"
- Ensure `--cap-add=NET_ADMIN`
- Ensure `/dev/net/tun` is mounted
- Check container network mode

## CLI Quick Reference

All platforms support these commands:

```bash
# Check status
tailscale status

# List devices
tailscale status --json | jq '.Peer | keys'

# Ping a device
tailscale ping <hostname>

# Check IP
tailscale ip

# Disconnect
tailscale down

# Reconnect
tailscale up

# Version
tailscale version
```

## Next Steps

- [Troubleshooting Guide](./tailscale-troubleshooting.md)
- [Main Setup Guide](./tailscale-ssh-setup.md)
