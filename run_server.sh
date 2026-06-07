#!/bin/bash
# Startup script for LinkedIn Profile Optimizer Backend Server
# Uses the environment's bundled Node binary to run without dependencies

BUNDLED_NODE="/usr/local/google/home/princedatta/.jetski-server/bin/2.0.20260417120021-ffa9490c1da264b5f25ed35664fcaa40a63ede65/node"
SERVER_SCRIPT="server/index.js"

if [ -f "$BUNDLED_NODE" ]; then
  echo "Starting Backend Server using bundled Node..."
  "$BUNDLED_NODE" "$SERVER_SCRIPT"
else
  # Fallback to system node if available
  if command -v node >/dev/null 2>&1; then
    echo "Starting Backend Server using system Node..."
    node "$SERVER_SCRIPT"
  else
    echo "ERROR: Node.js executable not found."
    echo "Please configure Node.js or run using the editor's bundled Node path."
    exit 1
  fi
fi
