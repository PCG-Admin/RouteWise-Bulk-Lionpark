#!/bin/bash
# RouteWise Database Restore Script
# Restores PostgreSQL database from a backup file

BACKUP_DIR="./backups/postgres"
CONTAINER="routewise-postgres"
DB_NAME="routewise_db"
DB_USER="postgres"

# Check if backup file provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh $BACKUP_DIR/backup_*.sql.gz 2>/dev/null || echo "  No backups found in $BACKUP_DIR"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will REPLACE all data in the database!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo "🔄 Restoring database from backup..."

# Drop and recreate database
docker exec $CONTAINER psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec $CONTAINER psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

# Restore backup
gunzip -c "$BACKUP_FILE" | docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
    echo "🔍 Verifying..."
    docker exec $CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as user_count FROM users;"
else
    echo "❌ Restore failed!"
    exit 1
fi
