#!/bin/bash

# ServiceHub Upload to Hostinger Script
echo "📤 ServiceHub Upload to Hostinger VPS"
echo "====================================="

# Check if required parameters are provided
if [ $# -lt 1 ]; then
    echo "Usage: $0 <vps-ip-address> [username]"
    echo "Example: $0 123.456.789.0 root"
    exit 1
fi

VPS_IP=$1
USERNAME=${2:-root}

echo "🎯 Target: $USERNAME@$VPS_IP"
echo "📁 Uploading ServiceHub files..."

# Create archive of essential files
echo "📦 Creating deployment package..."
tar -czf servicehub-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='build' \
    --exclude='__pycache__' \
    --exclude='.git' \
    --exclude='*.log' \
    backend/ frontend/ *.md *.sh *.yml

echo "✅ Package created: servicehub-deploy.tar.gz"

# Upload to VPS
echo "🚀 Uploading to VPS..."
scp servicehub-deploy.tar.gz $USERNAME@$VPS_IP:/tmp/

# Extract on VPS
echo "📂 Extracting files on VPS..."
ssh $USERNAME@$VPS_IP << 'EOF'
    cd /var/www/servicehub
    tar -xzf /tmp/servicehub-deploy.tar.gz
    chown -R www-data:www-data /var/www/servicehub
    rm /tmp/servicehub-deploy.tar.gz
    echo "✅ Files extracted successfully!"
EOF

# Clean up local archive
rm servicehub-deploy.tar.gz

echo "🎉 Upload completed!"
echo ""
echo "Next steps on your VPS:"
echo "1. SSH into your VPS: ssh $USERNAME@$VPS_IP"
echo "2. Update .env files with your domain and API keys"
echo "3. Install frontend dependencies: cd /var/www/servicehub/frontend && npm install"
echo "4. Build frontend: npm run build"
echo "5. Start backend: cd /var/www/servicehub/backend && source venv/bin/activate && pm2 start server.py --name servicehub-backend --interpreter python3"
echo "6. Populate database: python3 quick_seed.py"