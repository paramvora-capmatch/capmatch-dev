#!/usr/bin/env bash
# Deployment script for Email Notifications Service
# Usage: ./deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Email Notifications Service - Deployment"
echo "=========================================="

# Find git root (where .git directory actually is)
GIT_ROOT="$SCRIPT_DIR"
while [ "$GIT_ROOT" != "/" ] && [ ! -d "$GIT_ROOT/.git" ]; do
  GIT_ROOT="$(dirname "$GIT_ROOT")"
done

# Pull latest code
if [ -d "$GIT_ROOT/.git" ]; then
  echo ""
  echo "Step 1: Pulling latest code from $GIT_ROOT..."
  cd "$GIT_ROOT"
  git pull
  echo "✓ Code updated"
  cd "$SCRIPT_DIR"
else
  echo ""
  echo "⚠️  Not a git repository, skipping git pull"
fi

echo ""
echo "Step 2: Rebuilding Docker image..."
if [ -d "$GIT_ROOT/.git" ]; then
  docker build -f "$GIT_ROOT/gcp-services/email-notifications/Dockerfile" -t capmatch-email-notifications:prod "$GIT_ROOT"
else
  docker build -f "$SCRIPT_DIR/Dockerfile" -t capmatch-email-notifications:prod "$SCRIPT_DIR"
fi
echo "✓ Docker image rebuilt"

echo ""
echo "Step 3: Verifying .env file exists..."
if [ ! -f ".env" ]; then
  echo "⚠️  WARNING: .env file not found!"
  echo "   Make sure your environment variables are set before running the service."
else
  echo "✓ .env file found"
fi

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "To test the service:"
echo "  ./run-hourly.sh"
echo "  ./run-instant.sh"
echo ""
echo "To view logs:"
echo "  tail -f /var/log/email-notifications-hourly.log"
echo "  tail -f /var/log/email-notifications-instant.log"
echo ""





