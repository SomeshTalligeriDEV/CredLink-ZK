#!/bin/sh
set -e

echo "=== CredLink ZK Production Server ==="
echo "Starting backend on port 3001..."
cd /app/backend
node server.js &

echo "Starting frontend on port 3000..."
cd /app/frontend
npx next start -p 3000 &

echo "=== Both services started ==="
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
