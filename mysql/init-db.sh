#!/bin/bash
# MySQL initialization script to grant permissions from Docker network
# This script runs after MySQL is initialized

set -e

echo "Waiting for MySQL to be ready..."
until mysqladmin ping -h localhost --silent; do
  sleep 1
done

echo "Granting permissions to MySQL user from Docker network..."

# Grant permissions from any host (Docker network)
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << EOF
-- Grant all privileges to the user from any host
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
FLUSH PRIVILEGES;
EOF

echo "MySQL permissions granted successfully!"

