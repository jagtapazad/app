#!/bin/bash

# Script to fix version issues in requirements.txt
# This makes versions more flexible to avoid "version not found" errors

cd backend

echo "Fixing requirements.txt versions..."

# Fix known problematic versions
sed -i 's/click==8\.3\.0/click>=8.0.0,<9.0.0/' requirements.txt
sed -i 's/dnspython==2\.8\.0/dnspython>=2.0.0,<3.0.0/' requirements.txt

# Remove emergentintegrations if it causes issues (it's not on PyPI)
sed -i '/^emergentintegrations==/d' requirements.txt

echo "✅ Fixed requirements.txt"
echo ""
echo "Now try: pip install -r requirements.txt"



