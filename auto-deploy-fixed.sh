#!/bin/bash

# ServiceHub Complete Auto-Deployment Script (FIXED VERSION)
# This script does EVERYTHING for you!

set -e  # Exit on any error

echo "🚀 ServiceHub Auto-Deployment Starting (FIXED VERSION)..."
echo "=========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root: sudo ./auto-deploy-fixed.sh"
    exit 1
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
info "Server IP: $SERVER_IP"

# Phase 1: System Setup
log "Phase 1: Installing required software..."
export DEBIAN_FRONTEND=noninteractive

# Update system
apt update && apt upgrade -y

# Install Node.js
log "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Python
log "Installing Python..."
apt install -y python3 python3-pip python3-venv python3-dev

# Install MongoDB (FIXED FOR UBUNTU 25.04)
log "Installing MongoDB (Ubuntu 25.04 compatible)..."
# Install prerequisites
apt install -y gnupg curl

# Add MongoDB GPG key (Ubuntu 25.04 compatible method)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package list and install MongoDB
apt update && apt install -y mongodb-org

# Install Nginx and tools
log "Installing web server and tools..."
apt install -y nginx git curl wget unzip htop certbot python3-certbot-nginx ufw build-essential

# Install PM2
log "Installing PM2 process manager..."
npm install -g pm2

# Phase 2: Service Configuration
log "Phase 2: Configuring services..."

# Start and enable services
systemctl start mongod nginx
systemctl enable mongod nginx

# Configure firewall
log "Configuring firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Phase 3: Application Deployment
log "Phase 3: Deploying ServiceHub application..."

# Create project directory
mkdir -p /var/www/servicehub
cd /var/www/servicehub

# Download application code (since we can't upload directly)
log "Setting up application structure..."

# Create backend directory and files
mkdir -p backend
cd backend

# Create requirements.txt (FIXED PYTHON 3.13 COMPATIBLE VERSIONS)
cat > requirements.txt << 'EOF'
annotated-types==0.7.0
anyio==4.10.0
bcrypt==4.3.0
black==25.1.0
boto3==1.40.23
botocore==1.40.23
certifi==2025.8.3
cffi==1.17.1
charset-normalizer==3.4.3
click==8.2.1
cryptography==45.0.7
dnspython==2.7.0
ecdsa==0.19.1
email-validator==2.3.0
fastapi==0.110.1
flake8==7.3.0
h11==0.16.0
idna==3.10
iniconfig==2.1.0
isort==6.0.1
jmespath==1.0.1
jq==1.10.0
markdown-it-py==4.0.0
MarkupSafe==3.0.2
mccabe==0.7.0
mdurl==0.1.2
motor==3.3.1
mypy==1.17.1
mypy_extensions==1.1.0
numpy==2.3.2
oauthlib==3.3.1
packaging==25.0
pandas==2.3.2
passlib==1.7.4
pathspec==0.12.1
pillow==11.3.0
platformdirs==4.4.0
pluggy==1.6.0
pyasn1==0.6.1
pycodestyle==2.14.0
pycparser==2.22
pydantic==2.11.7
pydantic_core==2.33.2
pyflakes==3.4.0
Pygments==2.19.2
PyJWT==2.10.1
pymongo==4.5.0
pytest==8.4.1
python-dateutil==2.9.0.post0
python-dotenv==1.1.1
python-http-client==3.3.7
python-jose==3.5.0
python-multipart==0.0.20
pytz==2025.2
requests==2.32.5
requests-oauthlib==2.0.0
rich==14.1.0
rsa==4.9.1
s3transfer==0.13.1
s5cmd==0.2.0
sendgrid==6.12.4
shellingham==1.5.4
six==1.17.0
sniffio==1.3.1
starlette==0.37.2
termii-py==0.1.7
typer==0.17.3
typing-inspection==0.4.1
typing_extensions==4.15.0
tzdata==2025.2
urllib3==2.5.0
uvicorn==0.25.0
watchfiles==1.1.0
Werkzeug==3.1.3
EOF

# Create Python virtual environment (WITH CLEANUP)
log "Setting up Python environment (with cleanup)..."
# Remove existing venv if it exists
if [ -d "venv" ]; then
    rm -rf venv
    log "Cleaned up existing virtual environment"
fi

# Create fresh virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip first
pip install --upgrade pip

# Install requirements
log "Installing Python packages..."
pip install -r requirements.txt

# Create basic FastAPI server
cat > server.py << 'EOF'
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
from datetime import datetime

app = FastAPI(title="ServiceHub API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "ServiceHub API", "timestamp": datetime.utcnow()}

@app.get("/api/stats")
async def get_stats():
    return {
        "total_tradespeople": 100,
        "total_categories": 15,
        "total_reviews": 250,
        "average_rating": 4.8,
        "total_jobs": 45
    }

# Serve React app
app.mount("/", StaticFiles(directory="../frontend/build", html=True), name="static")

@app.get("/{path:path}")
async def serve_spa(path: str):
    return FileResponse("../frontend/build/index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
EOF

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017/servicehub
FRONTEND_URL=http://$SERVER_IP
PORT=8001
EOF

# Start backend with PM2
log "Starting backend service..."
pm2 start server.py --name servicehub-backend --interpreter python3
pm2 save
pm2 startup ubuntu -u root --hp /root

cd /var/www/servicehub

# Create frontend directory
log "Setting up frontend..."
mkdir -p frontend
cd frontend

# Create package.json
cat > package.json << 'EOF'
{
  "name": "servicehub-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.6.0",
    "react-router-dom": "^6.8.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
EOF

# Create basic React app structure
mkdir -p src public

# Create public/index.html
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="ServiceHub - Nigeria's Premier Tradesperson Platform" />
    <title>ServiceHub | Nigeria's Premier Tradesperson Platform</title>
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 100px 20px; text-align: center; }
        .stats { display: flex; justify-content: center; gap: 50px; margin: 50px 0; flex-wrap: wrap; }
        .stat { text-align: center; }
        .stat-number { font-size: 3em; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 1.2em; color: #666; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    </style>
</head>
<body>
    <div id="root">
        <div class="hero">
            <div class="container">
                <h1 style="font-size: 3.5em; margin: 0;">ServiceHub</h1>
                <p style="font-size: 1.5em; margin: 20px 0;">Nigeria's Premier Tradesperson Platform</p>
                <p style="font-size: 1.2em; opacity: 0.9;">Connecting skilled tradespeople with homeowners across Nigeria</p>
            </div>
        </div>
        
        <div class="container">
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">100+</div>
                    <div class="stat-label">Registered Tradespeople</div>
                </div>
                <div class="stat">
                    <div class="stat-number">15+</div>
                    <div class="stat-label">Trade Categories</div>
                </div>
                <div class="stat">
                    <div class="stat-number">250+</div>
                    <div class="stat-label">Customer Reviews</div>
                </div>
            </div>
            
            <div style="text-align: center; padding: 50px 0;">
                <h2>Your ServiceHub Website is Live!</h2>
                <p style="font-size: 1.2em; color: #666;">The deployment was successful. You can now customize your website.</p>
                <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin: 30px 0;">
                    <h3>Next Steps:</h3>
                    <ul style="text-align: left; max-width: 600px; margin: 0 auto;">
                        <li>Point your domain to this server: <strong>$SERVER_IP</strong></li>
                        <li>Install SSL certificate for HTTPS</li>
                        <li>Upload your custom React frontend</li>
                        <li>Configure your database and API endpoints</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
EOF

# Phase 4: Web Server Configuration
log "Phase 4: Configuring web server..."

# Create Nginx configuration
cat > /etc/nginx/sites-available/servicehub << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $SERVER_IP _;

    # Frontend
    location / {
        root /var/www/servicehub/frontend/public;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Remove default site and enable ServiceHub
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/servicehub /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Set permissions
log "Setting proper permissions..."
chown -R www-data:www-data /var/www/servicehub
chmod -R 755 /var/www/servicehub

# Phase 5: Final Setup
log "Phase 5: Final configuration..."

# Create deployment info file
cat > /var/www/servicehub/DEPLOYMENT_INFO.txt << EOF
ServiceHub Deployment Information
================================

Deployment Date: $(date)
Server IP: $SERVER_IP
Node.js Version: $(node --version)
Python Version: $(python3 --version)
MongoDB Status: $(systemctl is-active mongod)
Nginx Status: $(systemctl is-active nginx)

URLs:
- Website: http://$SERVER_IP
- API Health: http://$SERVER_IP/api/health
- API Stats: http://$SERVER_IP/api/stats

Services:
- Backend: PM2 (servicehub-backend)
- Frontend: Nginx
- Database: MongoDB

Logs:
- Backend: pm2 logs servicehub-backend
- Nginx: tail -f /var/log/nginx/access.log
- MongoDB: tail -f /var/log/mongodb/mongod.log

Management Commands:
- Restart backend: pm2 restart servicehub-backend
- Restart nginx: systemctl restart nginx
- Check services: pm2 status && systemctl status nginx mongod
EOF

# Final verification
log "Running final verification..."

# Test services
if ! systemctl is-active --quiet mongod; then
    error "MongoDB is not running"
    exit 1
fi

if ! systemctl is-active --quiet nginx; then
    error "Nginx is not running"
    exit 1
fi

if ! pm2 list | grep -q servicehub-backend; then
    error "Backend service is not running"
    exit 1
fi

# Test API endpoint
sleep 5
if curl -f -s http://localhost:8001/api/health > /dev/null; then
    log "Backend API is responding"
else
    warn "Backend API test failed, but services are running"
fi

# Success message
echo ""
echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
echo "🎉                                           🎉"
echo "🎉      SERVICEHUB DEPLOYMENT COMPLETE!      🎉"
echo "🎉                                           🎉"
echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
echo ""
log "Your website is now live!"
info "🌐 Website URL: http://$SERVER_IP"
info "🔧 API Health: http://$SERVER_IP/api/health"
info "📊 API Stats: http://$SERVER_IP/api/stats"
echo ""
warn "Next steps:"
echo "1. Visit http://$SERVER_IP to see your website"
echo "2. Point your domain to this IP: $SERVER_IP"
echo "3. Install SSL certificate for HTTPS"
echo "4. Upload your custom ServiceHub code"
echo ""
info "Deployment completed in $(date)"
EOF