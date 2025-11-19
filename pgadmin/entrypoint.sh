#!/bin/bash
# Don't use set -e to allow graceful error handling

# Generate pgpassfile from environment variables
# Use /tmp which is writable by all users
PGPASSFILE="/tmp/pgpassfile"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"

# Create pgpassfile with format: hostname:port:database:username:password
if echo "postgres:5432:${POSTGRES_DB}:${POSTGRES_USER}:${POSTGRES_PASSWORD}" > "$PGPASSFILE" 2>/dev/null; then
    chmod 600 "$PGPASSFILE" 2>/dev/null || true
else
    echo "Warning: Could not create pgpassfile at $PGPASSFILE" >&2
fi

# Generate servers.json dynamically
# pgAdmin looks for servers.json in /pgadmin4/ directory
SERVERS_JSON="/pgadmin4/servers.json"
if mkdir -p "$(dirname "$SERVERS_JSON")" 2>/dev/null; then
    cat > "$SERVERS_JSON" <<EOF
{
  "Servers": {
    "1": {
      "Name": "Local PostgreSQL",
      "Group": "Servers",
      "Host": "postgres",
      "Port": 5432,
      "MaintenanceDB": "${POSTGRES_DB}",
      "Username": "${POSTGRES_USER}",
      "SSLMode": "prefer",
      "PassFile": "/tmp/pgpassfile"
    }
  }
}
EOF
else
    echo "Warning: Could not create servers.json directory" >&2
fi

# Execute the original pgAdmin entrypoint
# The pgAdmin image uses /tini as the entrypoint, so we need to call it
if [ -f /tini ]; then
    exec /tini -- /entrypoint.sh "$@"
else
    exec /entrypoint.sh "$@"
fi

