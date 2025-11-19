#!/bin/bash
# Setup script to create external data directories for production
# This ensures MySQL data and Django media files persist even if containers are deleted

set -e

echo "Setting up external data directories for production..."

# Create data directory structure
mkdir -p ~/data/cin/mysql
mkdir -p ~/data/cin/media

# Set proper permissions for MySQL data directory
# MySQL container runs as user 999 (mysql user in container)
# We need to ensure the directory is writable by the container
echo "Setting permissions for MySQL data directory..."
chmod 755 ~/data/cin/mysql

# Set proper permissions for media directory
# Django/Gunicorn typically runs as root or the user in the container
echo "Setting permissions for media directory..."
chmod 755 ~/data/cin/media

# Create .gitkeep files to ensure directories are tracked in git (but contents are ignored)
touch ~/data/cin/mysql/.gitkeep
touch ~/data/cin/media/.gitkeep

echo "✅ Data directories created successfully!"
echo ""
echo "Directory structure:"
echo "  ~/data/cin/mysql/    - MySQL database files"
echo "  ~/data/cin/media/    - Django media files (QR codes, etc.)"
echo ""
echo "Note: These directories are stored in the home directory (~/data/cin/)"
echo "      and will persist on the server even if containers are deleted."
echo "      They are separate from the application code directory."

