#!/bin/bash

# ServiceHub Hostinger Deployment Script
echo "🚀 ServiceHub Hostinger Deployment"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_status "Starting ServiceHub deployment on Hostinger VPS..."

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install Python
print_status "Installing Python..."
apt install -y python3 python3-pip python3-venv

# Install MongoDB
print_status "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org

# Install Nginx
print_status "Installing Nginx..."
apt install -y nginx

# Install PM2
print_status "Installing PM2..."
npm install -g pm2

# Start services
print_status "Starting services..."
systemctl start mongod
systemctl enable mongod
systemctl start nginx
systemctl enable nginx

# Create project directory
print_status "Setting up project directory..."
mkdir -p /var/www/servicehub
cd /var/www/servicehub

# Set up backend
print_status "Setting up backend..."
mkdir -p backend
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Create sample requirements.txt if not exists
if [ ! -f requirements.txt ]; then
    cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn==0.24.0
motor==3.3.2
python-dotenv==1.0.0
pydantic==2.5.0
passlib==1.7.4
python-jose==3.3.0
python-multipart==0.0.6
bcrypt==4.1.2
pymongo==4.6.0
aiofiles==23.2.1
EOF
fi

pip install -r requirements.txt

# Create sample .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017/servicehub
FRONTEND_URL=https://yourdomain.com
TERMII_API_KEY=your-termii-key
SENDGRID_API_KEY=your-sendgrid-key
SENDER_EMAIL=no-reply@yourdomain.com
DB_NAME=servicehub
CORS_ORIGINS=https://yourdomain.com
PORT=8001
EOF

print_warning "Please update the .env file with your actual domain and API keys"

# Set up frontend
print_status "Setting up frontend..."
cd /var/www/servicehub
mkdir -p frontend
cd frontend

# Create sample package.json if not exists
if [ ! -f package.json ]; then
    cat > package.json << EOF
{
  "name": "servicehub-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.6.2"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF
fi

# Create sample .env file for frontend
cat > .env << EOF
REACT_APP_BACKEND_URL=https://yourdomain.com/api
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-key
EOF

print_warning "Please update the frontend .env file with your actual domain and API keys"

# Create Nginx configuration
print_status "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/servicehub << EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (React build)
    location / {
        root /var/www/servicehub/frontend/build;
        index index.html index.htm;
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

# Enable site
ln -s /etc/nginx/sites-available/servicehub /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Set permissions
print_status "Setting permissions..."
chown -R www-data:www-data /var/www/servicehub
chmod -R 755 /var/www/servicehub

print_status "Hostinger VPS setup completed!"
print_warning "Next steps:"
echo "1. Upload your ServiceHub code to /var/www/servicehub/"
echo "2. Update .env files with your domain and API keys"
echo "3. Install frontend dependencies: cd /var/www/servicehub/frontend && npm install"
echo "4. Build frontend: npm run build"
echo "5. Start backend with PM2: cd /var/www/servicehub/backend && pm2 start server.py --name servicehub-backend --interpreter python3"
echo "6. Update Nginx config with your actual domain name"
echo "7. Point your domain to this VPS IP address"
echo "8. Install SSL certificate with Certbot"

print_status "Deployment script finished!"