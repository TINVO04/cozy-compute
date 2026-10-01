@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
cd /d "%~dp0"

echo ========================================================
echo   [COZY COMPUTE] Dung toan bo he thong Web Game
echo ========================================================

echo [1/3] Dang tat Node.js (Web, API, Realtime, Mock)...
powershell -NoProfile -Command "5173,8787,2567,4010 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }" > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8787 " ^| findstr "LISTENING"') do taskkill /f /pid %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":2567 " ^| findstr "LISTENING"') do taskkill /f /pid %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /f /pid %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4010 " ^| findstr "LISTENING"') do taskkill /f /pid %%a > nul 2>&1

echo [2/3] Dang tat Redis (port 56379)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":56379 " ^| findstr "LISTENING"') do taskkill /f /pid %%a > nul 2>&1

echo [3/3] Dang tat PostgreSQL cuc bo (port 55432)...
if not defined COZY_DEPLOY_DIR set "COZY_DEPLOY_DIR=D:/CozyGameProduction"
if exist "%COZY_DEPLOY_DIR%/runtime.json" (
    echo [POSTGRES] Giu PostgreSQL cho production.
    goto :done
)
call "%~dp0infra\postgres\find-local.bat"
if errorlevel 1 (
    echo [LOI] Khong tim thay PostgreSQL phu hop. Database khong bi thay doi.
    exit /b 1
)
"!PG_CTL!" -D "%~dp0infra\postgres\local_data" stop
if errorlevel 1 exit /b 1

:done
echo ========================================================
echo   [HOAN TAT] Da dung game dev. Production quan ly rieng.
echo ========================================================
ping -n 3 127.0.0.1 > nul
