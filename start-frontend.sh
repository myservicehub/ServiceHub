#!/bin/bash

# Load environment variables from .env file
cd /app/frontend

# Export environment variables for this session
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Debug: Print environment variables
echo "🔧 Environment Variables:"
echo "REACT_APP_BACKEND_URL: $REACT_APP_BACKEND_URL"
echo "NODE_ENV: $NODE_ENV"

# Start the React development server
exec yarn start