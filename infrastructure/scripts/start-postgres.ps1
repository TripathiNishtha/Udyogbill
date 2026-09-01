param(
    [string]$DataDir = "e:\udyogbillnew\infrastructure\pgsql_data",
    [string]$PgsqlDir = "e:\udyogbillnew\infrastructure\pgsql",
    [int]$Port = 5432
)

$binDir = Join-Path $PgsqlDir "bin"
$initdb = Join-Path $binDir "initdb.exe"
$pg_ctl = Join-Path $binDir "pg_ctl.exe"
$psql = Join-Path $binDir "psql.exe"
$createdb = Join-Path $binDir "createdb.exe"

if (!(Test-Path $initdb)) {
    Write-Error "PostgreSQL binaries not found at $binDir"
    exit 1
}

# 1. Initialize DB Cluster if not exists
if (!(Test-Path $DataDir)) {
    Write-Host "Initializing PostgreSQL Data Cluster at $DataDir..."
    & $initdb -D $DataDir -U postgres -A trust -E UTF8 --locale=C
}

# 2. Start PostgreSQL server
Write-Host "Starting PostgreSQL Server on port $Port..."
& $pg_ctl -D $DataDir -l "e:\udyogbillnew\infrastructure\pgsql.log" -o "-p $Port" start

Start-Sleep -Seconds 3

# 3. Create database if not exists
Write-Host "Creating udyogbill_db database..."
& $createdb -h localhost -p $Port -U postgres udyogbill_db 2>$null

Write-Host "PostgreSQL 17 is running and ready for UdyogBill SaaS!"
