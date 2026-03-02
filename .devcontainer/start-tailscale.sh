#!/bin/bash
# Start Tailscale daemon for DevContainer
# Uses userspace networking (required for containers without TUN device)

set -e

# Create required directories
sudo mkdir -p /var/run/tailscale /var/lib/tailscale

# Check if tailscaled is already running
if pgrep -x tailscaled > /dev/null; then
    echo "✓ Tailscale daemon already running"
    exit 0
fi

# Start tailscaled in userspace networking mode (background, no output)
sudo tailscaled \
    --tun=userspace-networking \
    --state=/var/lib/tailscale/tailscaled.state \
    --socket=/var/run/tailscale/tailscaled.sock \
    &>/dev/null &

# Wait for socket to be ready
for i in {1..10}; do
    if [ -S /var/run/tailscale/tailscaled.sock ]; then
        echo "✓ Tailscale daemon started"
        exit 0
    fi
    sleep 0.5
done

echo "⚠ Tailscale daemon may not have started properly"
exit 0  # Don't fail container startup
