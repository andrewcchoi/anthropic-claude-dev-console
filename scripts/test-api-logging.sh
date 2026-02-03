#!/bin/bash
# Test API logging with correlation IDs

echo "=== Testing API Logging ==="
echo ""

# Start dev server in background
echo "Starting dev server..."
npm run dev > /tmp/dev-server.log 2>&1 &
DEV_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 10

# Check if server is running
if ! ps -p $DEV_PID > /dev/null; then
    echo "❌ Dev server failed to start"
    cat /tmp/dev-server.log
    exit 1
fi

echo "✓ Server started (PID: $DEV_PID)"
echo ""

# Test GET request
echo "Testing GET /api/example..."
RESPONSE=$(curl -s -i http://localhost:3000/api/example)
CORRELATION_ID=$(echo "$RESPONSE" | grep -i "x-correlation-id" | cut -d' ' -f2 | tr -d '\r')

echo "Response headers:"
echo "$RESPONSE" | head -15
echo ""
echo "Correlation ID: $CORRELATION_ID"
echo ""

# Test POST request
echo "Testing POST /api/example..."
RESPONSE=$(curl -s -i -X POST http://localhost:3000/api/example \
  -H "Content-Type: application/json" \
  -d '{"test": "data", "number": 123}')

echo "Response headers:"
echo "$RESPONSE" | head -15
echo ""

# Check logs for correlation IDs
echo "Checking server logs for structured logging..."
sleep 2
grep -i "correlation" /tmp/dev-server.log | tail -5 || echo "No correlation IDs found in logs"
echo ""

# Cleanup
echo "Stopping dev server..."
kill $DEV_PID 2>/dev/null
sleep 2
kill -9 $DEV_PID 2>/dev/null

echo ""
echo "=== Test Complete ==="
