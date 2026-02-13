#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ -z "$MONITOR_PASSWORD" ]; then
  echo "ERROR: Set MONITOR_PASSWORD env var first"
  echo "  export MONITOR_PASSWORD=your_secure_password"
  exit 1
fi

echo "==> Installing dependencies..."
bun install

echo "==> Building..."
bun run build

echo "==> Starting with PM2..."
pm2 delete galerra-server 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "==> Done. Server running on port ${PORT:-2567}"
pm2 status galerra-server
