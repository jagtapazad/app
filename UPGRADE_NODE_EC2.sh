#!/bin/bash

# Script to upgrade Node.js to version 20+ on EC2
# Run this on your EC2 instance

set -e

echo "========================================="
echo "Upgrading Node.js to version 20+"
echo "========================================="

# Check current version
CURRENT_VERSION=$(node --version 2>/dev/null || echo "not installed")
echo "Current Node.js version: $CURRENT_VERSION"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID=$ID
else
    echo "Cannot detect OS. Assuming Amazon Linux."
    OS_ID="amzn"
fi

echo "Detected OS: $OS_ID"

# Remove old Node.js
echo ""
echo "Removing old Node.js installation..."
if [[ "$OS_ID" == "amzn" ]]; then
    # Amazon Linux
    sudo yum remove nodejs npm -y 2>/dev/null || true
elif [[ "$OS_ID" == "ubuntu" ]] || [[ "$OS_ID" == "debian" ]]; then
    # Ubuntu/Debian
    sudo apt remove nodejs npm -y 2>/dev/null || true
else
    echo "Unsupported OS. Please install Node.js 20 manually."
    exit 1
fi

# Install Node.js 20
echo ""
echo "Installing Node.js 20..."
if [[ "$OS_ID" == "amzn" ]]; then
    # Amazon Linux - using NodeSource
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
elif [[ "$OS_ID" == "ubuntu" ]] || [[ "$OS_ID" == "debian" ]]; then
    # Ubuntu/Debian
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Verify installation
echo ""
echo "Verifying installation..."
NEW_VERSION=$(node --version)
echo "New Node.js version: $NEW_VERSION"

# Check if version is 20 or higher
MAJOR_VERSION=$(echo $NEW_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$MAJOR_VERSION" -ge 20 ]; then
    echo "✅ Node.js successfully upgraded to version 20+"
else
    echo "❌ Warning: Node.js version is still below 20. Current: $NEW_VERSION"
    exit 1
fi

# Reinstall Yarn
echo ""
echo "Reinstalling Yarn..."
sudo npm install -g yarn

# Verify Yarn
YARN_VERSION=$(yarn --version)
echo "Yarn version: $YARN_VERSION"

echo ""
echo "========================================="
echo "✅ Upgrade complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. cd frontend-vite"
echo "2. rm -f package-lock.json"
echo "3. rm -rf node_modules"
echo "4. yarn install"
echo ""



