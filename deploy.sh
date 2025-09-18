#!/bin/bash

# ServiceHub Deployment Script
echo "🚀 ServiceHub Deployment Script"
echo "================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Railway CLI
install_railway() {
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
}

# Function to install Vercel CLI
install_vercel() {
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
}

# Function to deploy backend to Railway
deploy_backend() {
    echo "🔧 Deploying Backend to Railway..."
    cd backend
    
    if ! command_exists railway; then
        install_railway
    fi
    
    railway login
    railway up
    echo "✅ Backend deployed to Railway!"
    cd ..
}

# Function to deploy frontend to Vercel
deploy_frontend() {
    echo "🎨 Deploying Frontend to Vercel..."
    cd frontend
    
    if ! command_exists vercel; then
        install_vercel
    fi
    
    vercel
    echo "✅ Frontend deployed to Vercel!"
    cd ..
}

# Function to deploy with Docker
deploy_docker() {
    echo "🐳 Deploying with Docker..."
    
    if ! command_exists docker; then
        echo "❌ Docker not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        echo "❌ Docker Compose not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Build and start services
    docker-compose up --build -d
    
    echo "✅ Services deployed with Docker!"
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend: http://localhost:8001"
    echo "🗄️ MongoDB Admin: http://localhost:8081"
}

# Main menu
echo "Choose deployment option:"
echo "1) Railway + Vercel (Recommended)"
echo "2) Docker (Local/VPS)"
echo "3) Backend only (Railway)"
echo "4) Frontend only (Vercel)"
echo "5) Show deployment guide"

read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        deploy_backend
        deploy_frontend
        ;;
    2)
        deploy_docker
        ;;
    3)
        deploy_backend
        ;;
    4)
        deploy_frontend
        ;;
    5)
        cat deployment-guide.md
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo "🎉 Deployment complete!"