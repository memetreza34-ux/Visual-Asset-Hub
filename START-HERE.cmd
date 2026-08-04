@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Visual Asset Hub

where node >nul 2>nul
if errorlevel 1 (
  echo [FEHLER] Node.js 22 oder neuer fehlt.
  echo Installiere die aktuelle Node.js-LTS-Version und starte START-HERE.cmd erneut.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set NODE_MAJOR=%%V
if not defined NODE_MAJOR (
  echo [FEHLER] Node.js-Version konnte nicht gelesen werden.
  pause
  exit /b 1
)
if %NODE_MAJOR% LSS 22 (
  echo [FEHLER] Gefunden wurde Node.js %NODE_MAJOR%. Visual Asset Hub benoetigt Node.js 22 oder neuer.
  pause
  exit /b 1
)

echo [1/4] API-Keys, Syntax, Katalog und Tests werden geprueft...
call npm run check
if errorlevel 1 (
  echo.
  echo [FEHLER] Die Projektpruefung ist fehlgeschlagen. Es wurde kein Server gestartet.
  pause
  exit /b 1
)

echo [2/4] Katalogbericht und Testwebsite werden erzeugt...
call npm run report
if errorlevel 1 goto :build_error
call npm run site:build
if errorlevel 1 goto :build_error

echo [3/4] Browser wird nach dem Serverstart automatisch geoeffnet...
start "Visual Asset Hub Browser" cmd /c "timeout /t 2 /nobreak >nul & start \"\" http://127.0.0.1:4173"

echo [4/4] Visual Asset Hub laeuft. Dieses Fenster offen lassen.
echo Zum Beenden STRG+C druecken.
call npm run serve
exit /b %errorlevel%

:build_error
echo.
echo [FEHLER] Bericht oder statische Testversion konnte nicht erzeugt werden.
pause
exit /b 1
