@echo off
setlocal EnableDelayedExpansion

REM ==================================================
REM CONFIGURAZIONE
REM ==================================================
set "REMOTE_USER=simeds"
set "REMOTE_HOST=192.168.5.35"

REM Percorsi locali da cui copiare i file (usa i percorsi Windows)
set "LOCAL_FRONTEND=C:\Users\plups\WorkSpaces\fullstack\SiQuest\siquestfrontend"
set "LOCAL_BACKEND=C:\Users\plups\WorkSpaces\fullstack\SiQuest\siquestbackend"

REM Destinazioni remote (cartelle predeploy)
set "FRONTEND_DEST=/opt/Node.js/SiQuest/frontend/predeploy"
set "BACKEND_DEST=/opt/Node.js/SiQuest/backend/predeploy"

REM File di log (salvato nello stesso percorso dello script)
set "LOG_FILE=deploy_siquest.log"

REM Svuota il file di log all'avvio
type NUL > "%LOG_FILE%"

REM ==================================================
REM FUNZIONE DI LOGGING
REM ==================================================
:log
REM Se il parametro è vuoto, stampa una riga vuota
if "%~1"=="" (
    echo.
    echo. >> "%LOG_FILE%"
) else (
    echo %*
    echo %* >> "%LOG_FILE%"
)
goto :eof

REM ==================================================
REM INIZIO SCRIPT
REM ==================================================

call :log "=========================================================="
call :log "[START] Avvio deploy SiQuest %DATE% %TIME%"
call :log "=========================================================="

REM --------------------------------------------------
REM 0) Verifica e creazione delle directory remote
REM --------------------------------------------------
call :log ""
call :log "[INFO] Verifico ed eventualmente creo le directory remote..."

ssh %REMOTE_USER%@%REMOTE_HOST% "if [ ! -d '%FRONTEND_DEST%' ]; then mkdir -p '%FRONTEND_DEST%'; else echo 'Directory %FRONTEND_DEST% già esistente.'; fi; if [ ! -d '%BACKEND_DEST%' ]; then mkdir -p '%BACKEND_DEST%'; else echo 'Directory %BACKEND_DEST% già esistente.'; fi" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "[ERROR] Fallita la verifica o creazione delle directory remote."
    exit /b 1
)
call :log "[INFO] Directory remote verificate/creatate."

REM --------------------------------------------------
REM 1) Pulizia del contenuto delle directory remote
REM (lasciando intatta la cartella predeploy)
REM --------------------------------------------------
call :log ""
call :log "[INFO] Pulisco il contenuto delle directory remote..."

ssh %REMOTE_USER%@%REMOTE_HOST% "find '%FRONTEND_DEST%' -mindepth 1 -delete && find '%BACKEND_DEST%' -mindepth 1 -delete" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "[ERROR] Fallita la pulizia dei contenuti nelle directory remote."
    exit /b 1
)
call :log "[INFO] Directory remote pulite."

REM --------------------------------------------------
REM 2) Creazione della struttura per 'src' nel frontend remoto
REM --------------------------------------------------
call :log ""
call :log "[INFO] Creo la struttura della directory 'src' sul frontend remoto..."

ssh %REMOTE_USER%@%REMOTE_HOST% "mkdir -p '%FRONTEND_DEST%/src'" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    call :log "[ERROR] Fallita la creazione della directory 'src' sul frontend remoto."
    exit /b 1
)
call :log "[INFO] Struttura 'src' creata sul frontend remoto."

REM --------------------------------------------------
REM 3) Trasferimento file e directory via SCP
REM --------------------------------------------------
call :log ""
call :log "[INFO] Inizio trasferimento via SCP..."

REM --- FRONTEND ---
call :log "[INFO] Copia FRONTEND file..."
scp "%LOCAL_FRONTEND%\Dockerfile" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%" >> "%LOG_FILE%" 2>&1
scp "%LOCAL_FRONTEND%\package.json" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%" >> "%LOG_FILE%" 2>&1
scp "%LOCAL_FRONTEND%\package-lock.json" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%" >> "%LOG_FILE%" 2>&1
scp "%LOCAL_FRONTEND%\postcss.config.js" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%" >> "%LOG_FILE%" 2>&1
scp "%LOCAL_FRONTEND%\serverFrontend.js" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%" >> "%LOG_FILE%" 2>&1
scp "%LOCAL_FRONTEND%\tailwind.config.js" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%" >> "%LOG_FILE%" 2>&1

call :log "[INFO] Copia FRONTEND directory 'public'..."
scp -r "%LOCAL_FRONTEND%\public" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%" >> "%LOG_FILE%" 2>&1

call :log "[INFO] Copia FRONTEND directory 'src'..."
REM La barra finale in "src\" copia il contenuto della directory mantenendo la struttura
scp -r "%LOCAL_FRONTEND%\src\" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%\src\" >> "%LOG_FILE%" 2>&1

REM --- BACKEND ---
call :log "[INFO] Copia BACKEND file..."
scp "%LOCAL_BACKEND%\Dockerfile" "%REMOTE_USER%@%REMOTE_HOST%:%BACKEND_DEST%" >> "%LOG_FILE%" 2>&1
scp "%LOCAL_BACKEND%\package.json" "%REMOTE_USER%@%REMOTE_HOST%:%BACKEND_DEST%" >> "%LOG_FILE%" 2>&1
scp "%LOCAL_BACKEND%\package-lock.json" "%REMOTE_USER%@%REMOTE_HOST%:%BACKEND_DEST%" >> "%LOG_FILE%" 2>&1
call :log "[INFO] Copia BACKEND: Dockerfile e file .json copiati."

call :log "[INFO] Copia BACKEND directory 'src'..."
scp -r "%LOCAL_BACKEND%\src" "%REMOTE_USER%@%REMOTE_HOST%:%BACKEND_DEST%" >> "%LOG_FILE%" 2>&1

call :log "[INFO] Trasferimento completato!"

call :log "=========================================================="
call :log "[END] Deploy completato %DATE% %TIME%"
call :log "=========================================================="

pause
