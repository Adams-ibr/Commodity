#!/bin/bash

# Vercel Deployment Script
# This script automates the process of building and deploying your React app to Vercel.

# Exit immediately if a command exits with a non-zero status
set -e

echo "=========================================="
echo "🚀 Starting Deployment to Vercel"
echo "=========================================="

# 1. Check for Node Modules and Install if missing
if [ ! -d "node_modules" ]; then
    echo "📦 Node modules not found. Installing dependencies..."
    npm install
else
    echo "✅ Dependencies found."
fi

# 2. Run Local Build (to catch errors before uploading)
echo "🛠️  Running local build verification..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful."
else
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

# 3. Git Initialization (Optional but recommended)
# Vercel uses git commit messages for deployment metadata if available
if [ ! -d ".git" ]; then
    echo "📂 Initializing Git repository..."
    git init
    git branch -M main
    
    # Check if git user is configured, if not set dummy values for this repo
    if [ -z "$(git config user.email)" ]; then
        echo "⚠️  Git user not configured. Setting temporary local config..."
        git config user.email "deploy@example.com"
        git config user.name "Deploy Script"
    fi
fi

echo "📸 Saving current state to Git..."
git add .
# Commit changes if there are any
git commit -m "Auto-deploy: $(date)" || echo "👉 No new changes to commit."

# 4. Deploy
echo "------------------------------------------"
echo "🚀 Launching Vercel Deployment..."
echo "------------------------------------------"
echo "ℹ️  NOTE: If this is your first time deploying this project:"
echo "    1. You will be asked to log in (browser will open)."
echo "    2. You will be asked to link the project (Press Enter for defaults)."
echo "------------------------------------------"

# Use npx to run vercel without requiring global installation
# -y accepts the package installation if needed
# --prod creates a production deployment immediately
npx -y vercel --prod

echo "=========================================="
echo "✅ Deployment Process Complete!"
echo "=========================================="
