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
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":56379 " ^| findstr "LISTENING"') do taskkill /f /pid %%a > nul 2>&1

echo [3/3] Dang tat PostgreSQL cuc bo (port 55432)...
if not defined COZY_DEPLOY_DIR set "COZY_DEPLOY_DIR=D:/CozyGameProduction"
if exist "%COZY_DEPLOY_DIR%/runtime.json" (
    echo [POSTGRES] Giu PostgreSQL cho production.
    goto :done
)
"C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "%~dp0infra\postgres\local_data" stop > nul 2>&1
if exist "%~dp0infra\postgres\local_data\postmaster.pid" (
    del /f /q "%~dp0infra\postgres\local_data\postmaster.pid" > nul 2>&1
)

:done
echo ========================================================
echo   [HOAN TAT] Da dung game dev. Production quan ly rieng.
echo ========================================================
ping -n 3 127.0.0.1 > nul
