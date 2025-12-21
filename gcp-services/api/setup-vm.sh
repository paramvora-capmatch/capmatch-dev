#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Setting up CapMatch API on GCP VM..."

# Build Docker image
cd "$REPO_ROOT"
docker build -f gcp-services/api/Dockerfile \
    -t capmatch-api:prod \
    gcp-services/api
echo "✓ Built Docker image: capmatch-api:prod"

# Create systemd service for auto-restart
sudo tee /etc/systemd/system/capmatch-api.service > /dev/null <<EOF
[Unit]
Description=CapMatch FastAPI Server
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=10
WorkingDirectory=$SCRIPT_DIR
ExecStart=$SCRIPT_DIR/start.sh
ExecStop=/usr/bin/docker stop capmatch-api

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable capmatch-api.service
sudo systemctl start capmatch-api.service

echo "✓ Created systemd service: capmatch-api"
echo ""
echo "Setup complete!"
echo "API running at: http://localhost:8080"
echo "Health check: curl http://localhost:8080/health"
echo "API docs: http://localhost:8080/docs"
echo ""
echo "Manage service:"
echo "  sudo systemctl status capmatch-api"
echo "  sudo systemctl restart capmatch-api"
echo "  sudo systemctl stop capmatch-api"
echo "  sudo journalctl -u capmatch-api -f  # View logs"
