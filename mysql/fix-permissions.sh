#!/bin/bash
# Script to fix MySQL permissions for Docker network access
# This script can be run manually or after MySQL starts to fix permissions

set -e

echo "Waiting for MySQL to be ready..."
until mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; do
  echo "MySQL is not ready yet, waiting..."
  sleep 2
done

echo "MySQL is ready. Granting permissions..."

# Create user if not exists and grant permissions from any host
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << EOF
-- Create user if not exists (MySQL 8.0+ syntax)
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Show grants to verify
SHOW GRANTS FOR '${MYSQL_USER}'@'%';
EOF

echo "MySQL permissions granted successfully!"

