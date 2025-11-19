#!/bin/bash

# ===========================================
# CIN Event Management System - Deploy Script
# ===========================================

set -e  # Exit on error

# Configuration
REMOTE_HOST="root@167.86.123.3"
REMOTE_PATH="/root/cin"
PROJECT_NAME="cin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if rsync is available
if ! command -v rsync &> /dev/null; then
    print_error "rsync is not installed. Please install it first."
    exit 1
fi

# Check if SSH key is set up (optional check)
print_info "Checking SSH connection..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$REMOTE_HOST" exit 2>/dev/null; then
    print_warn "SSH key authentication might not be set up. You may be prompted for a password."
fi

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_info "Starting deployment to $REMOTE_HOST:$REMOTE_PATH"
print_info "Project directory: $SCRIPT_DIR"

# Create remote directory if it doesn't exist
print_info "Creating remote directory if needed..."
ssh "$REMOTE_HOST" "mkdir -p $REMOTE_PATH"

# Check if cleaning is needed (skip if .env already exists, meaning deploy-full.sh already cleaned)
SKIP_CLEAN=false
if ssh "$REMOTE_HOST" "[ -f $REMOTE_PATH/.env ]" 2>/dev/null; then
    SKIP_CLEAN=true
    print_info "Remote directory already prepared (.env exists), skipping clean step"
fi

# Clean remote directory (keep .env.prod) if needed
if [ "$SKIP_CLEAN" = false ]; then
    print_info "Cleaning remote directory (preserving .env.prod)..."
    ssh "$REMOTE_HOST" << 'ENDSSH'
        cd /root/cin
        
        # Backup .env.prod if it exists
        if [ -f .env.prod ]; then
            echo "[INFO] Preserving .env.prod file"
            cp .env.prod .env.prod.backup
        fi
        
        # Remove all files and directories except .env.prod
        find . -mindepth 1 -maxdepth 1 ! -name '.env.prod' ! -name '.env.prod.backup' -exec rm -rf {} +
        
        # Restore .env.prod from backup if it existed
        if [ -f .env.prod.backup ]; then
            mv .env.prod.backup .env.prod
        fi
        
        # Create .env from .env.prod if .env.prod exists
        if [ -f .env.prod ]; then
            echo "[INFO] Creating .env file from .env.prod"
            cp .env.prod .env
            echo "[INFO] .env file created successfully"
        else
            echo "[WARN] .env.prod not found. .env file will not be created."
        fi
ENDSSH
fi

# Sync files using rsync
print_info "Syncing files to remote server..."
rsync -avz --progress \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='.env' \
    --exclude='.env.prod' \
    --exclude='.DS_Store' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='*.pyo' \
    --exclude='*.pyd' \
    --exclude='.Python' \
    --exclude='env/' \
    --exclude='venv/' \
    --exclude='.venv/' \
    --exclude='node_modules/' \
    --exclude='frontend/node_modules/' \
    --exclude='build/' \
    --exclude='dist/' \
    --exclude='.vscode/' \
    --exclude='.idea/' \
    --exclude='*.sqlite3' \
    --exclude='*.log' \
    --exclude='.pytest_cache/' \
    --exclude='.coverage' \
    --exclude='htmlcov/' \
    --exclude='media/qr_codes/' \
    --exclude='staticfiles/' \
    --exclude='pgadmin/' \
    --exclude='*.sh' \
    --delete \
    "$SCRIPT_DIR/" "$REMOTE_HOST:$REMOTE_PATH/"

if [ $? -eq 0 ]; then
    print_info "Files synced successfully!"
else
    print_error "File sync failed!"
    exit 1
fi

# Ensure .env file exists (create from .env.prod if needed)
print_info "Ensuring .env file exists..."
ssh "$REMOTE_HOST" << 'ENDSSH'
    cd /root/cin
    
    # Check if .env.prod exists and create .env from it if .env doesn't exist
    if [ -f .env.prod ] && [ ! -f .env ]; then
        echo "[INFO] Creating .env file from .env.prod"
        cp .env.prod .env
    elif [ ! -f .env.prod ]; then
        echo "[WARN] .env.prod file not found. Please upload it manually for security."
    fi
    
    # Check Docker and Docker Compose
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        echo "[INFO] Docker and Docker Compose are available"
        
        # Optionally restart services (uncomment if needed)
        # echo "[INFO] Restarting Docker services..."
        # docker compose -f docker-compose.prod.yml down
        # docker compose -f docker-compose.prod.yml up -d --build
        
        # Optionally run migrations (uncomment if needed)
        # echo "[INFO] Running database migrations..."
        # docker compose -f docker-compose.prod.yml exec -T cin-api python manage.py migrate --noinput
    else
        echo "[WARN] Docker or Docker Compose not found on remote server"
    fi
ENDSSH

print_info "Deployment completed successfully!"
print_warn "Remember to:"
print_warn "  1. Upload .env.prod file separately (for security)"
print_warn "  2. Run migrations: docker compose -f docker-compose.prod.yml exec cin-api python manage.py migrate"
print_warn "  3. Restart services: docker compose -f docker-compose.prod.yml up -d --build"
print_warn "  4. Collect static files: docker compose -f docker-compose.prod.yml exec cin-api python manage.py collectstatic --noinput"

