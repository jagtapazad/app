#!/bin/bash

# EC2 Setup Script for AI Agent Orchestrator
# Run this script on a fresh EC2 instance after cloning the repository

set -e  # Exit on error

echo "========================================="
echo "AI Agent Orchestrator - EC2 Setup"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root. Use a regular user with sudo privileges.${NC}"
   exit 1
fi

# Update system
echo -e "${GREEN}[1/10] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install essential tools
echo -e "${GREEN}[2/10] Installing essential tools...${NC}"
sudo apt install -y git curl wget build-essential

# Install Node.js
echo -e "${GREEN}[3/10] Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo -e "${YELLOW}Node.js already installed: $(node --version)${NC}"
fi

# Install Yarn
echo -e "${GREEN}[4/10] Installing Yarn...${NC}"
if ! command -v yarn &> /dev/null; then
    sudo npm install -g yarn
else
    echo -e "${YELLOW}Yarn already installed: $(yarn --version)${NC}"
fi

# Install Python and pip
echo -e "${GREEN}[5/10] Installing Python...${NC}"
sudo apt install -y python3 python3-venv python3-dev python3-pip

# Install PM2
echo -e "${GREEN}[6/10] Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo -e "${YELLOW}PM2 already installed${NC}"
fi

# Setup backend
echo -e "${GREEN}[7/10] Setting up backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating backend .env file template...${NC}"
    cat > .env << 'ENVEOF'
# MongoDB Configuration
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/ai_agent_orch?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=ai_agent_orch

# DeepAgents Configuration
DEEPAGENTS_URL=http://108.130.44.215:8000
DEEPAGENTS_DEFAULT_AGENT=smart_router
DEEPAGENTS_TIMEOUT=600

# CORS Configuration
CORS_ORIGINS=*

# Optional: API Keys
# SCIRA_AI_KEY=your_key_here
# LINKUP_KEY=your_key_here
ENVEOF
    echo -e "${RED}⚠️  Please edit backend/.env with your MongoDB credentials!${NC}"
else
    echo -e "${GREEN}Backend .env file already exists${NC}"
fi

deactivate
cd ..

# Setup frontend
echo -e "${GREEN}[8/10] Setting up frontend...${NC}"
cd frontend-vite

if [ ! -d "node_modules" ]; then
    yarn install
else
    echo -e "${YELLOW}Frontend dependencies already installed${NC}"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating frontend .env file...${NC}"
    cat > .env << 'ENVEOF'
VITE_BACKEND_URL=http://localhost:8001
ENVEOF
    echo -e "${YELLOW}Frontend .env created. Update VITE_BACKEND_URL for production.${NC}"
else
    echo -e "${GREEN}Frontend .env file already exists${NC}"
fi

# Build frontend
echo -e "${GREEN}[9/10] Building frontend for production...${NC}"
yarn build

cd ..

# Create PM2 ecosystem file
echo -e "${GREEN}[10/10] Creating PM2 configuration...${NC}"
APP_DIR=$(pwd)
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '${APP_DIR}/backend',
      script: 'venv/bin/uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '${APP_DIR}/logs/backend-error.log',
      out_file: '${APP_DIR}/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your MongoDB credentials"
echo "2. Edit frontend-vite/.env with your backend URL"
echo "3. Rebuild frontend if you changed .env: cd frontend-vite && yarn build"
echo "4. Start the application: pm2 start ecosystem.config.js"
echo "5. Save PM2 config: pm2 save"
echo "6. Set up PM2 startup: pm2 startup (follow instructions)"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart applications"
echo "  pm2 stop all        - Stop applications"
echo ""

