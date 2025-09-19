# 🚀 ServiceHub Hostinger Deployment - PYDANTIC FIX

## Issue Resolved
- **MongoDB Key Import**: Fixed `apt-key: command not found` error for Ubuntu 25.04
- **Pydantic Compatibility**: Updated pydantic from 2.5.0 to 2.11.7 for Python 3.13 compatibility

## Quick Fix Instructions

### Option 1: Use the Fixed Auto-Deploy Script

1. **Download the fixed script**:
   ```bash
   # On your VPS, download the corrected script
   wget -O auto-deploy-fixed.sh https://your-source/auto-deploy-fixed.sh
   chmod +x auto-deploy-fixed.sh
   
   # Or copy the content from auto-deploy-fixed.sh
   ```

2. **Run the fixed deployment**:
   ```bash
   sudo ./auto-deploy-fixed.sh
   ```

### Option 2: Manual Fix (If deployment already partially ran)

If your deployment already got stuck at the pydantic installation, follow these steps:

1. **Clean up the Python environment**:
   ```bash
   cd /var/www/servicehub/backend
   rm -rf venv
   ```

2. **Create fresh virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   ```

3. **Install the corrected requirements**:
   ```bash
   # Create the corrected requirements.txt
   cat > requirements.txt << 'EOF'
   annotated-types==0.7.0
   anyio==4.10.0
   bcrypt==4.3.0
   fastapi==0.110.1
   motor==3.3.1
   passlib==1.7.4
   pydantic==2.11.7
   pydantic_core==2.33.2
   PyJWT==2.10.1
   pymongo==4.5.0
   python-dotenv==1.1.1
   python-jose==3.5.0
   python-multipart==0.0.20
   uvicorn==0.25.0
   EOF
   
   # Install packages
   pip install -r requirements.txt
   ```

4. **Continue with the deployment**:
   ```bash
   # Start the backend service
   pm2 start server.py --name servicehub-backend --interpreter python3
   pm2 save
   pm2 startup ubuntu -u root --hp /root
   ```

### Option 3: MongoDB Fix Only (If that's the only issue)

If you only need to fix the MongoDB installation:

```bash
# Install prerequisites
apt install -y gnupg curl

# Add MongoDB GPG key (Ubuntu 25.04 compatible method)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
apt update && apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
```

## What Was Fixed

### 1. MongoDB Installation (Lines 48-56 in fixed script)
**Before**:
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
```

**After**:
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
```

### 2. Pydantic Version (Lines 94-155 in fixed script)
**Before**:
```
pydantic==2.5.0
```

**After**:
```
pydantic==2.11.7
pydantic_core==2.33.2
```

### 3. Virtual Environment Cleanup (Lines 157-166)
Added cleanup of existing virtual environment to prevent conflicts:
```bash
if [ -d "venv" ]; then
    rm -rf venv
    log "Cleaned up existing virtual environment"
fi
```

## Verification

After running the fix, verify everything is working:

```bash
# Check services
sudo systemctl status mongod nginx
pm2 status

# Test API
curl http://your-server-ip/api/health
curl http://your-server-ip/api/stats

# Check logs if needed
pm2 logs servicehub-backend
```

## Expected Results

✅ MongoDB installation completes successfully  
✅ Python packages install without pydantic errors  
✅ Backend service starts with PM2  
✅ API endpoints respond correctly  
✅ Website accessible at your server IP  

Your ServiceHub deployment should now complete successfully!