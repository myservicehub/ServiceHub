#!/bin/bash

# ServiceHub Application Startup Script
echo "🚀 Starting ServiceHub Application..."

# Check environment variables
if [ -z "$MONGO_URL" ]; then
    echo "⚠️  Warning: MONGO_URL not set, using default"
    export MONGO_URL="mongodb://localhost:27017/servicehub"
fi

if [ -z "$FRONTEND_URL" ]; then
    echo "⚠️  Warning: FRONTEND_URL not set, using default"
    export FRONTEND_URL="https://api.myservicehub.co"
fi

# Set default port if not provided
export PORT=${PORT:-8001}

echo "📊 Environment Configuration:"
echo "- MONGO_URL: ${MONGO_URL}"
echo "- FRONTEND_URL: ${FRONTEND_URL}"
echo "- PORT: ${PORT}"
echo "- DB_NAME: ${DB_NAME:-test_database}"

# Start the application
echo "🔧 Starting backend server..."
cd /app/backend
python server.py