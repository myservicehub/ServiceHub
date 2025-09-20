#!/bin/bash

# MyServiceHub Domain-Specific Configuration
# Domain: myservicehub.co

# Configuration Variables
DOMAIN="myservicehub.co"
WWW_DOMAIN="www.myservicehub.co"
BACKEND_URL="https://${DOMAIN}"
PROJECT_PATH="/var/www/servicehub"

echo "🌐 Configuring ServiceHub for domain: ${DOMAIN}"

# Update backend environment variables
echo "📝 Updating backend .env file..."
cat > ${PROJECT_PATH}/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017/servicehub
FRONTEND_URL=${BACKEND_URL}
JWT_SECRET=$(openssl rand -base64 32)
PORT=8001
CORS_ORIGINS="https://${DOMAIN},https://${WWW_DOMAIN}"
EOF

# Update frontend environment variables
echo "📝 Updating frontend .env file..."
cat > ${PROJECT_PATH}/frontend/.env << EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
EOF

# Create domain-specific Nginx configuration
echo "📝 Creating Nginx configuration for ${DOMAIN}..."
cat > /etc/nginx/sites-available/servicehub << EOF
server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    # Frontend
    location / {
        root ${PROJECT_PATH}/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
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
        
        # CORS headers for API
        add_header Access-Control-Allow-Origin "${BACKEND_URL}" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    }

    # Handle preflight requests
    location /api/ {
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "${BACKEND_URL}";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }

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

# Enable the site
echo "🔄 Enabling Nginx site configuration..."
ln -sf /etc/nginx/sites-available/servicehub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
echo "🧪 Testing Nginx configuration..."
nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    systemctl reload nginx
    echo "🔄 Nginx reloaded successfully"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Restart services
echo "🔄 Restarting backend service..."
pm2 restart servicehub-backend

echo ""
echo "🎉 Domain configuration completed for ${DOMAIN}!"
echo ""
echo "📋 Next steps:"
echo "1. Ensure your domain DNS points to this server IP"
echo "2. Install SSL certificate:"
echo "   certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN}"
echo "3. Test your website: https://${DOMAIN}"
echo ""
echo "🔗 Your ServiceHub URLs:"
echo "   Website: https://${DOMAIN}"
echo "   Admin: https://${DOMAIN}/admin"
echo "   API: https://${DOMAIN}/api/health"