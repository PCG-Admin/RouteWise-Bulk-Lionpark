#!/bin/bash

# Script to apply non-matched plates migration

echo "🔄 Applying migration for non-matched plates..."

# Apply the migration
docker exec -i routewise-db psql -U admin -d routewise_db < routewise-backend/migrations/005_allow_null_order_id.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully"

    # Restart backend to pick up schema changes
    echo "🔄 Restarting backend..."
    docker restart routewise-backend

    echo "✅ Backend restarted"
    echo ""
    echo "🎉 Non-matched plates feature is now active!"
    echo ""
    echo "What happens now:"
    echo "  • ANPR detects plate without scheduled allocation"
    echo "  • System creates allocation with status 'non_matched'"
    echo "  • Record appears on loading board for manual review"
    echo "  • Staff can link to order or handle as needed"
else
    echo "❌ Migration failed"
    exit 1
fi
