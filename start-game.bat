@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
cd /d "%~dp0"

echo ========================================================
echo   [COZY COMPUTE] Khoi dong he thong Web Game
echo ========================================================

:: 0. Kiem tra file .env
if not exist "%~dp0.env" (
    echo [ENV] Tao file .env tu .env.example...
    copy /y "%~dp0.env.example" "%~dp0.env" > nul
)

:: 1. Tim va khoi dong PostgreSQL cuc bo (port 55432)
set "PG_CTL="
for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
    if exist "%%D\bin\pg_ctl.exe" set "PG_CTL=%%D\bin\pg_ctl.exe"
)
if not defined PG_CTL (
    where pg_ctl.exe > nul 2>&1
    if !errorlevel! equ 0 set "PG_CTL=pg_ctl.exe"
)

if not defined PG_CTL (
    echo [LOI] Khong tim thay PostgreSQL tren may! Vui long kiem tra lai C:\Program Files\PostgreSQL
    pause
    exit /b 1
)

netstat -ano | findstr ":55432" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    if not exist "%~dp0infra\postgres\local_data" (
        echo [POSTGRES] Khoi tao thu muc database cuc bo...
        for %%F in ("!PG_CTL!") do set "PG_BIN=%%~dpF"
        "!PG_BIN!initdb.exe" -D "%~dp0infra\postgres\local_data" -U cozy -A trust -E UTF8 --no-locale > nul 2>&1
    )
    if exist "%~dp0infra\postgres\local_data\postmaster.pid" (
        echo [POSTGRES] Don dep postmaster.pid cu...
        del /f /q "%~dp0infra\postgres\local_data\postmaster.pid" > nul 2>&1
    )
    echo [POSTGRES] Dang bat PostgreSQL tren port 55432...
    "!PG_CTL!" -D "%~dp0infra\postgres\local_data" -o "-p 55432" -l "%~dp0infra\postgres\postgres.log" start
    call :check_postgres
    for %%F in ("!PG_CTL!") do set "PG_BIN=%%~dpF"
    "!PG_BIN!createdb.exe" -h 127.0.0.1 -p 55432 -U cozy cozy > nul 2>&1
    "!PG_BIN!createdb.exe" -h 127.0.0.1 -p 55432 -U cozy cozy_test > nul 2>&1
)
echo [POSTGRES] PostgreSQL da san sang tren port 55432.

:: 2. Tim va khoi dong Redis (port 56379)
set "REDIS_SERVER="
if exist "%~dp0infra\redis\redis-server.exe" (
    set "REDIS_SERVER=%~dp0infra\redis\redis-server.exe"
) else (
    where redis-server.exe > nul 2>&1
    if !errorlevel! equ 0 set "REDIS_SERVER=redis-server.exe"
)

if not defined REDIS_SERVER (
    for /r "%LOCALAPPDATA%\Microsoft\WinGet\Packages" %%F in (redis-server.exe) do (
        if exist "%%F" set "REDIS_SERVER=%%F"
    )
)

if not defined REDIS_SERVER (
    echo [CANH BAO] Khong tim thay redis-server.exe. Tiep tuc...
) else (
    netstat -ano | findstr ":56379" | findstr "LISTENING" > nul
    if !errorlevel! neq 0 (
        echo [REDIS] Dang bat Redis tren port 56379...
        start /b "" "!REDIS_SERVER!" --port 56379 --save "" --appendonly no
        call :check_redis
    )
    echo [REDIS] Redis da san sang tren port 56379.
)

:: 3. Kiem tra va khoi dong Mock Upstream neu can (port 4010)
netstat -ano | findstr ":4010" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    echo [UPSTREAM] Dang bat Mock Upstream tren port 4010...
    start /b "" node "%~dp0infra\mock-upstream\server.mjs"
    ping -n 2 127.0.0.1 > nul
)
echo [UPSTREAM] Mock Upstream da san sang tren port 4010.

:: 4. Chay dev server
echo ========================================================
echo   [GAME] Tat ca service da san sang!
echo   [GAME] Dang bat Web, Realtime va API...
echo.
echo   - Web Game : http://localhost:5173
echo   - API      : http://localhost:8787
echo   - Realtime : ws://localhost:2567
echo.
echo   (Nhan Ctrl+C de dung game, hoac chay stop-game.bat)
echo ========================================================

start /b "" cmd /c "ping -n 4 127.0.0.1 > nul & start http://localhost:5173"
pnpm dev
goto :eof

:check_postgres
set /a pcount=0
:loop_pg
netstat -ano | findstr ":55432" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    ping -n 2 127.0.0.1 > nul
    set /a pcount+=1
    if !pcount! geq 20 (
        echo [LOI] PostgreSQL khong the mo port 55432 sau 20s!
        goto :eof
    )
    goto :loop_pg
)
goto :eof

:check_redis
set /a rcount=0
:loop_rd
netstat -ano | findstr ":56379" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    ping -n 2 127.0.0.1 > nul
    set /a rcount+=1
    if !rcount! geq 10 (
        goto :eof
    )
    goto :loop_rd
)
goto :eof