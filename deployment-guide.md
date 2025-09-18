# 🚀 ServiceHub Deployment Guide

## Current Tech Stack
- **Frontend**: React.js (port 3000)
- **Backend**: FastAPI (port 8001)  
- **Database**: MongoDB (port 27017)
- **Current Domain**: https://servicenow-3.preview.emergentagent.com

## 🌟 RECOMMENDED: Vercel + Railway + MongoDB Atlas

### Step 1: Database Setup (MongoDB Atlas - Free)
1. Go to https://cloud.mongodb.com
2. Create free account
3. Create cluster (free M0 tier)
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/servicehub`
5. Update backend/.env with new MONGO_URL

### Step 2: Backend Deployment (Railway)
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. In backend folder: `railway up`
4. Set environment variables in Railway dashboard:
   - MONGO_URL=mongodb+srv://...
   - TERMII_API_KEY=...
   - SENDGRID_API_KEY=...
5. Get Railway URL (e.g., https://servicehub-backend.railway.app)

### Step 3: Frontend Deployment (Vercel)
1. Install Vercel CLI: `npm install -g vercel`
2. In frontend folder: `vercel`
3. Update frontend/.env:
   - REACT_APP_BACKEND_URL=https://servicehub-backend.railway.app
4. Deploy: `vercel --prod`
5. Get Vercel URL (e.g., https://servicehub.vercel.app)

### Step 4: Custom Domain (Optional)
1. Buy domain from Namecheap, GoDaddy, etc.
2. Add domain in Vercel dashboard
3. Update DNS records

## 🏗️ ALTERNATIVE: Railway Full Stack

### Railway Configuration (railway.toml)
```toml
[build]
builder = "nixpacks"

[[services]]
name = "backend"
source = "backend"
variables = { PORT = "8001" }

[[services]]  
name = "frontend"
source = "frontend"
variables = { PORT = "3000" }

[[services]]
name = "mongodb"
image = "mongo:latest"
variables = { MONGO_INITDB_DATABASE = "servicehub" }
```

## 💻 VPS Deployment (DigitalOcean)

### Server Setup
```bash
# Create droplet with Ubuntu 22.04
# SSH into server
ssh root@your-server-ip

# Install dependencies
apt update && apt upgrade -y
apt install nodejs npm python3 python3-pip nginx mongodb -y

# Install PM2 for process management
npm install -g pm2

# Clone your code
git clone https://github.com/yourusername/servicehub.git
cd servicehub

# Setup backend
cd backend
pip3 install -r requirements.txt
pm2 start "python3 server.py" --name "servicehub-backend"

# Setup frontend
cd ../frontend
npm install
npm run build
```

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/servicehub
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /var/www/servicehub/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🌍 Domain & SSL Setup

### Buy Domain
- Namecheap: ~$10/year
- GoDaddy: ~$12/year  
- Cloudflare: ~$9/year

### SSL Certificate (Free)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## 📊 Cost Comparison

| Option | Monthly Cost | Pros | Cons |
|--------|-------------|------|------|
| Vercel + Railway + Atlas | $0-20 | Easy, scalable | Limited free tier |
| Railway Full Stack | $5-20 | All-in-one | Single platform dependency |
| DigitalOcean VPS | $5+ | Full control | Requires setup |
| AWS | $10-50+ | Enterprise grade | Complex setup |
| Heroku | $7-25 | Simple | Expensive for resources |

## 🚀 Production Checklist

### Security
- [ ] Environment variables secured
- [ ] Database authentication enabled
- [ ] HTTPS/SSL certificate installed
- [ ] CORS properly configured
- [ ] Rate limiting implemented

### Performance
- [ ] Frontend build optimized
- [ ] Database indexes created
- [ ] CDN configured for static assets
- [ ] Monitoring setup (e.g., Sentry)

### Domain & DNS
- [ ] Domain purchased
- [ ] DNS records configured
- [ ] SSL certificate installed
- [ ] www redirect setup

## 🔧 Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb+srv://...
TERMII_API_KEY=your_key
SENDGRID_API_KEY=your_key
SENDER_EMAIL=no-reply@yourdomain.com
DB_NAME=servicehub
CORS_ORIGINS=https://yourdomain.com
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://api.yourdomain.com
REACT_APP_GOOGLE_MAPS_API_KEY=your_key
```

## 📞 Support Resources
- Railway: https://railway.app/help
- Vercel: https://vercel.com/support  
- MongoDB Atlas: https://www.mongodb.com/support
- DigitalOcean: https://www.digitalocean.com/support