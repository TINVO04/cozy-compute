#!/usr/bin/env bash
set -euo pipefail
container="${1:-cozy-compute-postgres-1}"
database="${2:-cozy}"
user="${3:-cozy}"
output="${4:-./backups}"
mkdir -p "$output"
target="$output/cozy-$(date -u +%Y%m%d-%H%M%S).sql.gz"
docker exec "$container" pg_dump --clean --if-exists --no-owner --username="$user" --dbname="$database" | gzip > "$target"
echo "Backup written to $target"
