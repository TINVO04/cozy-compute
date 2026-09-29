@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
cd /d "%~dp0"

echo ========================================================
echo   [COZY COMPUTE] Dung toan bo he thong Web Game
echo ========================================================

echo [1/3] Dang tat Node.js (Web, API, Realtime, Mock)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8787 " ^| findstr "LISTENING"') do taskkill /f /pid %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":2567 " ^| findstr "LISTENING"') do taskkill /f /pid %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /f /pid %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4010 " ^| findstr "LISTENING"') do taskkill /f /pid %%a > nul 2>&1

echo [2/3] Dang tat Redis (port 56379)...
taskkill /f /im redis-server.exe > nul 2>&1

echo [3/3] Dang tat PostgreSQL cuc bo (port 55432)...
set "PG_CTL="
for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
    if exist "%%D\bin\pg_ctl.exe" set "PG_CTL=%%D\bin\pg_ctl.exe"
)
if not defined PG_CTL (
    where pg_ctl.exe > nul 2>&1
    if !errorlevel! equ 0 set "PG_CTL=pg_ctl.exe"
)

if defined PG_CTL (
    "!PG_CTL!" -D "%~dp0infra\postgres\local_data" stop > nul 2>&1
)
if exist "%~dp0infra\postgres\local_data\postmaster.pid" (
    del /f /q "%~dp0infra\postgres\local_data\postmaster.pid" > nul 2>&1
)

echo ========================================================
echo   [HOAN TAT] He thong da duoc dung va don dep sach se!
echo ========================================================
ping -n 3 127.0.0.1 > nul