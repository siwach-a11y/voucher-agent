#!/bin/bash
cd "$(dirname "$0")"
echo "Starting AgentHub demo server..."
echo "Open: http://localhost:3456"
echo "Press Ctrl+C to stop."
npx --yes serve . -p 3456
