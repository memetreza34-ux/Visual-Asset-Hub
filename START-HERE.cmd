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

echo [1/3] Vollstaendige Beta-Bereitschaft wird geprueft...
call npm run beta:verify
if errorlevel 1 (
  echo.
  echo [FEHLER] Die technische Beta-Pruefung ist fehlgeschlagen. Es wurde kein Server gestartet.
  echo Details stehen in reports\beta-readiness.md, falls der Bericht erzeugt werden konnte.
  pause
  exit /b 1
)

echo [2/3] Browser wird nach dem Serverstart automatisch geoeffnet...
start "Visual Asset Hub Browser" cmd /c "timeout /t 2 /nobreak >nul & start \"\" http://127.0.0.1:4173"

echo [3/3] Visual Asset Hub laeuft mit lokaler Verwaltung.
echo Review, Freigabe, Nutzung, Attribution und Backup koennen im Browser gespeichert werden.
echo Zum Beenden STRG+C druecken.
call npm run serve
exit /b %errorlevel%
