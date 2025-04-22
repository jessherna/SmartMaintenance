#!/bin/bash
echo "Cleaning Watchman cache..."
watchman watch-del-all 2>/dev/null || echo "Watchman not found, skipping"

echo "Cleaning cache files..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null
rm -rf frontend/node_modules/.cache 2>/dev/null
rm -rf backend/node_modules/.cache 2>/dev/null

# Store the root directory
ROOT_DIR=$(pwd)

echo "Starting backend server..."
cd "${ROOT_DIR}/backend" || { echo "Backend directory not found"; exit 1; }
npm start &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 5

echo "Starting frontend..."
cd "${ROOT_DIR}/frontend" || { echo "Frontend directory not found"; exit 1; }
npm start

# Kill the backend process when the script is interrupted
trap "kill $BACKEND_PID" EXIT 