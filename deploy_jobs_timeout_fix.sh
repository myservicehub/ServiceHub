#!/bin/bash
# Deploy Jobs Timeout Fix
# This script restarts the backend with the performance optimizations

echo "======================================"
echo "Deploying Jobs Timeout Fix"
echo "======================================"
echo ""
echo "Changes made:"
echo "✓ Added missing expires_at filter to get_jobs_near_location_with_skills()"
echo "✓ Reduced batch fetching from limit+skip+50 to limit*3"
echo "✓ Added database-level skip/limit for pagination"
echo "✓ Added @time_it decorators for performance monitoring"
echo "✓ Fixed duplicate @time_it decorator"
echo ""

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "❌ ERROR: backend/.env not found!"
    exit 1
fi

echo "🔄 Restarting backend server..."
echo ""

# Kill existing processes
pkill -f "python.*server.py" || true
sleep 2

# Start the backend in the background
cd backend
python server.py &
BACKEND_PID=$!

echo "✅ Backend server started (PID: $BACKEND_PID)"
echo ""
echo "📊 Server will:"
echo "   - Create indexes on startup"
echo "   - Start logging query performance with @time_it"
echo "   - Use optimized batch fetching"
echo ""
echo "🎯 Test the fix:"
echo "   1. Open http://localhost:3000/browse-jobs"
echo "   2. Jobs should load within 2-5 seconds (was 60+ timeout)"
echo "   3. Check browser console for no timeout errors"
echo ""
echo "📋 Monitor performance:"
echo "   - Check backend logs for @time_it output"
echo "   - Queries should show < 100ms execution time"
echo ""
