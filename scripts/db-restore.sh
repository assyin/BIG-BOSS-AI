#!/bin/bash
# Big Boss Fitness - Database Restore Script
# Usage: ./scripts/db-restore.sh
# This script restores the full database from backup (exercises, recipes, foods, etc.)

set -e

echo "=== Big Boss Fitness - DB Restore ==="

# Check if postgres container is running
if ! docker ps | grep -q bigboss-postgres; then
    echo "ERROR: bigboss-postgres container is not running!"
    echo "Run: docker start bigboss-postgres"
    exit 1
fi

# Wait for postgres to be ready
echo "Waiting for PostgreSQL..."
until docker exec bigboss-postgres pg_isready -U bigboss -d bigbossfitness > /dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready."

# Apply EF migrations first
echo "Applying EF Core migrations..."
cd "$(dirname "$0")/../backend/BigBoss.API"
dotnet ef database update --project ../BigBoss.Infrastructure --startup-project . 2>/dev/null || true
cd "$(dirname "$0")/.."

# Check if data already exists
EXERCISE_COUNT=$(docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -t -c "SELECT count(*) FROM exercises;" 2>/dev/null | tr -d ' ')

if [ "$EXERCISE_COUNT" -gt "0" ] 2>/dev/null; then
    echo "Database already has $EXERCISE_COUNT exercises. Skipping restore."
    echo "To force restore, run: docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -c 'DELETE FROM exercises;'"
    exit 0
fi

# Restore from SQL backup
echo "Restoring database from backup..."
docker exec -i bigboss-postgres psql -U bigboss -d bigbossfitness < db-backup-full.sql

# Verify
echo ""
echo "=== Verification ==="
docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -c "
SELECT 'exercises' as table_name, count(*) FROM exercises
UNION ALL SELECT 'Recipes', count(*) FROM \"Recipes\"
UNION ALL SELECT 'Foods', count(*) FROM \"Foods\"
ORDER BY table_name;"

echo ""
echo "=== Restore complete! ==="
