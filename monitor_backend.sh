#!/bin/bash
# Backend log monitor script
LOG_FILE="/tmp/backend_reload.log"

echo "Monitoring backend server logs..."
echo "Press Ctrl+C to stop"
echo "================================"
tail -f "$LOG_FILE"
