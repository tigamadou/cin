#!/bin/bash
# Custom MySQL entrypoint that grants permissions after MySQL starts

set -e

# Run the original MySQL entrypoint in the background
/docker-entrypoint.sh mysqld "$@" &
MYSQL_PID=$!

# Wait for MySQL to be ready
echo "Waiting for MySQL to start..."
until mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; do
  sleep 1
done

echo "MySQL is ready. Fixing permissions..."

# Grant permissions to user from any Docker network host
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << EOF
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
EOF

echo "MySQL permissions fixed. Waiting for MySQL process..."
# Wait for the MySQL process
wait $MYSQL_PID

