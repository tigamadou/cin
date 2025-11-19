#!/bin/bash
# MySQL initialization script to grant user access from Docker network
# This script runs automatically on first database initialization
# It creates the user with '%' host to allow connections from any Docker network host

set -e

echo "Creating MySQL user with Docker network access..."

# Wait for MySQL to be ready
until mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; do
  sleep 1
done

# Create user with '%' host (allows connections from any Docker network host)
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << EOF
-- Create user if not exists with '%' host (allows Docker network access)
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Show grants to verify
SHOW GRANTS FOR '${MYSQL_USER}'@'%';
EOF

echo "MySQL user '${MYSQL_USER}'@'%' created successfully with Docker network access!"

