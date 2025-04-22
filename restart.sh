#!/bin/bash
echo "Cleaning Watchman cache..."
watchman watch-del-all

echo "Cleaning Metro bundler cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null

echo "Cleaning node_modules/.cache..."
rm -rf node_modules/.cache 2>/dev/null
rm -rf frontend/node_modules/.cache 2>/dev/null
rm -rf backend/node_modules/.cache 2>/dev/null

echo "Starting backend server..."
cd backend && npm start &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 5

echo "Starting frontend..."
cd ../frontend && npm start

# Kill the backend process when the script is interrupted
trap "kill $BACKEND_PID" EXIT 