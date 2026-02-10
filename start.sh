#!/bin/bash
# Mainder Feedback Hub — Start all services
# Usage: ./start.sh

set -e

eval "$(rbenv init -)"

echo "=== Mainder Feedback Hub ==="
echo ""
echo "Starting services..."
echo ""

# Ensure Redis is running
brew services start redis 2>/dev/null || true

# Start Rails server (background)
echo "[1/4] Starting Rails API server on port 3000..."
cd hub
bin/rails server -p 3000 &
RAILS_PID=$!
cd ..

# Wait for Rails to boot
sleep 4

# Start Sidekiq (background)
echo "[2/4] Starting Sidekiq worker..."
cd hub
bundle exec sidekiq -C config/sidekiq.yml &
SIDEKIQ_PID=$!
cd ..

# Wait for Sidekiq to be ready
sleep 2

# Kick off the simulator
echo "[3/4] Starting webhook simulator..."
cd hub
bin/rails simulator:start
cd ..

# Start Next.js frontend (foreground)
echo "[4/4] Starting Next.js frontend on port 3001..."
echo ""
echo "==================================="
echo "  Rails API:    http://localhost:3000"
echo "  Dashboard:    http://localhost:3001"
echo "  Sidekiq:      Running in background"
echo "  Simulator:    Firing every 10-30s"
echo "==================================="
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

cd frontend
npm run dev

# Cleanup on exit
kill $RAILS_PID $SIDEKIQ_PID 2>/dev/null
