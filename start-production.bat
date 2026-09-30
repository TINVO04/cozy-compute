@echo off
setlocal
cd /d "%~dp0"
if not defined COZY_DEPLOY_DIR set "COZY_DEPLOY_DIR=D:/CozyGameProduction"
node infra/deploy/windows-control.mjs start
if errorlevel 1 pause
