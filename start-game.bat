@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

cd /d "%~dp0"

echo ========================================================
echo   [COZY COMPUTE] Khoi dong he thong Web Game
echo ========================================================

:: 1. Kiem tra va khoi dong PostgreSQL cuc bo (port 55432)
netstat -ano | findstr ":55432" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    :: Neu port 55432 chua bat ma ton tai postmaster.pid -> file lock rac do tat dot ngot
    if exist "%~dp0infra\postgres\local_data\postmaster.pid" (
        echo [POSTGRES] Phat hien postmaster.pid cu, dang don dep...
        del /f /q "%~dp0infra\postgres\local_data\postmaster.pid" > nul 2>&1
    )
    echo [POSTGRES] Dang bat PostgreSQL cuc bo tren port 55432...
    "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "%~dp0infra\postgres\local_data" -o "-p 55432" -l "%~dp0infra\postgres\postgres.log" start
    
    :: Doi PostgreSQL mo cong thuc su truoc khi tiep tuc
    set /a pcount=0
    :wait_postgres
    netstat -ano | findstr ":55432" | findstr "LISTENING" > nul
    if %errorlevel% neq 0 (
        timeout /t 1 /nobreak > nul
        set /a pcount+=1
        if !pcount! geq 20 (
            echo [LOI] PostgreSQL khong the mo port 55432 sau 20 giay!
            echo Vui long kiem tra file log tai: "%~dp0infra\postgres\postgres.log"
            goto :error
        )
        goto :wait_postgres
    )
)
echo [POSTGRES] PostgreSQL da san sang tren port 55432.

:: 2. Kiem tra va khoi dong Redis (port 56379)
netstat -ano | findstr ":56379" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    echo [REDIS] Dang bat Redis tren port 56379...
    set "PATH=C:\Users\tinvo\AppData\Local\Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\Redis-8.10.1-Windows-x64-msys2;%PATH%"
    start /b "" "C:\Users\tinvo\AppData\Local\Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\Redis-8.10.1-Windows-x64-msys2\redis-server.exe" --port 56379 --save "" --appendonly no
    
    :: Doi Redis mo cong
    set /a rcount=0
    :wait_redis
    netstat -ano | findstr ":56379" | findstr "LISTENING" > nul
    if %errorlevel% neq 0 (
        timeout /t 1 /nobreak > nul
        set /a rcount+=1
        if !rcount! geq 10 (
            echo [CANH BAO] Redis chua phan hoi sau 10 giay, van tiep tuc...
            goto :skip_wait_redis
        )
        goto :wait_redis
    )
    :skip_wait_redis
)
echo [REDIS] Redis da san sang tren port 56379.

:: 3. Kiem tra va khoi dong Mock Upstream neu can (port 4010)
netstat -ano | findstr ":4010" | findstr "LISTENING" > nul
if %errorlevel% neq 0 (
    echo [UPSTREAM] Dang bat Mock Upstream tren port 4010...
    start /b "" node "%~dp0infra\mock-upstream\server.mjs"
    timeout /t 1 /nobreak > nul
)
echo [UPSTREAM] Mock Upstream da san sang tren port 4010.

:: 4. Chay dev server
echo ========================================================
echo   [GAME] Tat ca service nen da san sang!
echo   [GAME] Dang bat Web, Realtime va API...
echo.
echo   ➜ Web Game : http://localhost:5173
echo   ➜ API      : http://localhost:8787
echo   ➜ Realtime : ws://localhost:2567
echo.
echo   (Nhan Ctrl+C de dung game, hoac chay stop-game.bat)
echo ========================================================
pnpm dev

:error
pause
