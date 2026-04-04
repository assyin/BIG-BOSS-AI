#!/bin/bash
# Big Boss Fitness - Database Backup Script
# Usage: ./scripts/db-backup.sh

set -e

echo "=== Big Boss Fitness - DB Backup ==="

if ! docker ps | grep -q bigboss-postgres; then
    echo "ERROR: bigboss-postgres container is not running!"
    exit 1
fi

BACKUP_DIR="$(dirname "$0")/.."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# SQL backup (human readable, with INSERT statements)
docker exec bigboss-postgres pg_dump -U bigboss --inserts bigbossfitness > "$BACKUP_DIR/db-backup-full.sql"

# Binary backup (faster restore)
docker exec bigboss-postgres pg_dump -U bigboss --format=custom bigbossfitness > "$BACKUP_DIR/db-backup-full.dump"

# Show stats
echo ""
docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -c "
SELECT 'exercises' as table_name, count(*) FROM exercises
UNION ALL SELECT 'Recipes', count(*) FROM \"Recipes\"
UNION ALL SELECT 'Foods', count(*) FROM \"Foods\"
UNION ALL SELECT 'users', count(*) FROM users
ORDER BY table_name;"

echo ""
echo "Backup saved to:"
echo "  - db-backup-full.sql ($(wc -l < "$BACKUP_DIR/db-backup-full.sql") lines)"
echo "  - db-backup-full.dump ($(du -h "$BACKUP_DIR/db-backup-full.dump" | cut -f1))"
echo "=== Backup complete! ==="
