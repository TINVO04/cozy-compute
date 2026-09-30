@echo off
rem Called by dev scripts. Match installed binaries to the existing data directory.
set "PG_CTL="
set "PG_BIN="
set "COZY_PG_VERSION="
if exist "%~dp0local_data\PG_VERSION" set /p COZY_PG_VERSION=<"%~dp0local_data\PG_VERSION"
if defined COZY_PG_VERSION (
    if exist "%ProgramFiles%\PostgreSQL\%COZY_PG_VERSION%\bin\pg_ctl.exe" set "PG_CTL=%ProgramFiles%\PostgreSQL\%COZY_PG_VERSION%\bin\pg_ctl.exe"
) else (
    for /d %%D in ("%ProgramFiles%\PostgreSQL\*") do if exist "%%D\bin\pg_ctl.exe" set "PG_CTL=%%D\bin\pg_ctl.exe"
)
if not defined PG_CTL for /f "delims=" %%F in ('where pg_ctl.exe 2^>nul') do call :candidate "%%F"
if not defined PG_CTL exit /b 1
for %%F in ("%PG_CTL%") do set "PG_BIN=%%~dpF"
exit /b 0

:candidate
if defined PG_CTL exit /b 0
if not defined COZY_PG_VERSION (
    set "PG_CTL=%~1"
    exit /b 0
)
for /f "tokens=3" %%V in ('"%~1" --version') do for /f "tokens=1 delims=." %%M in ("%%V") do if "%%M"=="%COZY_PG_VERSION%" set "PG_CTL=%~1"
exit /b 0
