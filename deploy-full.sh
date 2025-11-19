#!/bin/bash

# ===========================================
# CIN Event Management System - Full Deploy Script
# ===========================================
# This script performs a complete deployment including:
# - File upload
# - Docker service restart
# - Database migrations
# - Static files collection

set -e  # Exit on error

# Configuration
REMOTE_HOST="root@167.86.123.3"
REMOTE_PATH="/root/cin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if rsync is available
if ! command -v rsync &> /dev/null; then
    print_error "rsync is not installed. Please install it first."
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_info "Starting FULL deployment to $REMOTE_HOST:$REMOTE_PATH"

# Step 1: Clean remote directory and prepare environment
print_step "Step 1/5: Cleaning remote directory and preparing environment..."
ssh "$REMOTE_HOST" << 'ENDSSH'
    cd /root/cin
    
    # Backup .env.prod if it exists
    if [ -f .env.prod ]; then
        echo "[INFO] Preserving .env.prod file"
        cp .env.prod .env.prod.backup
    fi
    
    # Create data directories in home directory if they don't exist
    # Data is stored in ~/data/cin/ to separate it from application code
    mkdir -p ~/data/cin/mysql
    mkdir -p ~/data/cin/media
    chmod 755 ~/data/cin/mysql ~/data/cin/media 2>/dev/null || true
    echo "[INFO] Data directories ensured (~/data/cin/mysql and ~/data/cin/media)"
    
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

# Step 2: Upload files
print_step "Step 2/5: Uploading files..."
./deploy.sh

# Step 3: Verify .env file exists
print_step "Step 3/5: Verifying environment configuration..."
if ssh "$REMOTE_HOST" "[ -f $REMOTE_PATH/.env ]"; then
    print_info ".env file found on remote server"
else
    print_warn ".env file not found. Deployment may fail without it."
    if ssh "$REMOTE_HOST" "[ -f $REMOTE_PATH/.env.prod ]"; then
        print_info "Creating .env from .env.prod..."
        ssh "$REMOTE_HOST" "cd $REMOTE_PATH && cp .env.prod .env"
    else
        print_error ".env.prod also not found. Please upload it manually."
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Deployment cancelled."
            exit 1
        fi
    fi
fi

# Step 4: Rename docker-compose file and restart Docker services
print_step "Step 4/5: Setting up docker-compose.yml and restarting Docker services..."
ssh "$REMOTE_HOST" << 'ENDSSH'
    cd /root/cin
    
    # Rename docker-compose.prod.yml to docker-compose.yml for simpler usage
    if [ -f docker-compose.prod.yml ]; then
        echo "[INFO] Renaming docker-compose.prod.yml to docker-compose.yml"
        mv docker-compose.prod.yml docker-compose.yml
    elif [ ! -f docker-compose.yml ]; then
        echo "[ERROR] docker-compose.prod.yml not found and docker-compose.yml doesn't exist!"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null || ! command -v docker compose &> /dev/null; then
        echo "[ERROR] Docker or Docker Compose not found!"
        exit 1
    fi
    
    echo "[INFO] Stopping existing services..."
    docker compose down || true
    
    echo "[INFO] Building and starting services..."
    docker compose up -d --build
    
    echo "[INFO] Waiting for MySQL to be ready..."
    # Wait for MySQL healthcheck to pass
    timeout=60
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if docker compose exec -T cin-db mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; then
            echo "[INFO] MySQL is ready!"
            break
        fi
        echo "[INFO] Waiting for MySQL... ($elapsed/$timeout seconds)"
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo "[ERROR] MySQL did not become ready in time"
        exit 1
    fi
    
    echo "[INFO] Granting MySQL permissions for Docker network access..."
    # Source environment variables from .env file and grant permissions
    if [ -f .env ]; then
        set -a
        source .env
        set +a
        
        # Grant permissions to user from any Docker network host
        docker compose exec -T cin-db mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << SQL || {
            echo "[WARN] Failed to grant MySQL permissions (may already be granted)"
        }
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
        echo "[INFO] MySQL permissions granted for Docker network access"
    else
        echo "[WARN] .env file not found, skipping MySQL permission grant"
    fi
ENDSSH

if [ $? -eq 0 ]; then
    print_info "Docker services restarted successfully!"
else
    print_error "Failed to restart Docker services!"
    exit 1
fi

# Step 5: Run migrations and collect static files
print_step "Step 5/5: Running database migrations and collecting static files..."
ssh "$REMOTE_HOST" << 'ENDSSH'
    cd /root/cin
    
    echo "[INFO] Running database migrations..."
    docker compose exec -T cin-api python manage.py migrate --noinput || {
        echo "[ERROR] Migrations failed!"
        exit 1
    }
    
    echo "[INFO] Collecting static files..."
    docker compose exec -T cin-api python manage.py collectstatic --noinput || {
        echo "[WARN] Static files collection failed (may be normal if no changes)"
    }
    
    echo "[INFO] Checking service status..."
    docker compose ps
ENDSSH

if [ $? -eq 0 ]; then
    print_info "Migrations and static files collection completed!"
else
    print_error "Post-deployment steps failed!"
    exit 1
fi

print_info "=========================================="
print_info "Full deployment completed successfully!"
print_info "=========================================="
print_info "Services should be running at:"
print_info "  - Frontend: https://cin2025.bj"
print_info "  - API: https://cin2025.bj/api"
print_info "  - phpMyAdmin: https://panel.cin2025.bj:5050 (if exposed)"

