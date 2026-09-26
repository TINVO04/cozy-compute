param(
  [string]$Container = 'cozy-compute-postgres-1',
  [string]$Database = 'cozy',
  [string]$User = 'cozy',
  [string]$OutputDirectory = './backups'
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $OutputDirectory "cozy-$stamp.sql.gz"
docker exec $Container pg_dump --clean --if-exists --no-owner --username=$User --dbname=$Database | gzip > $target
Write-Host "Backup written to $target"
