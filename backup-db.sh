#!/bin/bash
# RouteWise Database Backup Script
# Backs up the PostgreSQL database to ./backups directory

BACKUP_DIR="./backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="routewise-postgres"
DB_NAME="routewise_db"
DB_USER="postgres"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "🔄 Starting database backup..."

# Dump database
docker exec $CONTAINER pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

if [ $? -eq 0 ]; then
    SIZE=$(stat -c%s "$BACKUP_DIR/backup_$DATE.sql.gz" 2>/dev/null || stat -f%z "$BACKUP_DIR/backup_$DATE.sql.gz")
    echo "✅ Backup completed: backup_$DATE.sql.gz ($(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes))"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete 2>/dev/null || true

echo "📦 Backup saved to: $BACKUP_DIR/backup_$DATE.sql.gz"
