@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Visual Asset Hub - Backup wiederherstellen

where node >nul 2>nul
if errorlevel 1 (
  echo [FEHLER] Node.js fehlt.
  pause
  exit /b 1
)

set "BACKUP_PATH=%~1"
if not defined BACKUP_PATH (
  echo Verfuegbare Backups:
  if exist backups\ (
    dir /b /ad backups
  ) else (
    echo Keine Backups gefunden.
    pause
    exit /b 1
  )
  echo.
  set /p "BACKUP_PATH=Backup-Pfad eingeben, z. B. backups\2026-08-04T12-00-00-000Z: "
)

if not defined BACKUP_PATH (
  echo [FEHLER] Kein Backup angegeben.
  pause
  exit /b 1
)

echo [1/2] Backup und SHA-256-Pruefsummen werden kontrolliert...
call npm run restore -- --backup "%BACKUP_PATH%" --dry-run true
if errorlevel 1 (
  echo [FEHLER] Das Backup ist ungueltig und wurde nicht angewendet.
  pause
  exit /b 1
)

echo.
choice /M "Dieses Backup wirklich wiederherstellen? Vorher wird automatisch ein Sicherheitsbackup erstellt"
if errorlevel 2 (
  echo Abgebrochen. Es wurden keine Daten veraendert.
  pause
  exit /b 0
)

echo [2/2] Wiederherstellung laeuft...
call npm run restore -- --backup "%BACKUP_PATH%"
if errorlevel 1 (
  echo [FEHLER] Wiederherstellung fehlgeschlagen oder wurde zurueckgerollt.
  pause
  exit /b 1
)

echo Wiederherstellung erfolgreich. Starte danach START-HERE.cmd.
pause
