# MongoDB Atlas Setup Guide

## Step-by-Step MongoDB Atlas Setup

### 1. Sign Up for MongoDB Atlas
- Go to https://cloud.mongodb.com
- Click "Try Free"
- Sign up with email or Google account

### 2. Create Your First Cluster
- Choose "Shared" (FREE)
- Select "M0 Sandbox" (FREE forever)
- Choose closest region (e.g., "AWS / N. Virginia")
- Cluster Name: "ServiceHub"
- Click "Create Cluster"

### 3. Create Database User
- Go to "Database Access" in left sidebar
- Click "Add New Database User"
- Authentication Method: "Password"
- Username: servicehub-user
- Password: Generate secure password (save this!)
- Database User Privileges: "Read and write to any database"
- Click "Add User"

### 4. Setup Network Access
- Go to "Network Access" in left sidebar  
- Click "Add IP Address"
- Choose "Allow Access from Anywhere" (0.0.0.0/0)
- Comment: "Allow all IPs for development"
- Click "Confirm"

### 5. Get Connection String
- Go to "Database" in left sidebar
- Click "Connect" on your cluster
- Choose "Connect your application"
- Driver: "Python" 
- Version: "3.12 or later"
- Copy the connection string (looks like):
  `mongodb+srv://servicehub-user:<password>@servicehub.xxxxx.mongodb.net/?retryWrites=true&w=majority`
- Replace <password> with your actual password

### 6. Create Database
- Click "Browse Collections" 
- Click "Add My Own Data"
- Database name: servicehub
- Collection name: users
- Click "Create"