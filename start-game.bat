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
call "%~dp0infra\postgres\find-local.bat"

if not defined PG_CTL (
    echo [LOI] Khong tim thay PostgreSQL tren may! Vui long kiem tra lai C:\Program Files\PostgreSQL
    pause
    exit /b 1
)

netstat -ano | findstr ":55432" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    set "PG_INITIALIZED="
    if not exist "%~dp0infra\postgres\local_data\PG_VERSION" (
        echo [POSTGRES] Khoi tao thu muc database cuc bo...
        "!PG_BIN!initdb.exe" -D "%~dp0infra\postgres\local_data" -U cozy -A trust -E UTF8 --no-locale
        if errorlevel 1 exit /b 1
        set "PG_INITIALIZED=1"
    )
    echo [POSTGRES] Dang bat PostgreSQL tren port 55432...
    "!PG_CTL!" -D "%~dp0infra\postgres\local_data" -o "-p 55432 -h 127.0.0.1" -l "%~dp0infra\postgres\postgres.log" start
    if errorlevel 1 exit /b 1
    call :check_postgres
    if errorlevel 1 exit /b 1
    if defined PG_INITIALIZED (
        "!PG_BIN!createdb.exe" -h 127.0.0.1 -p 55432 -U cozy cozy
        if errorlevel 1 exit /b 1
        "!PG_BIN!createdb.exe" -h 127.0.0.1 -p 55432 -U cozy cozy_test
        if errorlevel 1 exit /b 1
    )
)
echo [POSTGRES] PostgreSQL da san sang tren port 55432.

:: 2. Tim va khoi dong Redis (port 56379)
netstat -ano | findstr ":56379 " | findstr "LISTENING" > nul
if %errorlevel% equ 0 goto :redis_ready
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
    echo [LOI] Khong tim thay redis-server.exe. Redis la bat buoc.
    exit /b 1
) else (
    netstat -ano | findstr ":56379" | findstr "LISTENING" > nul
    if !errorlevel! neq 0 (
        echo [REDIS] Dang bat Redis tren port 56379...
        start /b "" "!REDIS_SERVER!" --bind 127.0.0.1 --port 56379 --save "" --appendonly no
        call :check_redis
        if errorlevel 1 exit /b 1
    )
    echo [REDIS] Redis da san sang tren port 56379.
)

:redis_ready
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
        exit /b 1
    )
    goto :loop_pg
)
exit /b 0

:check_redis
set /a rcount=0
:loop_rd
netstat -ano | findstr ":56379" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    ping -n 2 127.0.0.1 > nul
    set /a rcount+=1
    if !rcount! geq 10 (
        echo [LOI] Redis khong the mo port 56379 sau 10s!
        exit /b 1
    )
    goto :loop_rd
)
exit /b 0
