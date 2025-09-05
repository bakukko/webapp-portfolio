#!/bin/sh
echo "Starting deployment..."

# Kill existing processes
pkill -f "node server.js" || true
sleep 2

# Pull latest code if in git repo
if [ -d ".git" ]; then
    git pull origin main
fi

# Install dependencies
npm install

# Install dependencies for each app
if [ -d "dashboard" ]; then
    cd dashboard && npm install && cd ..
fi

if [ -d "apps/password-generator" ]; then
    cd apps/password-generator && npm install && cd ../..
fi

# Start applications in background
echo "Starting dashboard..."
cd dashboard && node server.js &
DASHBOARD_PID=$!

echo "Starting password generator..."
cd ../apps/password-generator && PORT=3001 node server.js &
GENERATOR_PID=$!

echo "Dashboard PID: $DASHBOARD_PID"
echo "Generator PID: $GENERATOR_PID"
echo "Applications started successfully"

# Wait for all background processes
wait
