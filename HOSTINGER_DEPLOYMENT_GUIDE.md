# 🚀 ServiceHub - Complete Hostinger Deployment Guide

## Overview
This guide will help you deploy your ServiceHub platform on Hostinger VPS so Nigerian users can access it through your custom domain.

## 📋 Prerequisites

### 1. Hostinger Account & VPS
- **Recommended Plan**: VPS Plan 2 or higher ($7.99/month)
  - 2 CPU cores, 4GB RAM, 80GB storage
  - Perfect for 1,000-10,000 users/month
- **Operating System**: Ubuntu 22.04 LTS (recommended)

### 2. Domain Name
- Purchase a domain (e.g., myservicehub.co or yourservicehub.com)
- Point domain to your VPS IP address

### 3. Required Files
- `auto-deploy-fixed.sh` (provided - fixes all known issues)
- Your ServiceHub application code

---

## 🎯 Step-by-Step Deployment

### Step 1: Set Up Hostinger VPS

1. **Login to Hostinger** → Go to VPS section
2. **Create new VPS** with Ubuntu 22.04 LTS
3. **Note down**:
   - Server IP address
   - Root password
   - SSH access details

### Step 2: Connect to Your VPS

```bash
# Connect via SSH (replace with your server IP)
ssh root@your-server-ip
```

### Step 3: Deploy ServiceHub (Automated Method)

1. **Upload the fixed deployment script**:
```bash
# Create the deployment script
nano auto-deploy-fixed.sh
# Copy the entire content from auto-deploy-fixed.sh file
# Press Ctrl+O to save, Ctrl+X to exit

# Make it executable
chmod +x auto-deploy-fixed.sh
```

2. **Run the deployment**:
```bash
sudo ./auto-deploy-fixed.sh
```

This script will automatically:
- ✅ Install Node.js, Python, MongoDB (Ubuntu 25.04 compatible)
- ✅ Install Nginx web server
- ✅ Set up PM2 process manager
- ✅ Deploy your ServiceHub application
- ✅ Configure SSL-ready environment

### Step 4: Upload Your Application Code

After the script completes, upload your actual ServiceHub code:

```bash
# Navigate to the application directory
cd /var/www/servicehub

# Remove the demo files
rm -rf backend frontend

# Option A: Upload via SCP (from your local machine)
scp -r backend root@your-server-ip:/var/www/servicehub/
scp -r frontend root@your-server-ip:/var/www/servicehub/

# Option B: Clone from Git (if you have it on GitHub)
git clone https://github.com/yourusername/servicehub.git
cp -r servicehub/* /var/www/servicehub/

# Option C: Use FileZilla or similar FTP client
```

### Step 5: Configure Environment Variables

```bash
# Backend environment
cd /var/www/servicehub/backend
nano .env
```

Add these variables:
```env
MONGO_URL=mongodb://localhost:27017/servicehub
FRONTEND_URL=https://myservicehub.co
JWT_SECRET=your-super-secret-jwt-key-here
PORT=8001
```

```bash
# Frontend environment
cd /var/www/servicehub/frontend
nano .env
```

Add this variable:
```env
REACT_APP_BACKEND_URL=https://myservicehub.co
```

### Step 6: Install Dependencies & Build

```bash
# Install backend dependencies
cd /var/www/servicehub/backend
source venv/bin/activate
pip install -r requirements.txt

# Install frontend dependencies and build
cd /var/www/servicehub/frontend
npm install
npm run build
```

### Step 7: Start Services

```bash
# Start backend with PM2
cd /var/www/servicehub/backend
pm2 start server.py --name servicehub-backend --interpreter python3

# Configure Nginx for your domain
nano /etc/nginx/sites-available/servicehub
```

Update the Nginx config with your domain:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        root /var/www/servicehub/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Restart Nginx
systemctl restart nginx

# Check all services
pm2 status
systemctl status nginx mongod
```

### Step 8: Set Up Your Domain

1. **In Hostinger DNS settings**:
   - Add A record: `@` → Your VPS IP
   - Add A record: `www` → Your VPS IP

2. **Wait for DNS propagation** (5-30 minutes)

### Step 9: Enable SSL (HTTPS)

```bash
# Install SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal setup
certbot renew --dry-run
```

### Step 10: Seed Database (Optional)

```bash
cd /var/www/servicehub/backend
source venv/bin/activate
python quick_seed.py
```

---

## 🔧 Management Commands

### Check Service Status
```bash
pm2 status                    # Backend status
systemctl status nginx        # Web server status
systemctl status mongod       # Database status
```

### View Logs
```bash
pm2 logs servicehub-backend   # Backend logs
tail -f /var/log/nginx/error.log  # Nginx errors
```

### Restart Services
```bash
pm2 restart servicehub-backend
systemctl restart nginx
```

### Update Application
```bash
# Stop services
pm2 stop servicehub-backend

# Update code (upload new files)
# ...

# Rebuild frontend
cd /var/www/servicehub/frontend
npm run build

# Restart services
pm2 start servicehub-backend
```

---

## 🌍 Access Your Website

Once deployed:
- **Website**: https://your-domain.com
- **Admin Dashboard**: https://your-domain.com/admin
- **API Health**: https://your-domain.com/api/health

---

## 💡 Performance Tips for Nigerian Users

1. **Use Cloudflare** (free CDN):
   - Sign up at cloudflare.com
   - Add your domain
   - Enable caching and optimization

2. **Optimize images** for faster loading
3. **Enable Gzip compression** in Nginx
4. **Monitor with tools** like Uptime Robot

---

## 🆘 Troubleshooting

### Common Issues:

**Website not loading?**
```bash
systemctl status nginx
pm2 status
```

**API errors?**
```bash
pm2 logs servicehub-backend
tail -f /var/log/nginx/error.log
```

**Database connection failed?**
```bash
systemctl status mongod
mongo servicehub --eval "db.stats()"
```

---

## 🎉 Success Checklist

- [ ] VPS is running Ubuntu 22.04
- [ ] Domain points to VPS IP
- [ ] All services running (nginx, mongod, pm2)
- [ ] Website loads at your domain
- [ ] API endpoints working
- [ ] SSL certificate installed
- [ ] Database populated with sample data

---

## 📞 Support

If you encounter issues:
1. Check the logs using commands above
2. Verify all services are running
3. Ensure domain DNS has propagated
4. Check firewall settings

Your ServiceHub platform will be live and accessible to users across Nigeria! 🇳🇬