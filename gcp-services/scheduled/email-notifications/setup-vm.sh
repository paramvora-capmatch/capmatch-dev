#!/usr/bin/env bash
# VM Setup Script for Email Notifications Service
# Usage: ./setup-vm.sh

set -e

echo "=========================================="
echo "Email Notifications Service - VM Setup"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Locate repo root (where .git lives) for Docker build context
REPO_ROOT="$SCRIPT_DIR"
while [ "$REPO_ROOT" != "/" ] && [ ! -d "$REPO_ROOT/.git" ]; do
  REPO_ROOT="$(dirname "$REPO_ROOT")"
done

HAS_GIT_ROOT=false
if [ -d "$REPO_ROOT/.git" ]; then
  HAS_GIT_ROOT=true
else
  REPO_ROOT="$SCRIPT_DIR"
fi

if [ "$EUID" -eq 0 ]; then
  echo "Please don't run this script as root. It will use sudo when needed."
  exit 1
fi

echo ""
echo "Step 1: Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y git

echo ""
echo "Step 2: Checking Docker installation..."
if command -v docker > /dev/null 2>&1 && docker info > /dev/null 2>&1; then
  echo "✓ Docker is already installed and working"
else
  echo "Installing Docker (docker.io)..."
  if ! sudo apt-get install -y docker.io 2>&1; then
    echo "⚠️  Docker installation had issues (maybe already installed another way)."
    echo "   If 'docker' command works, you can ignore this; otherwise, install Docker manually."
  fi
fi

echo ""
echo "Step 3: Setting up Docker group..."
if ! groups | grep -q docker; then
  sudo usermod -aG docker "$USER"
  echo "✓ Added user to docker group. You may need to log out and back in for group changes to take effect."
  NEED_LOGOUT=true
else
  echo "✓ User is already in docker group"
  NEED_LOGOUT=false
fi

echo ""
echo "Step 4: Setting timezone to Pacific Time..."
sudo timedatectl set-timezone America/Los_Angeles
echo "✓ Timezone set to America/Los_Angeles"

echo ""
echo "Step 5: Creating log files..."
sudo mkdir -p /var/log
sudo touch /var/log/email-notifications-hourly.log
sudo touch /var/log/email-notifications-instant.log
sudo chown "$USER:$USER" /var/log/email-notifications-hourly.log
sudo chown "$USER:$USER" /var/log/email-notifications-instant.log
echo "✓ Log files created"

echo ""
echo "Step 6: Building Docker image..."
if docker info > /dev/null 2>&1; then
  if [ "$HAS_GIT_ROOT" = true ]; then
    docker build -f "$REPO_ROOT/gcp-services/scheduled/email-notifications/Dockerfile" -t capmatch-email-notifications:prod "$REPO_ROOT"
  else
    docker build -f "$SCRIPT_DIR/Dockerfile" -t capmatch-email-notifications:prod "$SCRIPT_DIR"
  fi
  echo "✓ Docker image built successfully"
else
  echo "⚠️  Docker daemon not accessible. Skipping image build."
  echo "   After logging out and back in (or running 'newgrp docker'), run:"
  if [ "$HAS_GIT_ROOT" = true ]; then
    echo "   docker build -f $REPO_ROOT/gcp-services/email-notifications/Dockerfile -t capmatch-email-notifications:prod $REPO_ROOT"
  else
    echo "   docker build -f $SCRIPT_DIR/Dockerfile -t capmatch-email-notifications:prod $SCRIPT_DIR"
  fi
fi

echo ""
echo "Step 7: Setting up cron jobs..."
# Hourly job: runs every hour at minute 0, between 6am and 6pm (6-18 in 24-hour format)
CRON_HOURLY="0 6-18 * * * $SCRIPT_DIR/run-hourly.sh"
# Instant job: runs every minute
CRON_INSTANT="* * * * * $SCRIPT_DIR/run-instant.sh"
(crontab -l 2>/dev/null | grep -v "run-hourly.sh" | grep -v "run-instant.sh"; echo "$CRON_HOURLY"; echo "$CRON_INSTANT") | crontab -
echo "✓ Cron jobs added (hourly digest 6am-6pm + instant notifications every minute)"

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Ensure .env file exists in this directory with required variables:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - RESEND_API_KEY"
echo ""
if [ "$NEED_LOGOUT" = true ]; then
  echo "2. Log out and back in (or run 'newgrp docker') to pick up docker group changes."
  echo "   Then you can rebuild the image if needed (see above command)."
else
  echo "2. Optionally log out and back in if Docker group changes were applied."
fi
echo ""
echo "3. Test the service manually:"
echo "   ./run-hourly.sh"
echo "   ./run-instant.sh"
echo ""
echo "4. Check logs:"
echo "   tail -f /var/log/email-notifications-hourly.log"
echo "   tail -f /var/log/email-notifications-instant.log"
echo ""
echo "5. View cron schedule:"
echo "   crontab -l"
echo ""





