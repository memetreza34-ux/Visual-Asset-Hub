@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 oder neuer fehlt. Installiere Node.js und starte diese Datei erneut.
  pause
  exit /b 1
)
echo [1/3] Projekt wird geprueft...
call npm run check
if errorlevel 1 (
  echo Die Pruefung ist fehlgeschlagen. Das Fenster bleibt offen.
  pause
  exit /b 1
)
echo [2/3] Browser wird geoeffnet...
start "" http://127.0.0.1:4173
echo [3/3] Visual Asset Hub laeuft. Dieses Fenster offen lassen.
call npm run serve
pause
