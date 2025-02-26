@echo off
setlocal enabledelayedexpansion

REM ==================================================
REM Variabili di configurazione
REM ==================================================
set "REMOTE_USER=simeds"
set "REMOTE_HOST=192.168.5.35"
set "DEST_DIR=/opt/Node.js/SiQuest/frontend/predeploy"
set "ZIP_FILE=project.zip"

REM ==================================================
REM 1) Creazione dell'archivio ZIP (escludendo node_modules e .env)
REM ==================================================
echo [INFO] Creazione archivio zip esclusi node_modules e .env...
tar -a -c -f %ZIP_FILE% --exclude=node_modules --exclude=.env .

if errorlevel 1 (
    echo [ERROR] Errore durante la creazione dello zip.
    pause
    exit /b 1
)
echo [INFO] Archivio creato con successo: %ZIP_FILE%

REM ==================================================
REM 2) Trasferimento dell'archivio sul server remoto
REM ==================================================
echo [INFO] Trasferimento di %ZIP_FILE% a %REMOTE_USER%@%REMOTE_HOST%:%DEST_DIR%...
scp %ZIP_FILE% %REMOTE_USER%@%REMOTE_HOST%:%DEST_DIR%

if errorlevel 1 (
    echo [ERROR] Errore nel trasferimento dell'archivio zip.
    pause
    exit /b 1
)

REM ==================================================
REM 3) Estrazione dell'archivio sul server remoto
REM ==================================================
echo [INFO] Estrazione dell'archivio sul server remoto...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd %DEST_DIR% && unzip -o %ZIP_FILE% && rm -f %ZIP_FILE%"

if errorlevel 1 (
    echo [ERROR] Errore durante l'estrazione dell'archivio sul server remoto.
    pause
    exit /b 1
)

echo [INFO] Deploy completato con successo!
pause
exit /b 0
