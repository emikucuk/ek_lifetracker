@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\electron\dist\electron.exe" (
  echo [EK Dev Panel] Ilk kurulum, bagimliliklar yukleniyor...
  call npm install
  if errorlevel 1 (
    echo Kurulum basarisiz.
    pause
    exit /b 1
  )
)

start "" "%~dp0node_modules\electron\dist\electron.exe" .
