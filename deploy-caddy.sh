#!/bin/bash

# ===========================================
# CIN Event Management System - Caddy Deploy Script
# ===========================================
# Deploys Caddyfile to remote server with validation and rollback

# Configuration
REMOTE_HOST="root@167.86.123.3"
REMOTE_CADDY_PATH="/etc/caddy"
REMOTE_CADDYFILE="${REMOTE_CADDY_PATH}/Caddyfile"
BACKUP_SUFFIX=".backup.$(date +%Y%m%d_%H%M%S)"

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

# Check if Caddyfile exists locally
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_CADDYFILE="${SCRIPT_DIR}/Caddyfile"

if [ ! -f "$LOCAL_CADDYFILE" ]; then
    print_error "Caddyfile not found at $LOCAL_CADDYFILE"
    exit 1
fi

print_info "Starting Caddyfile deployment to $REMOTE_HOST"
print_info "Local Caddyfile: $LOCAL_CADDYFILE"
print_info "Remote Caddyfile: $REMOTE_CADDYFILE"

# Step 1: Check SSH connection
print_step "Step 1/6: Checking SSH connection..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$REMOTE_HOST" exit 2>/dev/null; then
    print_warn "SSH key authentication might not be set up. You may be prompted for a password."
fi

# Step 2: Create backup of existing Caddyfile
print_step "Step 2/6: Creating backup of existing Caddyfile..."
BACKUP_CREATED=false
ssh "$REMOTE_HOST" << ENDSSH
    # Create /etc/caddy directory if it doesn't exist
    mkdir -p ${REMOTE_CADDY_PATH}
    
    # Create backup if Caddyfile exists
    if [ -f ${REMOTE_CADDYFILE} ]; then
        cp ${REMOTE_CADDYFILE} ${REMOTE_CADDYFILE}${BACKUP_SUFFIX}
        echo "[INFO] Backup created: ${REMOTE_CADDYFILE}${BACKUP_SUFFIX}"
        echo "BACKUP_EXISTS=true"
    else
        echo "[WARN] No existing Caddyfile found to backup"
        echo "BACKUP_EXISTS=false"
    fi
ENDSSH

BACKUP_EXISTS=$(ssh "$REMOTE_HOST" "[ -f ${REMOTE_CADDYFILE}${BACKUP_SUFFIX} ] && echo 'true' || echo 'false'")
if [ "$BACKUP_EXISTS" = "true" ]; then
    BACKUP_CREATED=true
    print_info "Backup created successfully"
else
    print_warn "No existing Caddyfile to backup (first deployment)"
fi

# Step 3: Upload new Caddyfile
print_step "Step 3/6: Uploading new Caddyfile..."
if scp "$LOCAL_CADDYFILE" "${REMOTE_HOST}:${REMOTE_CADDYFILE}.new" 2>/dev/null; then
    print_info "Caddyfile uploaded successfully"
else
    print_error "Failed to upload Caddyfile"
    exit 1
fi

# Step 4: Validate the new Caddyfile
print_step "Step 4/6: Validating new Caddyfile configuration..."
VALIDATION_RESULT=$(ssh "$REMOTE_HOST" << ENDSSH
    # Check if Caddy is installed on host
    if command -v caddy &> /dev/null; then
        VALIDATION_OUTPUT=\$(caddy validate --config ${REMOTE_CADDYFILE}.new 2>&1)
        VALIDATION_EXIT=\$?
    # Try Docker container
    elif docker ps --format '{{.Names}}' | grep -q cin-caddy-prod; then
        # Copy file into container for validation
        docker cp ${REMOTE_CADDYFILE}.new cin-caddy-prod:/tmp/Caddyfile.new 2>/dev/null || true
        VALIDATION_OUTPUT=\$(docker exec cin-caddy-prod caddy validate --config /tmp/Caddyfile.new 2>&1)
        VALIDATION_EXIT=\$?
        # Clean up temp file
        docker exec cin-caddy-prod rm -f /tmp/Caddyfile.new 2>/dev/null || true
    else
        echo "ERROR: Caddy not found (neither installed nor in Docker)"
        VALIDATION_EXIT=1
        VALIDATION_OUTPUT="Caddy not found"
    fi
    
    echo "EXIT_CODE:\$VALIDATION_EXIT"
    echo "OUTPUT:\$VALIDATION_OUTPUT"
ENDSSH
)

# Extract exit code and output
EXIT_CODE=$(echo "$VALIDATION_RESULT" | grep "EXIT_CODE:" | cut -d: -f2)
VALIDATION_OUTPUT=$(echo "$VALIDATION_RESULT" | grep "OUTPUT:" | cut -d: -f2-)

if [ "$EXIT_CODE" = "0" ]; then
    print_info "Caddyfile validation successful!"
    echo "$VALIDATION_OUTPUT"
else
    print_error "Caddyfile validation FAILED!"
    echo "$VALIDATION_OUTPUT"
    
    # Step 5: Rollback on validation failure
    print_step "Step 5/6: Rolling back to backup..."
    ssh "$REMOTE_HOST" << ENDSSH
        # Remove the invalid new file
        rm -f ${REMOTE_CADDYFILE}.new
        
        # Restore backup if it exists
        if [ -f ${REMOTE_CADDYFILE}${BACKUP_SUFFIX} ]; then
            cp ${REMOTE_CADDYFILE}${BACKUP_SUFFIX} ${REMOTE_CADDYFILE}
            echo "[INFO] Backup restored: ${REMOTE_CADDYFILE}"
        else
            # If no backup, remove Caddyfile (it was invalid)
            rm -f ${REMOTE_CADDYFILE}
            echo "[WARN] No backup to restore, removed invalid Caddyfile"
        fi
ENDSSH
    
    print_error "Deployment aborted. Original configuration restored."
    exit 1
fi

# Step 5: Replace old Caddyfile with new one
print_step "Step 5/6: Replacing Caddyfile..."
ssh "$REMOTE_HOST" << ENDSSH
    # Move new file to replace old one
    mv ${REMOTE_CADDYFILE}.new ${REMOTE_CADDYFILE}
    chmod 644 ${REMOTE_CADDYFILE}
    echo "[INFO] Caddyfile replaced successfully"
ENDSSH

# Step 6: Reload Caddy service
print_step "Step 6/6: Reloading Caddy service..."
RELOAD_RESULT=$(ssh "$REMOTE_HOST" << 'ENDSSH'
    # Try to reload Caddy
    if systemctl is-active --quiet caddy 2>/dev/null; then
        # Reload systemd service (preferred method)
        RELOAD_OUTPUT=$(systemctl reload caddy 2>&1)
        RELOAD_EXIT=$?
        
        # If reload fails, try restart
        if [ $RELOAD_EXIT -ne 0 ]; then
            echo "[WARN] Reload failed, attempting service restart..."
            systemctl restart caddy
            sleep 2
            RELOAD_EXIT=$?
        fi
    elif docker ps --format '{{.Names}}' | grep -q cin-caddy-prod; then
        # Reload Caddy in Docker container
        RELOAD_OUTPUT=$(docker exec cin-caddy-prod caddy reload --config /etc/caddy/Caddyfile 2>&1)
        RELOAD_EXIT=$?
        
        # If reload fails, try restarting the container
        if [ $RELOAD_EXIT -ne 0 ]; then
            echo "[WARN] Reload failed, attempting container restart..."
            docker restart cin-caddy-prod
            sleep 3
            RELOAD_EXIT=$?
        fi
    elif command -v caddy &> /dev/null; then
        # Try direct caddy reload command
        RELOAD_OUTPUT=$(caddy reload --config ${REMOTE_CADDYFILE} 2>&1)
        RELOAD_EXIT=$?
    else
        echo "[ERROR] Caddy service not found (neither systemd, Docker, nor direct command)"
        RELOAD_EXIT=1
        RELOAD_OUTPUT="Caddy service not found"
    fi
    
    echo "EXIT_CODE:$RELOAD_EXIT"
    echo "OUTPUT:$RELOAD_OUTPUT"
ENDSSH
)

RELOAD_EXIT_CODE=$(echo "$RELOAD_RESULT" | grep "EXIT_CODE:" | cut -d: -f2)
RELOAD_OUTPUT=$(echo "$RELOAD_RESULT" | grep "OUTPUT:" | cut -d: -f2-)

if [ "$RELOAD_EXIT_CODE" = "0" ]; then
    print_info "Caddy service reloaded successfully!"
    echo "$RELOAD_OUTPUT"
else
    print_error "Failed to reload Caddy service!"
    echo "$RELOAD_OUTPUT"
    print_warn "Configuration is deployed but service may need manual restart"
    
    # Ask if user wants to rollback
    read -p "Rollback to previous configuration? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Rolling back..."
        ssh "$REMOTE_HOST" << ENDSSH
            if [ -f ${REMOTE_CADDYFILE}${BACKUP_SUFFIX} ]; then
                cp ${REMOTE_CADDYFILE}${BACKUP_SUFFIX} ${REMOTE_CADDYFILE}
                echo "[INFO] Backup restored"
            fi
ENDSSH
        print_info "Configuration rolled back"
        exit 1
    fi
fi

# Cleanup old backups (keep last 5)
print_info "Cleaning up old backups (keeping last 5)..."
ssh "$REMOTE_HOST" << ENDSSH
    cd ${REMOTE_CADDY_PATH}
    # Keep only the 5 most recent backups
    ls -t ${REMOTE_CADDYFILE}.backup.* 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
ENDSSH

print_info "=========================================="
print_info "Caddyfile deployment completed successfully!"
print_info "=========================================="
print_info "Backup location: ${REMOTE_CADDYFILE}${BACKUP_SUFFIX}"
print_info "Caddy service should be running with new configuration"

