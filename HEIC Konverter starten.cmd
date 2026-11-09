@echo off
setlocal
cd /d "%~dp0"

if exist "node_modules\electron\dist\electron.exe" (
  start "" "node_modules\electron\dist\electron.exe" .
) else (
  echo Die App ist noch nicht installiert.
  echo Bitte einmal in diesem Ordner ausfuehren:  npm install
  echo.
  pause
)
